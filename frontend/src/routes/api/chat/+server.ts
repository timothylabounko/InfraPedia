import Anthropic from '@anthropic-ai/sdk';
import { json } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { TOOL_DEFINITIONS } from '$lib/metro/agent-tools';
import type { RequestHandler } from './$types';

	const SYSTEM_PROMPT = `You are the InfraPedia Metro Map Assistant. You help users create schematic metro maps.

IMPORTANT: When the user asks you to zoom, draw, simplify, add stations, or change the map — you MUST call the appropriate tools. Do not only describe what to do.

Available tools:
- set_map_view: pan/zoom (Boston: lat 42.3601, lng -71.0589, zoom 13; NYC: lat 40.7128, lng -74.0060, zoom 12; Delhi: lat 28.6139, lng 77.2090, zoom 12)
- draw_line: draw a line with coordinates [[lng,lat],...] — use for "draw a line from A to B"
- add_station: place a station at lat/lng with optional name and iconId (circle, square, diamond, interchange, terminal)
- enable_draw_mode / disable_draw_mode: toggle manual line drawing
- enable_station_mode / disable_station_mode: toggle click-to-add stations
- set_draw_style: set color, styleId (boston/nyc/delhi/london/paris/tokyo/dc), weight (2-8)
- simplify_map: schematic view with white background, forest green and river blue polygons
- set_view_mode: geographic or schematic
- set_map_source: osm or scratch
- undo, clear_lines, clear_stations, save_project

After zooming, you may draw lines or add stations in the same response using multiple tools.`;

const DEPRECATED_MODELS = new Set(['claude-sonnet-4-20250514']);

const MODEL_CANDIDATES = [
	'claude-sonnet-4-6',
	'claude-sonnet-4-5-20250929',
	'claude-3-5-sonnet-20241022',
	env.ANTHROPIC_MODEL
]
	.filter((m): m is string => typeof m === 'string' && m.length > 0 && !DEPRECATED_MODELS.has(m))
	.filter((m, i, arr) => arr.indexOf(m) === i);

export const POST: RequestHandler = async ({ request }) => {
	if (!ANTHROPIC_API_KEY) {
		return json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
	}

	let body: {
		messages?: { role: 'user' | 'assistant'; content: string }[];
		projectContext?: string;
	};

	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const messages = body.messages ?? [];
	if (messages.length === 0) {
		return json({ error: 'messages array is required' }, { status: 400 });
	}

	const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
	const system = body.projectContext
		? `${SYSTEM_PROMPT}\n\nProject context:\n${body.projectContext}`
		: SYSTEM_PROMPT;

	const toolConfig = {
		max_tokens: 2048,
		system,
		tools: TOOL_DEFINITIONS.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.input_schema as unknown as Anthropic.Tool['input_schema']
		})),
		messages: messages.map((m) => ({
			role: m.role,
			content: m.content
		}))
	};

	let lastError: string | null = null;

	for (const model of MODEL_CANDIDATES) {
		try {
			const response = await client.messages.create({
				model,
				...toolConfig
			});

			const textBlocks = response.content.filter((b) => b.type === 'text');
			const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

			return json({
				message: textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('\n').trim(),
				actions: toolBlocks,
				stop_reason: response.stop_reason
			});
		} catch (error) {
			lastError = error instanceof Error ? error.message : 'Anthropic API error';
			if (!lastError.includes('not_found')) break;
		}
	}

	return json({ error: lastError ?? 'Anthropic API error' }, { status: 500 });
};
