<script lang="ts">
	import { onMount } from 'svelte';
	import { actionSummary, highlightIdForAction, parseAgentActions } from '$lib/metro/agent-tools';
	import type { AgentAction } from '$lib/metro/types';

	type ChatMessage = {
		id?: string;
		role: 'user' | 'assistant';
		content: string;
		tool_calls?: unknown[];
		actionLabels?: string[];
	};

	type HighlightState = { id: string; label: string } | null;

	type Props = {
		projectId: string;
		initialMessages: ChatMessage[];
		projectContext: string;
		onActions: (actions: AgentAction[]) => void | Promise<void>;
		onHighlight: (state: HighlightState) => void;
	};

	let { projectId, initialMessages, projectContext, onActions, onHighlight }: Props = $props();

	const MIN_WIDTH = 240;
	const MAX_WIDTH = 560;
	const DEFAULT_WIDTH = 320;
	const STORAGE_KEY = 'metro-chat-panel-width';

	let messages = $state<ChatMessage[]>([...initialMessages]);
	let input = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let width = $state(DEFAULT_WIDTH);

	onMount(() => {
		const stored = Number(localStorage.getItem(STORAGE_KEY));
		if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
			width = stored;
		}
	});

	function persistWidth() {
		try {
			localStorage.setItem(STORAGE_KEY, String(width));
		} catch {
			// ignore
		}
	}

	function startResize(event: MouseEvent) {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;

		const onMove = (moveEvent: MouseEvent) => {
			const next = startWidth + (startX - moveEvent.clientX);
			width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next));
		};

		const onUp = () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			persistWidth();
		};

		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	async function persistMessage(
		role: 'user' | 'assistant',
		content: string,
		tool_calls: unknown[] = []
	) {
		try {
			await fetch(`/projects/${projectId}/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role, content, tool_calls })
			});
		} catch {
			// optional
		}
	}

	async function send() {
		const text = input.trim();
		if (!text || loading) return;

		loading = true;
		error = null;
		input = '';

		const userMessage: ChatMessage = { role: 'user', content: text };
		messages = [...messages, userMessage];
		void persistMessage('user', text);

		try {
			const apiMessages = messages
				.filter((m) => m.role === 'user' || m.role === 'assistant')
				.map((m) => ({ role: m.role, content: m.content }));

			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: apiMessages, projectContext })
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Chat failed');

			const actions = parseAgentActions(data.actions ?? []);
			const actionLabels = actions.map((a) => actionSummary(a));

			messages = [
				...messages,
				{
					role: 'assistant',
					content: data.message || (actions.length ? 'Applying changes…' : 'Done.'),
					tool_calls: data.actions,
					actionLabels
				}
			];
			void persistMessage('assistant', data.message ?? '', data.actions ?? []);

			if (actions.length > 0) {
				for (const action of actions) {
					onHighlight({ id: highlightIdForAction(action), label: actionSummary(action) });
					await new Promise((r) => setTimeout(r, 550));
				}
				await onActions(actions);
				await new Promise((r) => setTimeout(r, 500));
				onHighlight(null);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<aside
	class="relative flex min-h-0 shrink-0 flex-col border-l border-slate-200 bg-white"
	style="width: {width}px"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute bottom-0 left-0 top-0 z-10 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-sky-400/30 active:bg-sky-500/40"
		role="separator"
		aria-orientation="vertical"
		aria-label="Resize chat panel"
		onmousedown={startResize}
	></div>

	<div class="border-b border-slate-200 px-4 py-3">
		<h2 class="font-semibold text-slate-900">Metro Map Assistant</h2>
		<p class="text-xs text-slate-500">Drag the left edge to resize. Watch toolbar highlights as tools run.</p>
	</div>

	<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
		{#each messages as message, i (i)}
			<div
				class={`rounded-lg px-3 py-2 text-sm ${
					message.role === 'user' ? 'ml-4 bg-slate-800 text-white' : 'mr-2 bg-slate-100 text-slate-800'
				}`}
			>
				{message.content}
				{#if message.actionLabels?.length}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each message.actionLabels as label}
							<span
								class="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
							>
								⚡ {label}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		{#if loading}
			<p class="text-xs text-slate-400">Assistant is thinking…</p>
		{/if}
		{#if error}
			<p class="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>
		{/if}
	</div>

	<form
		class="border-t border-slate-200 p-3"
		onsubmit={(e) => {
			e.preventDefault();
			send();
		}}
	>
		<textarea
			bind:value={input}
			rows="3"
			placeholder="Zoom to Boston, draw a NYC-style line, add stations…"
			class="mb-2 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm"
		></textarea>
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-md border border-slate-900 bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
		>
			Send
		</button>
	</form>
</aside>
