import type { AgentAction, AgentActionName } from './types';

export const TOOL_DEFINITIONS = [
	{
		name: 'enable_draw_mode',
		description: 'Turn on line drawing mode so the user can click the map to add transit lines.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'disable_draw_mode',
		description: 'Turn off line drawing mode.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'enable_station_mode',
		description: 'Turn on station placement mode — user clicks the map to add stations.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'disable_station_mode',
		description: 'Turn off station placement mode.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'draw_line',
		description:
			'Draw a transit line programmatically. Coordinates are [longitude, latitude] pairs. Use at least 2 points.',
		input_schema: {
			type: 'object',
			properties: {
				coordinates: {
					type: 'array',
					items: { type: 'array', items: { type: 'number' } },
					description: 'Array of [lng, lat] points'
				},
				name: { type: 'string' },
				color: { type: 'string', description: 'Hex color e.g. #DA291C' },
				styleId: {
					type: 'string',
					enum: ['boston', 'nyc', 'delhi', 'london', 'paris', 'tokyo', 'dc']
				},
				weight: { type: 'number', description: 'Line thickness 2-8' },
				curvature: { type: 'string', enum: ['straight', 'gentle', 'smooth'] },
				edgeType: { type: 'string', enum: ['square', 'round', 'bevel', 'miter'] },
				snapToStreets: { type: 'boolean' }
			},
			required: ['coordinates']
		}
	},
	{
		name: 'add_station',
		description: 'Place a station on the map at a specific location.',
		input_schema: {
			type: 'object',
			properties: {
				lat: { type: 'number' },
				lng: { type: 'number' },
				name: { type: 'string' },
				iconId: {
					type: 'string',
					enum: ['circle', 'square', 'diamond', 'interchange', 'terminal']
				}
			},
			required: ['lat', 'lng']
		}
	},
	{
		name: 'set_draw_style',
		description:
			'Set the current draw style for new lines (color, preset, thickness, corner rounding, edge type, street snapping).',
		input_schema: {
			type: 'object',
			properties: {
				color: { type: 'string' },
				styleId: {
					type: 'string',
					enum: ['boston', 'nyc', 'delhi', 'london', 'paris', 'tokyo', 'dc']
				},
				weight: { type: 'number' },
				curvature: { type: 'string', enum: ['straight', 'gentle', 'smooth'] },
				edgeType: { type: 'string', enum: ['square', 'round', 'bevel', 'miter'] },
				snapToStreets: { type: 'boolean', description: 'Snap new line vertices to OSM streets' }
			},
			required: []
		}
	},
	{
		name: 'enable_edit_line_mode',
		description: 'Turn on line editing mode — user can select lines, drag vertices, and extend lines.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'disable_edit_line_mode',
		description: 'Turn off line editing mode.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'select_line',
		description: 'Select a line by id for editing.',
		input_schema: {
			type: 'object',
			properties: {
				lineId: { type: 'string', description: 'Line feature id from project context' }
			},
			required: ['lineId']
		}
	},
	{
		name: 'set_line_rules',
		description:
			'Update rules for an existing line: corner rounding, edge style, street snapping, optional name.',
		input_schema: {
			type: 'object',
			properties: {
				lineId: { type: 'string' },
				name: { type: 'string' },
				curvature: { type: 'string', enum: ['straight', 'gentle', 'smooth'] },
				edgeType: { type: 'string', enum: ['square', 'round', 'bevel', 'miter'] },
				snapToStreets: { type: 'boolean' },
				color: { type: 'string' },
				weight: { type: 'number' }
			},
			required: ['lineId']
		}
	},
	{
		name: 'update_line',
		description: 'Replace all coordinates of an existing line.',
		input_schema: {
			type: 'object',
			properties: {
				lineId: { type: 'string' },
				coordinates: {
					type: 'array',
					items: { type: 'array', items: { type: 'number' } },
					description: 'Full [lng, lat] path, at least 2 points'
				}
			},
			required: ['lineId', 'coordinates']
		}
	},
	{
		name: 'extend_line',
		description: 'Add points to the start or end of an existing line.',
		input_schema: {
			type: 'object',
			properties: {
				lineId: { type: 'string' },
				end: { type: 'string', enum: ['start', 'end'] },
				coordinates: {
					type: 'array',
					items: { type: 'array', items: { type: 'number' } },
					description: 'New [lng, lat] points to prepend (start) or append (end)'
				}
			},
			required: ['lineId', 'end', 'coordinates']
		}
	},
	{
		name: 'simplify_map',
		description:
			'Regenerate schematic lines from geographic lines (45°/90° angles), fetch forest/river backgrounds, and switch to schematic view.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'set_view_mode',
		description: 'Switch between geographic OSM view and schematic view (white background with simplified features).',
		input_schema: {
			type: 'object',
			properties: {
				mode: { type: 'string', enum: ['geographic', 'schematic'] }
			},
			required: ['mode']
		}
	},
	{
		name: 'set_map_view',
		description: 'Pan and zoom the map. ALWAYS use this when user asks to zoom or go to a city.',
		input_schema: {
			type: 'object',
			properties: {
				lat: { type: 'number' },
				lng: { type: 'number' },
				zoom: { type: 'number', description: 'Zoom level 3–18' }
			},
			required: ['lat', 'lng', 'zoom']
		}
	},
	{
		name: 'set_map_source',
		description: 'Switch between OSM geographic base map or scratch mode (blank grid, schematic only).',
		input_schema: {
			type: 'object',
			properties: {
				source: { type: 'string', enum: ['osm', 'scratch'] }
			},
			required: ['source']
		}
	},
	{
		name: 'undo',
		description: 'Undo the last map change (like Ctrl+Z).',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'clear_lines',
		description: 'Remove all drawn transit lines from the map.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'clear_stations',
		description: 'Remove all stations from the map.',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'save_project',
		description: 'Save the current map to the project.',
		input_schema: { type: 'object', properties: {}, required: [] }
	}
] as const;

