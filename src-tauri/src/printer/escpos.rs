//! Minimal ESC/POS byte builder for thermal receipt printers.

const ESC: u8 = 0x1B;
const GS: u8 = 0x1D;
const LF: u8 = 0x0A;

#[derive(Clone, Copy, PartialEq)]
pub enum Align {
    Left,
    Center,
    Right,
}

#[derive(Clone, Copy, PartialEq)]
pub enum TextSize {
    Normal,
    /// Double height.
    Tall,
    /// Double width + double height.
    Large,
}

/// Thermal printers speak code pages, not UTF-8. Map the characters our
/// receipts actually use onto ASCII so every printer renders them.
fn sanitize(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        match ch {
            '\u{20A6}' => out.push_str("NGN "), // ₦
            '\u{00D7}' => out.push('x'),        // ×
            '\u{21B3}' => out.push_str("->"),   // ↳
            '\u{2013}' | '\u{2014}' => out.push('-'),
            '\u{2018}' | '\u{2019}' => out.push('\''),
            '\u{201C}' | '\u{201D}' => out.push('"'),
            '\u{2026}' => out.push_str("..."),
            '\u{00A0}' => out.push(' '),
            c if c.is_ascii() => out.push(c),
            _ => out.push('?'),
        }
    }
    out
}

pub struct EscPosBuilder {
    buffer: Vec<u8>,
    /// Characters per line: 32 for 58mm paper, 48 for 80mm.
    line_width: usize,
}

impl EscPosBuilder {
    pub fn new(line_width: usize) -> Self {
        let mut builder = EscPosBuilder {
            buffer: Vec::new(),
            line_width: line_width.clamp(20, 64),
        };
        // ESC @ = reset printer state
        builder.buffer.extend_from_slice(&[ESC, b'@']);
        builder
    }

    pub fn align(&mut self, align: Align) -> &mut Self {
        let value = match align {
            Align::Left => 0,
            Align::Center => 1,
            Align::Right => 2,
        };
        self.buffer.extend_from_slice(&[ESC, b'a', value]);
        self
    }

    pub fn bold(&mut self, on: bool) -> &mut Self {
        self.buffer.extend_from_slice(&[ESC, b'E', on as u8]);
        self
    }

    pub fn size(&mut self, size: TextSize) -> &mut Self {
        let value = match size {
            TextSize::Normal => 0x00,
            TextSize::Tall => 0x01,
            TextSize::Large => 0x11,
        };
        self.buffer.extend_from_slice(&[GS, b'!', value]);
        self
    }

    /// White-on-black (matches the indigo ticket header on the HTML receipt).
    pub fn reverse(&mut self, on: bool) -> &mut Self {
        self.buffer.extend_from_slice(&[GS, b'B', on as u8]);
        self
    }

    pub fn text_line(&mut self, content: &str) -> &mut Self {
        self.buffer.extend_from_slice(sanitize(content).as_bytes());
        self.buffer.push(LF);
        self
    }

    /// Centered line padded to full width — needed so reverse mode paints a solid bar.
    pub fn text_line_filled(&mut self, content: &str) -> &mut Self {
        let content = sanitize(content);
        let width = self.line_width;
        let pad = width.saturating_sub(content.chars().count());
        let left = pad / 2;
        let right = pad - left;
        let mut line = String::with_capacity(width);
        line.push_str(&" ".repeat(left));
        line.push_str(&content);
        line.push_str(&" ".repeat(right));
        // Truncate if oversized glyphs somehow exceed width.
        let line: String = line.chars().take(width).collect();
        self.buffer.extend_from_slice(line.as_bytes());
        self.buffer.push(LF);
        self
    }

    /// Ticket-style perforation row between header and body.
    pub fn perforation(&mut self) -> &mut Self {
        let mut line = String::with_capacity(self.line_width);
        while line.chars().count() + 2 <= self.line_width {
            if !line.is_empty() {
                line.push(' ');
            }
            line.push('o');
        }
        self.align(Align::Center);
        self.buffer.extend_from_slice(line.as_bytes());
        self.buffer.push(LF);
        self.align(Align::Left);
        self
    }

    pub fn feed(&mut self, lines: u8) -> &mut Self {
        for _ in 0..lines {
            self.buffer.push(LF);
        }
        self
    }

