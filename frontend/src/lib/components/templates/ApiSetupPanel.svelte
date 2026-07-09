<script lang="ts">
	import type { TemplateApiRequirement } from '$lib/data/platform-apis';
	import { getPlatformApi, platformApis } from '$lib/data/platform-apis';

	type Props = {
		templateSlug: string;
		requiredApiIds: string[];
		config: TemplateApiRequirement[];
		onChange: (config: TemplateApiRequirement[]) => void;
		variant?: 'band' | 'modal';
	};

	let { templateSlug, requiredApiIds, config, onChange, variant = 'band' }: Props = $props();

	const requiredApis = $derived(
		requiredApiIds.map((id) => getPlatformApi(id)).filter((api): api is NonNullable<typeof api> => !!api)
	);

	const wrapperClass = $derived(
		variant === 'modal'
			? 'px-4 py-3 text-sm text-slate-900'
			: 'border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
	);

	function getEntry(apiId: string): TemplateApiRequirement {
		return config.find((c) => c.apiId === apiId) ?? { apiId, usePlatform: true };
	}

	function updateEntry(apiId: string, patch: Partial<TemplateApiRequirement>) {
		const next = [...config];
		const idx = next.findIndex((c) => c.apiId === apiId);
		const base = idx >= 0 ? next[idx] : { apiId, usePlatform: true };
		const merged = { ...base, ...patch };
		if (idx >= 0) next[idx] = merged;
		else next.push(merged);
		onChange(next);
	}
</script>

{#if requiredApis.length > 0}
	<div class={wrapperClass}>
		<p class="font-semibold">API setup for {templateSlug}</p>
		<p class="mt-1 text-slate-600">
			Map templates use the InfraPedia backend (OSMnx for OpenStreetMap). Use platform services or enter
			your own keys where needed.
		</p>
		<ul class="mt-3 space-y-3">
			{#each requiredApis as api (api.id)}
				{@const entry = getEntry(api.id)}
				<li class="rounded-lg border border-slate-200 bg-white p-3">
					<p class="font-medium text-slate-900">{api.name}</p>
					<p class="text-xs text-slate-600">{api.description}</p>
					<div class="mt-2 flex flex-wrap gap-4">
						{#if api.proxyPath || api.requiresBackend}
							<label class="flex items-center gap-2 text-xs">
								<input
									type="radio"
									name={`api-${api.id}`}
									checked={entry.usePlatform}
									onchange={() => updateEntry(api.id, { usePlatform: true, userApiKey: undefined })}
								/>
								Use InfraPedia {api.id === 'osm-osmnx' ? 'OSMnx backend' : 'service'}
							</label>
						{/if}
						{#if api.requiresUserKey}
							<label class="flex items-center gap-2 text-xs">
								<input
									type="radio"
									name={`api-${api.id}`}
									checked={!entry.usePlatform}
									onchange={() => updateEntry(api.id, { usePlatform: false })}
								/>
								My API key
							</label>
						{/if}
					</div>
					{#if !entry.usePlatform && api.requiresUserKey}
						<input
							type="password"
							class="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
							placeholder={api.keyEnvHint ?? 'API key'}
							value={entry.userApiKey ?? ''}
							oninput={(e) => updateEntry(api.id, { userApiKey: e.currentTarget.value })}
						/>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="mt-2 text-xs text-slate-500">
			Platform: {platformApis.map((a) => a.name).join(', ')}
		</p>
	</div>
{/if}
