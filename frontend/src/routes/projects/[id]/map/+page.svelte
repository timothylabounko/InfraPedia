<script lang="ts">
	import MapTemplateEditor from '$lib/components/templates/MapTemplateEditor.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<MapTemplateEditor
	project={data.project}
	templateSlug={data.templateSlug}
	embedPath={data.embedPath}
	mapState={data.mapState}
	sharing={data.sharing}
	apiConfig={data.apiConfig}
/>
