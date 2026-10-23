/** A redaction box in fractions of the image size, so it survives any resizing. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function boxBetween(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  const left = clamp(Math.min(a.x, b.x))
  const top = clamp(Math.min(a.y, b.y))
  return {
    x: left,
    y: top,
    width: clamp(Math.max(a.x, b.x)) - left,
    height: clamp(Math.max(a.y, b.y)) - top,
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That image could not be opened. Try a JPEG or PNG.'))
    image.src = url
  })
}

/**
 * Re-draws a photo of a bill with the redaction boxes burned in. Re-encoding also shrinks big
 * phone photos and strips EXIF metadata such as GPS location.
 */
export async function prepareImage(file: Blob, boxes: Box[], maxEdge = 2000): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.round(image.naturalWidth * scale)
    const height = Math.round(image.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not process that image.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    context.fillStyle = '#111111'
    for (const box of boxes) {
      context.fillRect(box.x * width, box.y * height, box.width * width, box.height * height)
    }
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare that image.'))),
        'image/jpeg',
        0.86,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
