//! Tauri commands for thermal printer discovery and ESC/POS printing.

use serde::Deserialize;

use super::escpos::{Align, EscPosBuilder, TextSize};
use super::system;
use super::transport;
use super::PrinterInfo;

/// Generic print operations — TypeScript builds the receipt layout as a list of
/// these; Rust just turns them into ESC/POS bytes.
#[derive(Debug, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum PrintOp {
    Text {
        content: String,
        #[serde(default)]
        align: Option<String>,
        #[serde(default)]
        bold: Option<bool>,
        #[serde(default)]
        size: Option<String>,
        /// White-on-black bar (ticket header).
        #[serde(default)]
        reverse: Option<bool>,
        /// Pad to full line width (use with reverse for a solid header band).
        #[serde(default)]
        fill: Option<bool>,
    },
    TwoCol {
        left: String,
        right: String,
        #[serde(default)]
        bold: Option<bool>,
    },
    Divider {
        #[serde(default = "default_divider_char")]
        char: String,
    },
    /// Perforation dots between header and body (HTML ticket punch-holes).
    Perforation,
    Feed {
        #[serde(default = "default_feed_lines")]
        lines: u8,
    },
    QrCode {
        data: String,
    },
    Cut,
    OpenDrawer,
}

fn default_divider_char() -> String {
    "-".to_string()
}

fn default_feed_lines() -> u8 {
    1
}

fn parse_align(value: Option<&str>) -> Align {
    match value.unwrap_or("left") {
        "center" => Align::Center,
        "right" => Align::Right,
        _ => Align::Left,
    }
}

fn parse_size(value: Option<&str>) -> TextSize {
    match value.unwrap_or("normal") {
        "tall" => TextSize::Tall,
        "large" => TextSize::Large,
        _ => TextSize::Normal,
    }
}

pub fn build_ops(width: usize, ops: &[PrintOp]) -> Vec<u8> {
    let mut builder = EscPosBuilder::new(width);

    for op in ops {
        match op {
            PrintOp::Text {
                content,
                align,
                bold,
                size,
                reverse,
                fill,
            } => {
                let reverse_on = reverse.unwrap_or(false);
                let fill_line = fill.unwrap_or(false);
                builder.align(parse_align(align.as_deref()));
                builder.bold(bold.unwrap_or(false));
                builder.size(parse_size(size.as_deref()));
                builder.reverse(reverse_on);
                if fill_line {
                    builder.text_line_filled(content);
                } else {
                    builder.text_line(content);
                }
                builder.reverse(false);
                builder.bold(false);
                builder.size(TextSize::Normal);
                builder.align(Align::Left);
            }
            PrintOp::TwoCol { left, right, bold } => {
                builder.align(Align::Left);
                builder.bold(bold.unwrap_or(false));
                builder.two_col(left, right);
                builder.bold(false);
            }
            PrintOp::Divider { char } => {
                let ch = char.chars().next().unwrap_or('-');
                builder.align(Align::Left);
                builder.divider(ch);
            }
            PrintOp::Perforation => {
                builder.perforation();
            }
            PrintOp::Feed { lines } => {
                builder.feed(*lines);
            }
            PrintOp::QrCode { data } => {
                builder.align(Align::Center);
                builder.qr_code(data);
                builder.align(Align::Left);
            }
            PrintOp::Cut => {
                builder.feed(2);
                builder.partial_cut();
            }
            PrintOp::OpenDrawer => {
                builder.open_cash_drawer();
            }
        }
    }

    builder.build()
}

/// Keep real USB-serial adapters; drop macOS virtual noise (debug console, BT, headphones).
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn include_serial_port(port: &serialport::SerialPortInfo) -> bool {
    let name = port.port_name.to_ascii_lowercase();

    // On macOS, /dev/tty.* blocks on carrier; /dev/cu.* is the correct device.
    if name.contains("/tty.") || name.contains("tty.") {
        return false;
    }

    match &port.port_type {
        serialport::SerialPortType::UsbPort(_) => true,
        serialport::SerialPortType::BluetoothPort => false,
        serialport::SerialPortType::PciPort => false,
        _ => {
            name.contains("usbserial")
                || name.contains("usbmodem")
                || name.contains("wchusbserial")
                || name.contains("silabs")
                || name.contains("slab_usbtocom")
                || name.starts_with("com")
        }
    }
}

#[tauri::command]
pub fn get_printers() -> Vec<PrinterInfo> {
    let mut printers = Vec::new();
    let mut seen_ports = std::collections::HashSet::<String>::new();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        // 1) OS-installed USB / system printers (CUPS / Windows spooler) — what most
        //    hotels use after plugging in an Xprinter without a COM driver.
        for printer in system::discover_system_printers() {
            if seen_ports.insert(printer.port.clone()) {
                printers.push(printer);
            }
        }

        // 2) Real USB-serial / COM adapters (CH340, FTDI, etc.)
        if let Ok(ports) = serialport::available_ports() {
            for port in ports {
                if !include_serial_port(&port) {
                    continue;
                }
                if !seen_ports.insert(port.port_name.clone()) {
                    continue;
                }
                let printer_type = match port.port_type {
                    serialport::SerialPortType::UsbPort(_) => "usb",
                    _ => "serial",
                };
                let name = match &port.port_type {
                    serialport::SerialPortType::UsbPort(info) => {
                        let product = info.product.clone().unwrap_or_else(|| "USB serial printer".into());
                        let manufacturer = info.manufacturer.clone().unwrap_or_default();
                        if manufacturer.is_empty() {
                            format!("{product} ({})", port.port_name)
                        } else {
                            format!("{manufacturer} {product} ({})", port.port_name)
                        }
                    }
                    _ => format!("Serial printer ({})", port.port_name),
                };
                printers.push(PrinterInfo {
                    name,
                    port: port.port_name,
                    printer_type: printer_type.to_string(),
                });
            }
        }
    }

    printers
}

