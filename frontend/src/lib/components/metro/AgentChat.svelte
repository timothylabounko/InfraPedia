<script lang="ts">
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

	let messages = $state<ChatMessage[]>([...initialMessages]);
	let input = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

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

<aside class="flex min-h-0 w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
	<div class="border-b border-slate-200 px-4 py-3">
		<h2 class="font-semibold text-slate-900">Metro Map Assistant</h2>
		<p class="text-xs text-slate-500">Watch toolbar highlights as tools run.</p>
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
