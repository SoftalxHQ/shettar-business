# Shettar Business Partner Agreement

| File | Purpose |
|------|---------|
| [business-partner-agreement.html](./business-partner-agreement.html) | Editable blank template (dashes for partner fields; 1.5% default commission) |
| [Shettar-Business-Partner-Agreement-v1.pdf](./Shettar-Business-Partner-Agreement-v1.pdf) | Sendable blank PDF |
| [assets/](./assets/) | Logo used in the PDF |

Also copied to `public/legal/`.

## Branding

- Header: Shettar wordmark (`assets/shettar-logo.png`)
- No watermark / Official stamp
- Closing: Partner signature lines only

## Defaults in the blank template

- Shettar RC No. **9752808**
- Party 1.2 / Schedule A partner fields: **—**
- Platform commission: **1.5%** of eligible withdrawal amounts
- Governing law: Nigerian courts of competent jurisdiction (not Lagos-specific)

## Regenerate PDF

```bash
wkhtmltopdf --enable-local-file-access --print-media-type --page-size A4 \
  docs/legal/business-partner-agreement.html \
  docs/legal/Shettar-Business-Partner-Agreement-v1.pdf
cp docs/legal/Shettar-Business-Partner-Agreement-v1.pdf public/legal/
```
