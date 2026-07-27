//! Tauri commands for thermal printer discovery and ESC/POS printing.

use serde::{Deserialize, Serialize};

use super::escpos::{Align, EscPosBuilder, TextSize};
use super::transport;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrinterInfo {
    pub name: String,
    pub port: String,
    pub printer_type: String,
}

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
            } => {
                builder.align(parse_align(align.as_deref()));
                builder.bold(bold.unwrap_or(false));
                builder.size(parse_size(size.as_deref()));
                builder.text_line(content);
                // Reset styles so the next op starts clean.
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

#[tauri::command]
pub fn get_printers() -> Vec<PrinterInfo> {
    let mut printers = Vec::new();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if let Ok(ports) = serialport::available_ports() {
            for port in ports {
                let printer_type = match port.port_type {
                    serialport::SerialPortType::UsbPort(_) => "usb",
                    _ => "serial",
                };
                let name = match &port.port_type {
                    serialport::SerialPortType::UsbPort(info) => {
                        let product = info.product.clone().unwrap_or_else(|| "USB printer".into());
                        let manufacturer = info.manufacturer.clone().unwrap_or_default();
                        if manufacturer.is_empty() {
                            format!("{product} ({})", port.port_name)
                        } else {
                            format!("{manufacturer} {product} ({})", port.port_name)
                        }
                    }
                    serialport::SerialPortType::BluetoothPort => {
                        format!("Bluetooth printer ({})", port.port_name)
                    }
                    serialport::SerialPortType::PciPort => {
                        format!("PCI printer ({})", port.port_name)
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

#[tauri::command]
pub fn test_print(
    port: String,
    printer_type: String,
    width: Option<usize>,
) -> Result<String, String> {
    let width = width.unwrap_or(32);
    let ops = vec![
        PrintOp::Text {
            content: "=== SHETTAR TEST PRINT ===".to_string(),
            align: Some("center".to_string()),
            bold: Some(true),
            size: Some("tall".to_string()),
        },
        PrintOp::Feed { lines: 1 },
        PrintOp::Text {
            content: "Printer connected!".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
        },
        PrintOp::Text {
            content: "Ready to print receipts".to_string(),
            align: Some("center".to_string()),
            bold: None,
            size: None,
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
        },
        PrintOp::Text {
            content: format!("Port: {port}"),
            align: Some("center".to_string()),
            bold: None,
            size: None,
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
