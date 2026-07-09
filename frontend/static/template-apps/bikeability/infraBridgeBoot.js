import { isEmbedded, initInfraBridge, pinLeafletZoomToRight } from './infraEmbed.js';

if (isEmbedded) {
	const noop = () => {};

	const connect = () => {
		if (typeof window.__infraGetState !== 'function') return false;
		initInfraBridge(window.__infraGetState, window.__infraSetState ?? noop);
		return true;
	};

	pinLeafletZoomToRight();
	window.addEventListener('load', () => pinLeafletZoomToRight());

	if (!connect()) {
		const interval = window.setInterval(() => {
			if (connect()) window.clearInterval(interval);
		}, 150);
		window.setTimeout(() => window.clearInterval(interval), 20000);
		window.addEventListener('load', connect);
	}
}
