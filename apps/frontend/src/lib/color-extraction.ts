/* ------------------------------------------------------------------ */
/*  Color Extraction — Canvas-based dominant color from album covers   */
/* ------------------------------------------------------------------ */

const colorCache = new Map<string, [number, number, number]>();
const MAX_CACHE_SIZE = 100;

/**
 * Extract dominant color from an image URL using Canvas API.
 * Downsizes to 50x50 and averages all pixels for performance.
 * Results are cached per URL (LRU eviction at 100 entries).
 */
export function extractDominantColor(
  imageUrl: string,
): Promise<[number, number, number]> {
  const cached = colorCache.get(imageUrl);
  if (cached) {
    // LRU: move to end by re-inserting
    colorCache.delete(imageUrl);
    colorCache.set(imageUrl, cached);
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([30, 30, 30]);
          return;
        }

        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          count++;
        }

        const result: [number, number, number] = [
          Math.round(r / count),
          Math.round(g / count),
          Math.round(b / count),
        ];

        // LRU eviction
        if (colorCache.size >= MAX_CACHE_SIZE) {
          const firstKey = colorCache.keys().next().value;
          if (firstKey) colorCache.delete(firstKey);
        }
        colorCache.set(imageUrl, result);

        resolve(result);
      } catch {
        resolve([30, 30, 30]);
      }
    };

    img.onerror = () => resolve([30, 30, 30]);
    img.src = imageUrl;
  });
}

/** Convert [r, g, b] to CSS rgb() string */
export function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Convert [r, g, b] to CSS rgba() string with alpha */
export function rgbaToCss([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
