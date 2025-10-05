import { mkdir, writeFile } from 'fs/promises';
import { PlaneType } from '../files/graph/MapData.js';
import { Area } from '../maps/Area.js';
import { sanitizeString } from '../Shared.js';
import { TextMap, textMap } from '../TextMap.js';
import { pageInfoHeader } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

const MAP_PLANE_TYPES: PlaneType[] = ['Maze', 'Town', 'Train']

const areas = await Area.loadAll()
for (const area of areas) {
	if (!MAP_PLANE_TYPES.includes(area.type)) continue
	const world = textMap.getText(area.world.WorldName)
	const floors = await area.getFloors()
	for (const floor of floors) {
		console.group('area =', area.name, '| floor =', floor.name, '| id = ', floor.floor_id)
		for (const group of await floor.loadNonMissionGroups()) {
			for (const npc of group.npcs) {
				if (!npc.name) continue
				
				const output = [
					pageInfoHeader(npc.name),
					'{{Meta',
					'<!--Remove this template after adding the missing info.-->',
					'|missing_NPC_picture  = yes',
					'|missing_NPC_profile  = yes',
					'|missing_NPC_location = yes',
					'|missing_NPC_dialogue = yes',
					'}}',
					'{{Stub}}',
					new Template('Character Infobox', {
						title: npc.title || '',
						image: `NPC ${npc.name}.png`,
						type: 'NPC',
						realname: '',
						species: '',
						deceased: '',
						pathlore: '',
						pathNote: '',
						pathRef: '',
						faction: '',
						factionNote: '',
						factionRef: '',
						world: world,
						location: floor.name,
						relatives: ''
					}).block(15),
					`'''${npc.name}''' is an NPC on [[${world}]], located in [[${floor.name}]].`,
					'',
					'==Profile==',
					"''(To be added.)''",
					'',
					'==Location==',
					`{{Map Embed|${floor.name}|npc_${group.id}_${npc.object_id}}}`,
					'<!--',
					'==Missions and Events==',
					'{{Missions and Events}}',
					'--><!--',
					'==Character Mentions==',
					'{{Character Mentions}}',
					'-->',
				]
				
				if (npc.dialogue.length > 0) {
					output.push('==Dialogue==', '{{Dialogue Start}}')
					for (const dialogue of npc.dialogue) {
						if (dialogue.conditions.length > 0) {
							output.push(`<pre>\n${JSON.stringify(dialogue.conditions, null, '\t')}\n</pre>`)
						}
						
						const tree = await dialogue.loadDialogue()
						if (tree) {
							tree.optimize()
							output.push((await tree.wikitext()).trim())
						} else {
							output.push(':{{tx}}')
						}
						
						const unused = await tree?.unusedWikitext()
						if (unused?.length) {
							output.push(...unused)
						}
					}
					
					output.push('{{Dialogue End}}')
				}
				
				output.push('<!--', '==Trivia==', '* ', '-->')
				
				output.push('==Other Languages==', await TextMap.generateOL(npc.name_hash))
				
				output.push('==Change History==', '{{Change History|TODO}}')
				
				const dir = `./output/npcs/${sanitizeString(world || 'unknown')}/${sanitizeString(area.name || 'Story')}-${area.plane_id}/${sanitizeString(floor.name)}-${floor.floor_id}`
				await mkdir(dir, { recursive: true })
				await writeFile(`${dir}/${sanitizeString(npc.name)}-${group.id}-${npc.object_id}.wikitext`, output.join('\n'))
				
			}
		}
		console.groupEnd()
	}
}

teardown()