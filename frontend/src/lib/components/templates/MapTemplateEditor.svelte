<script lang="ts">
	import ProjectEditorBand from '$lib/components/metro/ProjectEditorBand.svelte';
	import ApiSetupModal from '$lib/components/templates/ApiSetupModal.svelte';
	import type { SharingMode, SharingSettings } from '$lib/metro/types';
	import type { MapTemplateSlug } from '$lib/data/template-registry';
	import type { TemplateApiRequirement } from '$lib/data/platform-apis';
	import { templateApiRequirements } from '$lib/data/platform-apis';
	import { onMount } from 'svelte';

	type Props = {
		project: {
			id: string;
			name: string;
			visibility: string;
			status: string;
			isOwner: boolean;
		};
		templateSlug: MapTemplateSlug;
		embedPath: string;
		mapState: Record<string, unknown>;
		sharing: SharingSettings;
		apiConfig?: TemplateApiRequirement[];
	};

	let { project, templateSlug, embedPath, mapState, sharing, apiConfig = [] }: Props = $props();

	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let projectName = $state(project.name);
	let sharingMode = $state<SharingMode>(sharing.mode);
	let collaboratorEmails = $state(sharing.collaboratorEmails.join(', '));
	let requireApproval = $state(sharing.requireApproval);
	let saveLabel = $state('Save');
	let iframeReady = $state(false);
	let iframeLoadError = $state<string | null>(null);
	let pendingState = $state<Record<string, unknown> | null>(mapState);
	let apiSetup = $state<TemplateApiRequirement[]>([...apiConfig]);
	let apiSetupOpen = $state(false);
	let apiHealth = $state<{ ok: boolean; checks: Array<{ name: string; ok: boolean; message: string }> } | null>(
		null
	);

	const bandTone = $derived<'red' | 'yellow'>(
		!project.isOwner ? 'yellow' : 'red'
	);

	const iframeSrc = $derived(
		`${embedPath}?embedded=1&projectId=${encodeURIComponent(project.id)}&template=${encodeURIComponent(templateSlug)}`
	);

	const requiredApiIds = $derived(templateApiRequirements[templateSlug] ?? []);

	function postToIframe(message: Record<string, unknown>) {
		iframeEl?.contentWindow?.postMessage({ source: 'infrapedia', ...message }, '*');
	}

	function markIframeReady() {
		iframeReady = true;
		iframeLoadError = null;
		postToIframe({ type: 'ping' });
		if (pendingState) {
			postToIframe({ type: 'load-state', state: pendingState });
			pendingState = null;
		}
	}

	function handleIframeLoad() {
		markIframeReady();
	}

	async function requestMapState(): Promise<Record<string, unknown>> {
		return new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => reject(new Error('Timed out waiting for map state')), 8000);

			const handler = (event: MessageEvent) => {
				if (event.data?.source !== 'template-app' || event.data?.type !== 'state') return;
				window.removeEventListener('message', handler);
				window.clearTimeout(timeout);
				resolve(event.data.state as Record<string, unknown>);
			};

			window.addEventListener('message', handler);
			postToIframe({ type: 'request-state' });
		});
	}

	async function handleSave() {
		saveLabel = 'Saving…';
		try {
			const currentState = await requestMapState();
			const res = await fetch(`/projects/${project.id}/save`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mapState: currentState,
					name: projectName,
					sharing: {
						mode: sharingMode,
						collaboratorEmails: collaboratorEmails
							.split(',')
							.map((e) => e.trim())
							.filter(Boolean),
						requireApproval
					},
					apiConfig: apiSetup
				})
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Save failed');
			}

			saveLabel = 'Saved';
			window.setTimeout(() => {
				saveLabel = 'Save';
			}, 1500);
		} catch (err) {
			saveLabel = 'Save failed';
			console.error(err);
			window.setTimeout(() => {
				saveLabel = 'Save';
			}, 2000);
		}
	}

	onMount(() => {
		const loadFallback = window.setTimeout(() => {
			if (!iframeReady) markIframeReady();
		}, 2500);

		void fetch(`/api/template-health/${templateSlug}`)
			.then((r) => r.json())
			.then((data) => {
				apiHealth = data;
			})
			.catch(() => {
				apiHealth = { ok: false, checks: [] };
			});

		const handler = (event: MessageEvent) => {
			if (event.data?.source !== 'template-app') return;
			if (event.data.type === 'ready') {
				iframeReady = true;
				if (pendingState) {
					postToIframe({ type: 'load-state', state: pendingState });
					pendingState = null;
				}
			}
		};

		window.addEventListener('message', handler);
		return () => {
			window.removeEventListener('message', handler);
			window.clearTimeout(loadFallback);
		};
	});

	$effect(() => {
		const iframe = iframeEl;
		if (!iframe) return;

		const onError = () => {
			iframeLoadError = 'Could not load the map template. Try refreshing the page.';
			markIframeReady();
		};

		iframe.addEventListener('load', markIframeReady);
		iframe.addEventListener('error', onError);

		return () => {
			iframe.removeEventListener('load', markIframeReady);
			iframe.removeEventListener('error', onError);
		};
	});
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
	<ProjectEditorBand
		{projectName}
		{sharingMode}
		{collaboratorEmails}
		{requireApproval}
		{saveLabel}
		isOwner={project.isOwner}
		tone={bandTone}
		showApiSetup={requiredApiIds.length > 0}
		apiSetupWarning={apiHealth !== null && !apiHealth.ok}
		onApiSetupClick={() => (apiSetupOpen = true)}
		onProjectNameChange={(v) => (projectName = v)}
		onSharingModeChange={(mode) => (sharingMode = mode)}
		onCollaboratorEmailsChange={(v) => (collaboratorEmails = v)}
		onRequireApprovalChange={(v) => (requireApproval = v)}
		onSave={handleSave}
	/>

	<ApiSetupModal
		open={apiSetupOpen}
		{templateSlug}
		{requiredApiIds}
		config={apiSetup}
		onChange={(next) => (apiSetup = next)}
		onClose={() => (apiSetupOpen = false)}
	/>

	{#if apiHealth && !apiHealth.ok}
		<div class="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
			<p class="font-medium">Some APIs are unavailable</p>
			<ul class="mt-1 list-inside list-disc text-xs">
				{#each apiHealth.checks.filter((c) => !c.ok) as check}
					<li>{check.name}: {check.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="relative min-h-0 flex-1 bg-slate-50">
		{#if !iframeReady}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-slate-600">
				Loading map template…
			</div>
		{/if}
		{#if iframeLoadError}
			<div class="absolute inset-x-0 top-0 z-20 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
				{iframeLoadError}
			</div>
		{/if}
		<iframe
			bind:this={iframeEl}
			title="Map template editor"
			src={iframeSrc}
			class="h-full w-full border-0 bg-white"
			allow="geolocation"
			onload={handleIframeLoad}
		></iframe>
	</div>
</main>
