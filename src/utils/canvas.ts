import type { ImageData, EditorConfig } from '../types';

export function exportToDataUrl(
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement | null,
  images: ImageData[],
  config: EditorConfig,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Clear canvas
  ctx.clearRect(0, 0, config.width, config.height);

  // Draw background if exists
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, config.width, config.height);
  }

  // Draw all user images in order (first = bottom, last = top)
  // Clip to printable area if defined
  if (config.printableArea) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      config.printableArea.minX,
      config.printableArea.minY,
      config.printableArea.maxX - config.printableArea.minX,
      config.printableArea.maxY - config.printableArea.minY
    );
    ctx.clip();
  }

  for (const imageData of images) {
    const { transform, src } = imageData;
    const img = new Image();
    img.src = src;

    ctx.save();

    // Apply rotation around image center
    if (transform.rotation !== 0) {
      const centerX = transform.position.x + transform.size.width / 2;
      const centerY = transform.position.y + transform.size.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    ctx.drawImage(
      img,
      transform.position.x,
      transform.position.y,
      transform.size.width,
      transform.size.height
    );

    ctx.restore();
  }

  // Restore from clip
  if (config.printableArea) {
    ctx.restore();
  }

  return canvas.toDataURL(format, quality);
}

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
