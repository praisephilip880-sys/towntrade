'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { estimateBytes, fileToDataUrl, MAX_IMAGE_BYTES, MAX_IMAGES } from '@/lib/image';
import { IconUpload, IconX } from './icons';
export default function ImageUploader({ images, onChange }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');
    const addFiles = async (files) => {
        setError('');
        const incoming = Array.from(files);
        const room = MAX_IMAGES - images.length;
        const list = room > 0 ? incoming.slice(0, room) : [];
        if (incoming.length > room) {
            setError(`You can add up to ${MAX_IMAGES} photos.${room <= 0 ? ' Remove one first.' : ''}`);
        }
        const results = [];
        for (const file of list) {
            try {
                const url = await fileToDataUrl(file);
                if (estimateBytes(url) > MAX_IMAGE_BYTES) {
                    setError('One of the images is too large after processing. Please try a smaller file.');
                    continue;
                }
                results.push(url);
            }
            catch (e) {
                setError(e instanceof Error ? e.message : 'Could not process an image.');
            }
        }
        if (results.length)
            onChange([...images, ...results]);
    };
    return (_jsxs("div", { children: [_jsxs("div", { onDragOver: (e) => {
                    e.preventDefault();
                    setDragOver(true);
                }, onDragLeave: () => setDragOver(false), onDrop: (e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files.length)
                        addFiles(e.dataTransfer.files);
                }, onClick: () => inputRef.current?.click(), className: `flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-charcoal-200 bg-charcoal-50/40 hover:border-emerald-300 hover:bg-emerald-50/40'}`, children: [_jsx("span", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600", children: _jsx(IconUpload, { className: "h-6 w-6" }) }), _jsx("p", { className: "text-sm font-bold text-charcoal-900", children: images.length === 0 ? 'Drag & drop photos, or click to browse' : 'Add more photos' }), _jsxs("p", { className: "text-xs text-charcoal-400", children: ["JPG, PNG, GIF, WebP, HEIC & more \u00B7 up to ", MAX_IMAGES, " photos \u00B7 auto-compressed locally"] }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*,.heic,.heif,.avif", multiple: true, className: "hidden", onChange: (e) => {
                            if (e.target.files?.length)
                                addFiles(e.target.files);
                            e.target.value = '';
                        } })] }), error && _jsx("p", { className: "mt-2 text-xs font-medium text-red-600", children: error }), images.length > 0 && (_jsx("div", { className: "mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4", children: images.map((src, i) => (_jsxs("div", { className: "group relative aspect-square overflow-hidden rounded-xl border border-charcoal-100 bg-charcoal-50", children: [_jsx("img", { src: src, alt: `Upload ${i + 1}`, className: "h-full w-full object-cover" }), i === 0 && (_jsx("span", { className: "absolute bottom-1.5 left-1.5 rounded-full bg-charcoal-950/70 px-2 py-0.5 text-[10px] font-bold text-white", children: "Cover" })), _jsx("button", { type: "button", onClick: (e) => {
                                e.stopPropagation();
                                onChange(images.filter((_, idx) => idx !== i));
                            }, "aria-label": "Remove photo", className: "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-950/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100", children: _jsx(IconX, { className: "h-3.5 w-3.5" }) })] }, i))) }))] }));
}
