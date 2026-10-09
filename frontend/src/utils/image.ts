// Uploaded images can be requested at these widths from /uploads/resized/<width>/...
// Must match ALLOWED_WIDTHS in backend/app/utils/image_variants.py and the hero preload in index.html.
export const IMAGE_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 1920] as const;

type ImageWidth = (typeof IMAGE_WIDTHS)[number];

const RESIZABLE = /^\/uploads\/(?!resized\/).+\.(avif|webp|jpe?g|png)$/i;

/** URL of `src` scaled down to `width` px. External and non-resizable images are returned unchanged. */
export function resizedImage(src: string, width: ImageWidth): string {
  return RESIZABLE.test(src) ? `/uploads/resized/${width}/${src.slice('/uploads/'.length)}` : src;
}

/** `srcset` for an uploaded image, or undefined when it can't be resized. */
export function imageSrcSet(src: string, widths: readonly ImageWidth[] = IMAGE_WIDTHS): string | undefined {
  if (!RESIZABLE.test(src)) return undefined;
  return widths.map((w) => `${resizedImage(src, w)} ${w}w`).join(', ');
}
