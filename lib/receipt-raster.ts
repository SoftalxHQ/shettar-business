/**
 * Render receipt HTML to a 1-bit monochrome raster for ESC/POS image printing.
 *
 * The receipt is mounted in a hidden same-origin iframe (so app-level styles —
 * including Tailwind v4 oklch colors html2canvas can't parse — never leak in),
 * captured with html2canvas at high scale, downscaled to the printer's dot
 * width, then Floyd–Steinberg dithered and bit-packed (8 px/byte, MSB first,
 * 1 = black) the way `GS v 0` expects.
 */

export type ReceiptRaster = {
  widthPx: number
  heightPx: number
  /** Base64 of packed 1-bit rows. */
  data: string
}

/** Printable dots at 203 dpi. */
export const DOTS_58MM = 384
export const DOTS_80MM = 576

export function dotWidthForChars(width: 32 | 48): number {
  return width === 48 ? DOTS_80MM : DOTS_58MM
}

async function waitForAssets(doc: Document): Promise<void> {
  const waits: Promise<unknown>[] = Array.from(doc.images).map((img) =>
    img
      .decode()
      .catch(
        () =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve()
            img.addEventListener("load", () => resolve(), { once: true })
            img.addEventListener("error", () => resolve(), { once: true })
          })
      )
  )
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) {
    waits.push(fonts.ready.catch(() => undefined))
  }
  // Don't let a stuck image block printing forever.
  await Promise.race([
    Promise.all(waits),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ])
  // Two frames so the iframe layout settles before capture.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )
}

export async function renderReceiptToRaster(
  html: string,
  dotWidth: number
): Promise<ReceiptRaster> {
  if (typeof document === "undefined") {
    throw new Error("Receipt rendering requires a browser context")
  }

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  // Keep the frame in the viewport — some engines skip decoding images that
  // live at large negative offsets, which is how the hotel logo went missing.
  iframe.style.left = "0"
  iframe.style.top = "0"
  iframe.style.width = "320px"
  iframe.style.height = "800px"
  iframe.style.opacity = "0"
  iframe.style.zIndex = "-1"
  iframe.style.border = "0"
  iframe.style.pointerEvents = "none"
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error("Could not create receipt render frame")
    doc.open()
    doc.write(html)
    doc.close()

    await waitForAssets(doc)

    const target =
      doc.querySelector<HTMLElement>(".shettar-receipt-sheet") ?? doc.body
    const rect = target.getBoundingClientRect()
    const cssWidth = rect.width || 220
    // Grow the iframe so nothing is clipped during capture.
    iframe.style.height = `${Math.ceil(rect.height) + 40}px`

    const { default: html2canvas } = await import("html2canvas")
    // Capture at 2x the dot width; downscaling antialiases before dithering.
    const scale = (dotWidth * 2) / cssWidth
    const canvas = await html2canvas(target, {
      scale,
      backgroundColor: "#ffffff",
      // Logos are inlined as data URLs; useCORS + crossOrigin on those
      // blanks the image in WebKit.
      useCORS: false,
      allowTaint: false,
      imageTimeout: 8000,
      logging: false,
    })
    if (!canvas.width || !canvas.height) {
      throw new Error("Receipt rendered to an empty image")
    }
    return downscaleAndDither(canvas, dotWidth)
  } finally {
    iframe.remove()
  }
}

function downscaleAndDither(
  source: HTMLCanvasElement,
  dotWidth: number
): ReceiptRaster {
  const width = dotWidth
  const height = Math.max(1, Math.round((source.height / source.width) * width))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0, width, height)

  const { data } = ctx.getImageData(0, 0, width, height)

  // Luminance composited over white (transparent pixels print white).
  const gray = new Float32Array(width * height)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const a = data[p + 3] / 255
    const r = data[p] * a + 255 * (1 - a)
    const g = data[p + 1] * a + 255 * (1 - a)
    const b = data[p + 2] * a + 255 * (1 - a)
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Floyd–Steinberg dither to 1-bit; bit set = black dot.
  const rowBytes = Math.ceil(width / 8)
  const packed = new Uint8Array(rowBytes * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const old = gray[i]
      const black = old < 128
      const err = old - (black ? 0 : 255)
      if (black) {
        packed[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7)
      }
      if (x + 1 < width) gray[i + 1] += (err * 7) / 16
      if (y + 1 < height) {
        if (x > 0) gray[i + width - 1] += (err * 3) / 16
        gray[i + width] += (err * 5) / 16
        if (x + 1 < width) gray[i + width + 1] += (err * 1) / 16
      }
    }
  }

  return { widthPx: width, heightPx: height, data: base64FromBytes(packed) }
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