#[tauri::command]
pub fn print_ops(
    port: String,
    printer_type: String,
    width: Option<usize>,
    ops: Vec<PrintOp>,
) -> Result<String, String> {
    let width = width.unwrap_or(32);
    let bytes = build_ops(width, &ops);
    transport::send(&port, &printer_type, &bytes)?;
    Ok("Receipt printed successfully".to_string())
}

/// Print a pre-rendered 1-bit receipt image (pixel-exact ticket design).
/// `data` is base64 of packed rows: 8 px/byte, MSB first, 1 = black.
#[tauri::command]
pub fn print_image(
    port: String,
    printer_type: String,
    width_px: usize,
    height_px: usize,
    data: String,
) -> Result<String, String> {
    use base64::Engine;

    let packed = base64::engine::general_purpose::STANDARD
        .decode(data.as_bytes())
        .map_err(|e| format!("Invalid receipt image data: {e}"))?;

    let row_bytes = width_px.div_ceil(8);
    if width_px == 0 || height_px == 0 || packed.len() < row_bytes * height_px {
        return Err("Receipt image data does not match its dimensions".to_string());
    }

    // Line width is irrelevant for raster output; 48 is just a sane default.
    let mut builder = EscPosBuilder::new(48);
    builder.raster_image(width_px, height_px, &packed);
    builder.feed(2);
    builder.partial_cut();

    transport::send(&port, &printer_type, &builder.build())?;
    Ok("Receipt printed successfully".to_string())
}

/// Download a remote image (S3 signed URL, etc.) as a data URL.
/// Native HTTP is not subject to webview CORS, which is why html2canvas
/// otherwise prints a blank hotel logo.
#[tauri::command]
pub fn fetch_url_data_url(url: String) -> Result<String, String> {
    use base64::Engine;
    use std::time::Duration;

    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty URL".to_string());
    }
    if trimmed.starts_with("data:") {
        return Ok(trimmed.to_string());
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Could not start logo download: {e}"))?;

    let response = client
        .get(trimmed)
        .send()
        .map_err(|e| format!("Could not download logo: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Logo download failed ({})", response.status()));
    }

    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/png")
        .split(';')
        .next()
        .unwrap_or("image/png")
        .trim()
        .to_string();
    let mime = if mime.starts_with("image/") {
        mime
    } else {
        "image/png".to_string()
    };

    let bytes = response
        .bytes()
        .map_err(|e| format!("Could not read logo: {e}"))?;
    if bytes.is_empty() {
        return Err("Logo download was empty".to_string());
    }
    if bytes.len() > 2 * 1024 * 1024 {
        return Err("Logo is too large to print".to_string());
    }

    Ok(format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    ))
}

#[tauri::command]
pub fn test_print(
    port: String,
    printer_type: String,
    width: Option<usize>,
) -> Result<String, String> {
    let width = width.unwrap_or(32);
    let ops = vec![
        PrintOp::Text {
            content: " ".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: Some(true),
            fill: Some(true),
        },
        PrintOp::Text {
            content: "SHETTAR TEST PRINT".to_string(),
            align: Some("center".to_string()),
            bold: Some(true),
            size: Some("tall".to_string()),
            reverse: Some(true),
            fill: Some(true),
        },
        PrintOp::Text {
            content: " ".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: Some(true),
            fill: Some(true),
        },
        PrintOp::Perforation,
        PrintOp::Feed { lines: 1 },
        PrintOp::Text {
            content: "Printer connected!".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: None,
            fill: None,
        },
        PrintOp::Text {
            content: "Ready to print receipts".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: None,
            fill: None,
        },
        PrintOp::Feed { lines: 1 },
        PrintOp::Divider {
            char: "-".to_string(),
        },
        PrintOp::Text {
            content: format!("Width: {width} chars"),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: None,
            fill: None,
        },
        PrintOp::Text {
            content: format!("Port: {port}"),
            align: Some("center".to_string()),
            bold: None,
            size: None,
            reverse: None,
            fill: None,
        },
        PrintOp::Cut,
    ];
    let bytes = build_ops(width, &ops);
    transport::send(&port, &printer_type, &bytes)?;
    Ok("Test print sent".to_string())
}

#[tauri::command]
pub fn open_cash_drawer(port: String, printer_type: String) -> Result<String, String> {
    let ops = vec![PrintOp::OpenDrawer];
    let bytes = build_ops(32, &ops);
    transport::send(&port, &printer_type, &bytes)?;
    Ok("Cash drawer opened".to_string())
}
