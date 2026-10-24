/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MipmapIcons {
  mdpi: string; // 48x48 base64
  hdpi: string; // 72x72 base64
  xhdpi: string; // 96x96 base64
  xxhdpi: string; // 144x144 base64
  xxxhdpi: string; // 192x192 base64
}

const ICON_SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
} as const;

/**
 * Creates a default styled app launcher icon on a canvas
 */
function createDefaultIconCanvas(size: number, appName: string, themeColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background squircle / rounded rect (Android adaptive icon style)
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  // Primary background gradient using theme color
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, themeColor || '#2563EB');
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle inner highlight ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.stroke();

  // First letter of app name or default "A"
  const cleanName = appName.trim() || 'App';
  const initial = cleanName.charAt(0).toUpperCase();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.5)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, size / 2, size / 2 + size * 0.02);

  return canvas;
}

/**
 * Resizes an existing image source to the specified square size on canvas
 */
function resizeImageCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Smooth image resizing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);

  return canvas;
}

/**
 * Converts a canvas to pure base64 (without data:image/png;base64, prefix)
 */
function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png');
  const base64Index = dataUrl.indexOf(',');
  return base64Index !== -1 ? dataUrl.slice(base64Index + 1) : dataUrl;
}

/**
 * Generates launcher icons for all 5 Android mipmap densities
 */
export async function generateMipmapIcons(
  customIconDataUrl: string | null,
  appName: string,
  themeColor: string
): Promise<MipmapIcons> {
  if (customIconDataUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load custom icon'));
      img.src = customIconDataUrl;
    });

    return {
      mdpi: canvasToBase64(resizeImageCanvas(img, ICON_SIZES.mdpi)),
      hdpi: canvasToBase64(resizeImageCanvas(img, ICON_SIZES.hdpi)),
      xhdpi: canvasToBase64(resizeImageCanvas(img, ICON_SIZES.xhdpi)),
      xxhdpi: canvasToBase64(resizeImageCanvas(img, ICON_SIZES.xxhdpi)),
      xxxhdpi: canvasToBase64(resizeImageCanvas(img, ICON_SIZES.xxxhdpi)),
    };
  }

  // Fallback: programmatic default icon
  return {
    mdpi: canvasToBase64(createDefaultIconCanvas(ICON_SIZES.mdpi, appName, themeColor)),
    hdpi: canvasToBase64(createDefaultIconCanvas(ICON_SIZES.hdpi, appName, themeColor)),
    xhdpi: canvasToBase64(createDefaultIconCanvas(ICON_SIZES.xhdpi, appName, themeColor)),
    xxhdpi: canvasToBase64(createDefaultIconCanvas(ICON_SIZES.xxhdpi, appName, themeColor)),
    xxxhdpi: canvasToBase64(createDefaultIconCanvas(ICON_SIZES.xxxhdpi, appName, themeColor)),
  };
}
