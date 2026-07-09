import { isEmbedded, initInfraBridge, pinLeafletZoomToRight, tileUrlForEmbed } from './infraEmbed.js';
import './infra-embed.css';

export { isEmbedded, pinLeafletZoomToRight, tileUrlForEmbed };

export function registerMapTemplateBridge(getState, setState) {
	if (!isEmbedded) return;
	window.__infraGetState = getState;
	window.__infraSetState = setState ?? (() => {});
	initInfraBridge(getState, setState);
	pinLeafletZoomToRight();
}
