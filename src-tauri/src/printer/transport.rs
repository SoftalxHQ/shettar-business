//! Byte transports for ESC/POS printers: serial/USB-COM ports and raw TCP (JetDirect :9100).

use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(5);

#[cfg(not(any(target_os = "android", target_os = "ios")))]
const SERIAL_BAUD: u32 = 9600;

pub fn send(port: &str, printer_type: &str, bytes: &[u8]) -> Result<(), String> {
    match printer_type {
        "usb" | "serial" => send_serial(port, bytes),
        "network" => send_network(port, bytes),
        "system" => crate::printer::system::send_system(port, bytes),
        other => Err(format!("Unknown printer type: {other}")),
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn send_serial(port: &str, bytes: &[u8]) -> Result<(), String> {
    let mut serial = serialport::new(port, SERIAL_BAUD)
        .timeout(TIMEOUT)
        .open()
        .map_err(|e| format!("Could not open printer port {port}: {e}"))?;

    serial
        .write_all(bytes)
        .map_err(|e| format!("Failed to write to printer: {e}"))?;
    serial
        .flush()
        .map_err(|e| format!("Failed to flush printer: {e}"))?;
    Ok(())
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn send_serial(_port: &str, _bytes: &[u8]) -> Result<(), String> {
    Err("Serial/USB thermal printing is not supported on mobile".to_string())
}

fn send_network(address: &str, bytes: &[u8]) -> Result<(), String> {
    let addr = address
        .to_socket_addrs()
        .map_err(|e| format!("Invalid printer address {address}: {e}"))?
        .next()
        .ok_or_else(|| format!("Could not resolve printer address {address}"))?;

    let mut stream = TcpStream::connect_timeout(&addr, TIMEOUT)
        .map_err(|e| format!("Could not connect to printer at {address}: {e}"))?;
    stream
        .set_write_timeout(Some(TIMEOUT))
        .map_err(|e| format!("Failed to configure printer connection: {e}"))?;
    stream
        .write_all(bytes)
        .map_err(|e| format!("Failed to send to printer: {e}"))?;
    Ok(())
}