    pub fn divider(&mut self, ch: char) -> &mut Self {
        let ch = if ch.is_ascii() { ch } else { '-' };
        let line: String = std::iter::repeat(ch).take(self.line_width).collect();
        self.buffer.extend_from_slice(line.as_bytes());
        self.buffer.push(LF);
        self
    }

    /// Label left, value right-aligned. Values too long for one line get
    /// wrapped to their own right-aligned line so nothing is truncated
    /// (receipt values like emails and booking IDs can be long).
    pub fn two_col(&mut self, left: &str, right: &str) -> &mut Self {
        let left = sanitize(left);
        let right = sanitize(right);
        let width = self.line_width;

        if left.len() + right.len() + 1 <= width {
            let pad = width - left.len() - right.len();
            let mut line = String::with_capacity(width);
            line.push_str(&left);
            line.push_str(&" ".repeat(pad));
            line.push_str(&right);
            self.buffer.extend_from_slice(line.as_bytes());
            self.buffer.push(LF);
        } else {
            if !left.is_empty() {
                self.buffer.extend_from_slice(left.as_bytes());
                self.buffer.push(LF);
            }
            for chunk in wrap_text(&right, width) {
                let pad = width.saturating_sub(chunk.len());
                let mut line = String::with_capacity(width);
                line.push_str(&" ".repeat(pad));
                line.push_str(&chunk);
                self.buffer.extend_from_slice(line.as_bytes());
                self.buffer.push(LF);
            }
        }
        self
    }

    /// Print a packed 1-bit raster image (`GS v 0`): 8 px/byte, MSB first,
    /// 1 = black. Sent in bands so cheap printers don't overflow their buffer.
    pub fn raster_image(&mut self, width_px: usize, height_px: usize, packed: &[u8]) -> &mut Self {
        let row_bytes = width_px.div_ceil(8);
        if row_bytes == 0 || row_bytes > u16::MAX as usize || height_px == 0 {
            return self;
        }

        const MAX_BAND_ROWS: usize = 1024;
        let mut row = 0;
        while row < height_px {
            let band_rows = (height_px - row).min(MAX_BAND_ROWS);
            let start = row * row_bytes;
            let end = start + band_rows * row_bytes;
            let Some(band) = packed.get(start..end) else {
                break;
            };
            let xl = (row_bytes % 256) as u8;
            let xh = (row_bytes / 256) as u8;
            let yl = (band_rows % 256) as u8;
            let yh = (band_rows / 256) as u8;
            // GS v 0 m xL xH yL yH data (m = 0: normal density)
            self.buffer
                .extend_from_slice(&[GS, b'v', b'0', 0, xl, xh, yl, yh]);
            self.buffer.extend_from_slice(band);
            row += band_rows;
        }
        self
    }

    pub fn qr_code(&mut self, data: &str) -> &mut Self {
        let data = sanitize(data);
        let store_len = (data.len() + 3) as u16;
        let pl = (store_len % 256) as u8;
        let ph = (store_len / 256) as u8;

        // Model 2
        self.buffer
            .extend_from_slice(&[GS, b'(', b'k', 4, 0, 49, 65, 50, 0]);
        // Module size 4
        self.buffer
            .extend_from_slice(&[GS, b'(', b'k', 3, 0, 49, 67, 4]);
        // Error correction level M
        self.buffer
            .extend_from_slice(&[GS, b'(', b'k', 3, 0, 49, 69, 49]);
        // Store data
        self.buffer
            .extend_from_slice(&[GS, b'(', b'k', pl, ph, 49, 80, 48]);
        self.buffer.extend_from_slice(data.as_bytes());
        // Print
        self.buffer
            .extend_from_slice(&[GS, b'(', b'k', 3, 0, 49, 81, 48]);
        self
    }

    pub fn partial_cut(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&[GS, b'V', b'B', 0]);
        self
    }

    /// Kick pulse on drawer pin 2 (the standard RJ11 cash drawer port).
    pub fn open_cash_drawer(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&[ESC, b'p', 0, 25, 250]);
        self
    }

    pub fn build(self) -> Vec<u8> {
        self.buffer
    }
}

fn wrap_text(text: &str, width: usize) -> Vec<String> {
    if text.len() <= width {
        return vec![text.to_string()];
    }
    text.as_bytes()
        .chunks(width)
        .map(|c| String::from_utf8_lossy(c).into_owned())
        .collect()
}
