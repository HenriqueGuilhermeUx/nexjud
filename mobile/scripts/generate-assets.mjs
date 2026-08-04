import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const outDir = path.resolve("assets")
fs.mkdirSync(outDir, { recursive: true })

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function drawPng(file, size, transparent = false, splash = false) {
  const width = size
  const height = size
  const pixels = Buffer.alloc(width * height * 4)
  const bg = transparent ? [0, 0, 0, 0] : [8, 10, 16, 255]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      pixels[i] = bg[0]; pixels[i + 1] = bg[1]; pixels[i + 2] = bg[2]; pixels[i + 3] = bg[3]
    }
  }

  const cx = width / 2
  const cy = height / 2
  const radius = width * (splash ? 0.18 : 0.36)
  const round = radius * 0.28

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = (Math.floor(y) * width + Math.floor(x)) * 4
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = color[3]
  }

  function insideRoundedRect(x, y, left, top, right, bottom, r) {
    if (x >= left + r && x <= right - r && y >= top && y <= bottom) return true
    if (y >= top + r && y <= bottom - r && x >= left && x <= right) return true
    const px = x < left + r ? left + r : right - r
    const py = y < top + r ? top + r : bottom - r
    return (x - px) ** 2 + (y - py) ** 2 <= r ** 2
  }

  const left = cx - radius, right = cx + radius, top = cy - radius, bottom = cy + radius
  for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
    for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
      if (insideRoundedRect(x, y, left, top, right, bottom, round)) setPixel(x, y, [79, 124, 255, 255])
    }
  }

  const white = [255, 255, 255, 255]
  const line = Math.max(8, Math.floor(size / 42))
  const beamY = cy - radius * 0.18

  function rect(x1, y1, x2, y2, color) {
    for (let y = Math.floor(y1); y <= Math.ceil(y2); y++) for (let x = Math.floor(x1); x <= Math.ceil(x2); x++) setPixel(x, y, color)
  }
  function circle(mx, my, r, color) {
    for (let y = Math.floor(my - r); y <= Math.ceil(my + r); y++) for (let x = Math.floor(mx - r); x <= Math.ceil(mx + r); x++) if ((x - mx) ** 2 + (y - my) ** 2 <= r ** 2) setPixel(x, y, color)
  }
  function lineDraw(x1, y1, x2, y2, w, color) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
    for (let s = 0; s <= steps; s++) {
      const t = steps ? s / steps : 0
      circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, color)
    }
  }

  rect(cx - line / 2, cy - radius * 0.42, cx + line / 2, cy + radius * 0.38, white)
  rect(cx - radius * 0.44, beamY - line / 2, cx + radius * 0.44, beamY + line / 2, white)
  circle(cx, cy - radius * 0.56, radius * 0.08, white)

  for (const side of [-1, 1]) {
    const px = cx + side * radius * 0.33
    const topY = beamY + radius * 0.04
    lineDraw(px, topY, px - side * radius * 0.12, topY + radius * 0.22, line, white)
    lineDraw(px, topY, px + side * radius * 0.12, topY + radius * 0.22, line, white)
    lineDraw(px - radius * 0.15, topY + radius * 0.23, px + radius * 0.15, topY + radius * 0.23, line, white)
  }

  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 4 + 1)
    raw[offset] = 0
    pixels.copy(raw, offset + 1, y * width * 4, (y + 1) * width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
  fs.writeFileSync(path.join(outDir, file), png)
}

drawPng("icon.png", 1024, false, false)
drawPng("adaptive-icon.png", 1024, true, false)
drawPng("splash.png", 1024, false, true)
console.log("NexJud assets generated and validated.")
