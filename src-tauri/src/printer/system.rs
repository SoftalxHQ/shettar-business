//! Discover and talk to OS-installed printers (CUPS on macOS/Linux, spooler on Windows).
//! These are the USB devices that show up under Printers & Scanners but never create a COM port.

use super::PrinterInfo;

/// Virtual / non-receipt queues we never want in the thermal list.
fn is_ignored_system_printer(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    const SKIP: &[&str] = &[
        "fax",
        "pdf",
        "microsoft",
        "onenote",
        "xps",
        "fax",
        "airprint",
        "shannon",
        "add printer",
        "virtual",
        "cups-pdf",
        "preview",
    ];
    SKIP.iter().any(|s| lower.contains(s))
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub fn discover_system_printers() -> Vec<PrinterInfo> {
    use std::collections::HashMap;
    use std::process::Command;

    let mut uris: HashMap<String, String> = HashMap::new();
    if let Ok(output) = Command::new("lpstat").args(["-v"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            // device for POS-80: usb://Xprinter/POS-80?serial=...
            if let Some(rest) = line.strip_prefix("device for ") {
                if let Some((name, uri)) = rest.split_once(':') {
                    uris.insert(name.trim().to_string(), uri.trim().to_string());
                }
            }
        }
    }

    let mut printers = Vec::new();
    let Ok(output) = Command::new("lpstat").args(["-a"]).output() else {
        return printers;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let name = line.split_whitespace().next().unwrap_or("").trim();
        if name.is_empty() || is_ignored_system_printer(name) {
            continue;
        }
        let uri = uris.get(name).map(|s| s.as_str()).unwrap_or("");
        // Prefer USB and raw network sockets; still allow other local queues
        // (some Xprinter installs use dnssd / ipp until configured).
        let is_usb = uri.starts_with("usb://") || uri.starts_with("serial:");
        let is_socket = uri.starts_with("socket://") || uri.starts_with("lpd://");
        let is_ipp_local = uri.starts_with("ipp://") || uri.starts_with("ipps://");
        let label = if is_usb {
            "usb"
        } else if is_socket {
            "network"
        } else {
            "system"
        };

        // Always list accepting CUPS printers that aren't virtual junk.
        // USB ones are tagged printer_type "usb" for the UI.
        let _ = (is_ipp_local, is_socket);
        printers.push(PrinterInfo {
            name: if is_usb {
                format!("{name} (USB)")
            } else if !uri.is_empty() {
                format!("{name}")
            } else {
                name.to_string()
            },
            // Port holds the CUPS queue name for `lp -d`.
            port: name.to_string(),
            printer_type: if is_usb {
                "system".to_string()
            } else if label == "network" && uri.starts_with("socket://") {
                // Keep as system so we still print via CUPS raw (URI may need auth).
                "system".to_string()
            } else {
                "system".to_string()
            },
        });
    }

    printers
}

#[cfg(target_os = "windows")]
pub fn discover_system_printers() -> Vec<PrinterInfo> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let mut printers = Vec::new();
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Printer | Select-Object Name,PortName,DriverName | ConvertTo-Json -Compress",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let Ok(output) = output else {
        return printers;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return printers;
    }

    #[derive(serde::Deserialize)]
    struct WinPrinter {
        Name: Option<String>,
        PortName: Option<String>,
        #[allow(dead_code)]
        DriverName: Option<String>,
    }

    let parsed: Result<Vec<WinPrinter>, _> = serde_json::from_str(trimmed);
    let list = match parsed {
        Ok(v) => v,
        Err(_) => serde_json::from_str::<WinPrinter>(trimmed)
            .map(|p| vec![p])
            .unwrap_or_default(),
    };

    for p in list {
        let name = p.Name.unwrap_or_default();
        if name.is_empty() || is_ignored_system_printer(&name) {
            continue;
        }
        let port_name = p.PortName.unwrap_or_default();
        let is_usb = port_name.to_ascii_uppercase().starts_with("USB")
            || port_name.to_ascii_lowercase().contains("usb");
        printers.push(PrinterInfo {
            name: if is_usb {
                format!("{name} (USB)")
            } else {
                name.clone()
            },
            port: name,
            printer_type: "system".to_string(),
        });
    }

    printers
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub fn discover_system_printers() -> Vec<PrinterInfo> {
    Vec::new()
}

/// Send raw ESC/POS bytes to a CUPS / Windows spooler queue.
#[cfg(any(target_os = "macos", target_os = "linux"))]
pub fn send_system(queue_name: &str, bytes: &[u8]) -> Result<(), String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let mut child = Command::new("lp")
        .args(["-d", queue_name, "-o", "raw", "-o", "job-sheets=none"])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start lp for printer '{queue_name}': {e}"))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "Failed to open lp stdin".to_string())?;
        stdin
            .write_all(bytes)
            .map_err(|e| format!("Failed to write ESC/POS to printer: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("lp failed for printer '{queue_name}': {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "CUPS rejected raw print to '{queue_name}': {}",
            err.trim()
        ));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn send_system(printer_name: &str, bytes: &[u8]) -> Result<(), String> {
    windows_raw_print(printer_name, bytes)
}

#[cfg(target_os = "windows")]
fn windows_raw_print(printer_name: &str, bytes: &[u8]) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
        StartPagePrinter, WritePrinter, DOC_INFO_1W,
    };

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    let name_wide = to_wide(printer_name);
    let mut handle = HANDLE::default();
    unsafe {
        OpenPrinterW(PCWSTR(name_wide.as_ptr()), &mut handle, None)
            .map_err(|e| format!("Could not open printer '{printer_name}': {e}"))?;
    }

    let mut doc_name = to_wide("Shettar Receipt");
    let mut datatype = to_wide("RAW");
    let doc_info = DOC_INFO_1W {
        pDocName: PWSTR(doc_name.as_mut_ptr()),
        pOutputFile: PWSTR::null(),
        pDatatype: PWSTR(datatype.as_mut_ptr()),
    };

    let result = (|| -> Result<(), String> {
        unsafe {
            let job_id = StartDocPrinterW(handle, 1, &doc_info as *const _ as *const _);
            if job_id == 0 {
                return Err(format!(
                    "StartDocPrinter failed for '{printer_name}'. Is the printer online?"
                ));
            }
            if !StartPagePrinter(handle).as_bool() {
                let _ = EndDocPrinter(handle);
                return Err("StartPagePrinter failed".into());
            }
            let mut written = 0u32;
            if !WritePrinter(
                handle,
                bytes.as_ptr() as *const _,
                bytes.len() as u32,
                &mut written,
            )
            .as_bool()
            {
                let _ = EndPagePrinter(handle);
                let _ = EndDocPrinter(handle);
                return Err("WritePrinter failed".into());
            }
            let _ = EndPagePrinter(handle);
            let _ = EndDocPrinter(handle);
        }
        Ok(())
    })();

    unsafe {
        let _ = ClosePrinter(handle);
    }
    result
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub fn send_system(_queue_name: &str, _bytes: &[u8]) -> Result<(), String> {
    Err("System/USB spooler printing is not supported on this platform".into())
}
