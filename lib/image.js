/**
 * Client-side only: read a File, downscale it on a canvas, and return a
 * compressed JPEG data URL. Keeps uploaded photos lightweight so they can be
 * stored directly in the SQLite database for the simulated workflow.
 */
export function fileToDataUrl(file, maxDim = 1100, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Only image files are supported.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const width = Math.max(1, Math.round(img.width * scale));
                const height = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas is not supported in this browser.'));
                    return;
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Could not read this image.'));
            img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
    });
}
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 1_500_000;
export function estimateBytes(dataUrl) {
    return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
}
