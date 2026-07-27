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

    pub fn text_line(&mut self, content: &str) -> &mut Self {
        self.buffer.extend_from_slice(sanitize(content).as_bytes());
        self.buffer.push(LF);
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
