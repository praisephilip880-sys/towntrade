/**
 * Client-side only: read a File and return a data URL, accepting EVERY image
 * format the browser can show — JPG, PNG, GIF, WebP, BMP, AVIF, SVG, ICO and
 * more. Most formats are downscaled + compressed to a JPEG data URL on a
 * canvas; formats the canvas cannot decode (e.g. HEIC from iPhones on some
 * browsers) fall back to the original file as a raw data URL.
 */
export function fileToDataUrl(file, maxDim = 1100, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!isImageFile(file)) {
            reject(new Error('This file does not look like an image. Please choose a photo (JPG, PNG, GIF, WebP, HEIC…).'));
            return;
        }
        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();

        // Formats the canvas cannot re-encode — keep the original bytes as-is.
        const rawOnly = type.includes('svg') || name.endsWith('.svg') || type.includes('heic') || type.includes('heif');
        if (rawOnly) {
            const reader = new FileReader();
            reader.onload = () => {
                if (estimateBytes(String(reader.result)) > MAX_IMAGE_BYTES) {
                    reject(new Error('This image is too large (max ~3 MB after processing). Please choose a smaller photo.'));
                    return;
                }
                resolve(String(reader.result));
            };
            reader.onerror = () => reject(new Error('Could not read this file.'));
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
                    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                    const width = Math.max(1, Math.round(img.width * scale));
                    const height = Math.max(1, Math.round(img.height * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas is not supported in this browser.');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    const out = canvas.toDataURL('image/jpeg', quality);
                    if (estimateBytes(out) > MAX_IMAGE_BYTES) {
                        reject(new Error('This image is too large after processing (max ~3 MB). Please choose a smaller photo.'));
                        return;
                    }
                    resolve(out);
                }
                catch {
                    // Canvas decode failed (unusual format) — try the raw bytes.
                    fallbackRaw(resolve, reject, file);
                }
            };
            img.onerror = () => fallbackRaw(resolve, reject, file);
            img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
    });
}

/** Try to read the file without any processing (last resort for odd formats). */
function fallbackRaw(resolve, reject, file) {
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = String(reader.result);
        if (estimateBytes(dataUrl) > MAX_IMAGE_BYTES) {
            reject(new Error('Could not compress this image and it is too large (max ~3 MB). Please convert it to JPG/PNG first.'));
            return;
        }
        resolve(dataUrl);
    };
    reader.onerror = () => reject(new Error('Could not read this file — please try a JPG or PNG.'));
    reader.readAsDataURL(file);
}

/** Accept any image MIME type, or any file whose extension is a known image format. */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|avif|svg|ico|heic|heif|tiff?|jfif|pjp|xbm|dib)$/i;
export function isImageFile(file) {
    if (!file) return false;
    if (String(file.type || '').startsWith('image/')) return true;
    return IMAGE_EXTENSIONS.test(String(file.name || ''));
}

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 3_000_000;
export function estimateBytes(dataUrl) {
    const idx = String(dataUrl).indexOf(',');
    return Math.round((String(dataUrl).length - idx - 1) * 0.75);
}
