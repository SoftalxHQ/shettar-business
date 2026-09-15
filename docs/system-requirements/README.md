# Shettar Business — System Requirements

| File | Purpose |
|------|---------|
| [shettar-business-system-requirements.html](./shettar-business-system-requirements.html) | Editable source |
| [Shettar-Business-System-Requirements.pdf](./Shettar-Business-System-Requirements.pdf) | Sendable PDF |
| [assets/](./assets/) | Logo used in the PDF |

Also copied to `public/docs/`.

## Regenerate PDF

```bash
wkhtmltopdf --enable-local-file-access --print-media-type --page-size A4 \
  docs/system-requirements/shettar-business-system-requirements.html \
  docs/system-requirements/Shettar-Business-System-Requirements.pdf
cp docs/system-requirements/Shettar-Business-System-Requirements.pdf public/docs/
```
