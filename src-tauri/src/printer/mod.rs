pub mod commands;
pub mod escpos;
pub mod system;
pub mod transport;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrinterInfo {
    pub name: String,
    pub port: String,
    pub printer_type: String,
}
