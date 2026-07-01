import { toJpeg } from 'html-to-image';

const PREVIEW_SIZE = 512;
const JPEG_QUALITY = 0.82;

const HIDE_SELECTORS = ['.leaflet-control-container', '.leaflet-control-attribution'];

function hideOverlays(root: HTMLElement) {
	const restored: { el: HTMLElement; visibility: string }[] = [];
	for (const selector of HIDE_SELECTORS) {
		for (const node of root.querySelectorAll<HTMLElement>(selector)) {
			restored.push({ el: node, visibility: node.style.visibility });
			node.style.visibility = 'hidden';
		}
	}
	return restored;
}

function restoreOverlays(restored: { el: HTMLElement; visibility: string }[]) {
	for (const { el, visibility } of restored) {
		el.style.visibility = visibility;
	}
}

async function cropSquareJpeg(dataUrl: string, size: number): Promise<string> {
	const img = new Image();
	img.src = dataUrl;
	await img.decode();
	const side = Math.min(img.width, img.height);
	const sx = Math.floor((img.width - side) / 2);
	const sy = Math.floor((img.height - side) / 2);
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) return dataUrl;
	ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
	return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Capture the map surface including lines, stations, polygons, landcover, and legend.
 * Pass the wrapper that contains MetroMapEditor + MapLegendOverlay (not tool panels).
 */
export async function captureMapPreview(surface: HTMLElement): Promise<string | null> {
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	await new Promise((r) => setTimeout(r, 80));

	const hidden = hideOverlays(surface);
	try {
		const dataUrl = await toJpeg(surface, {
			quality: JPEG_QUALITY,
			pixelRatio: 1,
			cacheBust: true,
			skipFonts: false,
			backgroundColor: '#ffffff'
		});
		return cropSquareJpeg(dataUrl, PREVIEW_SIZE);
	} catch (err) {
		console.warn('Map preview capture failed:', err);
		return null;
	} finally {
		restoreOverlays(hidden);
	}
}

/** Read an uploaded image file as a square-cropped JPEG data URL */
export function fileToPreviewDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!file.type.startsWith('image/')) {
			reject(new Error('File must be an image'));
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = () => {
				const size = Math.min(img.width, img.height);
				const sx = (img.width - size) / 2;
				const sy = (img.height - size) / 2;
				const canvas = document.createElement('canvas');
				canvas.width = PREVIEW_SIZE;
				canvas.height = PREVIEW_SIZE;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Could not process image'));
					return;
				}
				ctx.drawImage(img, sx, sy, size, size, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
				resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
			};
			img.onerror = () => reject(new Error('Could not load image'));
			img.src = reader.result as string;
		};
		reader.onerror = () => reject(new Error('Could not read file'));
		reader.readAsDataURL(file);
	});
}
