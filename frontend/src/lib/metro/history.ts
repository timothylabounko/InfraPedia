import type { EditorSnapshot } from './types';

const MAX_HISTORY = 50;

export function cloneSnapshot(state: EditorSnapshot): EditorSnapshot {
	return JSON.parse(JSON.stringify(state));
}

export function createEditorHistory(initial: EditorSnapshot) {
	let stack = [cloneSnapshot(initial)];
	let index = 0;

	return {
		push(state: EditorSnapshot) {
			const snapshot = cloneSnapshot(state);
			const current = stack[index];
			if (JSON.stringify(current) === JSON.stringify(snapshot)) return;

			stack = stack.slice(0, index + 1);
			stack.push(snapshot);
			if (stack.length > MAX_HISTORY) {
				stack = stack.slice(stack.length - MAX_HISTORY);
			}
			index = stack.length - 1;
		},
		undo(): EditorSnapshot | null {
			if (index <= 0) return null;
			index -= 1;
			return cloneSnapshot(stack[index]);
		},
		canUndo() {
			return index > 0;
		},
		current() {
			return cloneSnapshot(stack[index]);
		}
	};
}
