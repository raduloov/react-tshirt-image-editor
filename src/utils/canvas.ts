import type { ImageData, EditorConfig } from '../types';

// Helper to load an image from a source URL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportToDataUrl(
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement | null,
  images: ImageData[],
  config: EditorConfig,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92
): Promise<string> {
  const scale = config.exportScale || 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Pre-load all user images to ensure they're ready for drawing
  const loadedImages = await Promise.all(
    images.map(async (imageData) => ({
      transform: imageData.transform,
      img: await loadImage(imageData.src),
    }))
  );

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Scale all drawing operations
  ctx.save();
  ctx.scale(scale, scale);

  // Draw background using "cover" behavior to match CSS background-size: cover
  if (backgroundImage) {
    const imgRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    const containerRatio = config.width / config.height;

    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

    if (imgRatio > containerRatio) {
      // Image is wider - fit height, crop width
      drawHeight = config.height;
      drawWidth = backgroundImage.naturalWidth * (config.height / backgroundImage.naturalHeight);
      drawX = (config.width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller - fit width, crop height
      drawWidth = config.width;
      drawHeight = backgroundImage.naturalHeight * (config.width / backgroundImage.naturalWidth);
      drawX = 0;
      drawY = (config.height - drawHeight) / 2;
    }

    ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
  }

  // Set up clipping if printable area is defined
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

  // Draw all user images in order (first = bottom, last = top)
  for (const { transform, img } of loadedImages) {
    ctx.save();

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

  // Restore from clip if it was applied
  if (config.printableArea) {
    ctx.restore();
  }

  // Restore from scale
  ctx.restore();

  return canvas.toDataURL(format, quality);
}

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
