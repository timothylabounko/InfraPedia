export const LIGHT_TILES =
	'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export const DARK_TILES =
	'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const isEmbedded =
	typeof window !== 'undefined' &&
	(new URLSearchParams(window.location.search).has('embedded') ||
		window.parent !== window);

export function tileUrlForEmbed(darkUrl = DARK_TILES) {
	return isEmbedded ? LIGHT_TILES : darkUrl;
}

let pendingLoadState = null;
let bridgeInitialized = false;

/** Move Leaflet +/- zoom controls to the top-right corner. */
export function pinLeafletZoomToRight(root = document) {
	root.querySelectorAll('.leaflet-control-zoom').forEach((zoom) => {
		const container = zoom.closest('.leaflet-control-container');
		if (!container) return;
		const right = container.querySelector('.leaflet-top.leaflet-right');
		if (!right || zoom.parentElement === right) return;
		right.prepend(zoom);
	});
}

function watchLeafletZoomPosition() {
	pinLeafletZoomToRight();
	const observer = new MutationObserver(() => pinLeafletZoomToRight());
	observer.observe(document.documentElement, { childList: true, subtree: true });
	window.setTimeout(() => pinLeafletZoomToRight(), 100);
	window.setTimeout(() => pinLeafletZoomToRight(), 500);
	window.setTimeout(() => pinLeafletZoomToRight(), 1500);
}

export function initInfraBridge(getState, setState) {
	if (!isEmbedded || bridgeInitialized) return;
	bridgeInitialized = true;

	document.documentElement.classList.add('infra-embedded');
	watchLeafletZoomPosition();

	const applyPending = () => {
		if (pendingLoadState && typeof setState === 'function') {
			setState(pendingLoadState);
			pendingLoadState = null;
		}
	};

	const notifyReady = () => {
		window.parent.postMessage({ source: 'template-app', type: 'ready' }, '*');
	};

	window.addEventListener('message', (event) => {
		if (event.data?.source !== 'infrapedia') return;

		if (event.data.type === 'load-state') {
			const state = event.data.state ?? {};
			if (typeof setState === 'function') {
				setState(state);
				pendingLoadState = null;
			} else {
				pendingLoadState = state;
			}
			notifyReady();
		}

		if (event.data.type === 'request-state') {
			window.parent.postMessage(
				{ source: 'template-app', type: 'state', state: getState() },
				'*'
			);
		}

		if (event.data.type === 'ping') {
			notifyReady();
		}
	});

	applyPending();
	notifyReady();
	window.addEventListener('load', notifyReady);
	window.setTimeout(notifyReady, 100);
	window.setTimeout(notifyReady, 500);
	window.setTimeout(notifyReady, 1500);
}