export const BUTTON_LABELS: Record<AgentActionName, string> = {
	enable_draw_mode: 'Draw a new line',
	disable_draw_mode: 'Stop drawing',
	enable_station_mode: 'Add station',
	disable_station_mode: 'Stop adding stations',
	draw_line: 'Draw line',
	add_station: 'Add station',
	set_draw_style: 'Line style',
	enable_edit_line_mode: 'Edit lines',
	disable_edit_line_mode: 'Stop editing',
	select_line: 'Select line',
	set_line_rules: 'Line rules',
	update_line: 'Update line',
	extend_line: 'Extend line',
	simplify_map: 'Simplify map',
	set_view_mode: 'View mode',
	set_map_view: 'Pan & zoom',
	set_map_source: 'Map base',
	undo: 'Undo',
	clear_lines: 'Clear lines',
	clear_stations: 'Clear stations',
	save_project: 'Save project'
};

export function parseAgentActions(toolUseBlocks: unknown[]): AgentAction[] {
	const actions: AgentAction[] = [];

	for (const block of toolUseBlocks) {
		if (
			block &&
			typeof block === 'object' &&
			'type' in block &&
			block.type === 'tool_use' &&
			'name' in block &&
			typeof block.name === 'string'
		) {
			actions.push({
				name: block.name as AgentActionName,
				input: ('input' in block && typeof block.input === 'object' && block.input
					? block.input
					: {}) as Record<string, unknown>
			});
		}
	}

	return actions;
}

/** Maps an agent action to a toolbar control id for highlight animation */
export function highlightIdForAction(action: AgentAction): string {
	switch (action.name) {
		case 'set_view_mode':
			return `set_view_mode_${action.input.mode ?? 'schematic'}`;
		case 'set_map_source':
			return `set_map_source_${action.input.source ?? 'osm'}`;
		case 'set_draw_style':
			return 'panel_style';
		case 'draw_line':
			return 'panel_style';
		case 'enable_draw_mode':
		case 'enable_station_mode':
		case 'enable_edit_line_mode':
			return 'panel_style';
		case 'select_line':
		case 'set_line_rules':
		case 'update_line':
		case 'extend_line':
			return 'panel_style';
		case 'add_station':
			return 'panel_style';
		case 'simplify_map':
			return 'panel_view';
		case 'set_map_view':
			return 'set_map_view';
		case 'save_project':
			return 'save_project';
		default:
			return action.name;
	}
}

export function actionSummary(action: AgentAction): string {
	const label = BUTTON_LABELS[action.name] ?? action.name;
	const extra: string[] = [];
	if (action.name === 'set_map_view') {
		extra.push(`${action.input.lat}, ${action.input.lng} z${action.input.zoom}`);
	} else if (action.name === 'draw_line') {
		const coords = action.input.coordinates as unknown[];
		if (Array.isArray(coords)) extra.push(`${coords.length} pts`);
	} else if (action.name === 'add_station' && action.input.name) {
		extra.push(String(action.input.name));
	} else if (action.name === 'set_view_mode') {
		extra.push(String(action.input.mode));
	} else if (action.name === 'set_map_source') {
		extra.push(String(action.input.source));
	} else if (action.name === 'select_line' && action.input.lineId) {
		extra.push(String(action.input.lineId));
	} else if (action.name === 'extend_line') {
		extra.push(String(action.input.end));
	}
	return extra.length ? `${label} (${extra.join(', ')})` : label;
}
