import { getExcelFile } from '../../files/GameFile.js';
import { AddMenuItem, InternalSharedMenuItem } from '../../files/graph/Dialog.js';
import { DICON_MAP, sentenceJoin } from '../../Shared.js';
import { textMap } from '../../TextMap.js';
import { NODE, TranscriptionNote } from '../../util/AbstractDialogueTree.js';
import { ActDialogueTree } from '../Dialogue.js';
import { BaseDialogueTask, BaseDialogueTaskEntry } from '../DialogueBase.js';
import { TriggerPerformance } from './Performance.js';
import { PredicateOutcome } from './Predicate.js';

export const MenuItemName = await getExcelFile<InternalSharedMenuItem>('MenuItemName.json', 'ID')

export class AddMenuItemTask extends BaseDialogueTask {
	declare type: 'RPG.GameCore.AddMenuItem'
	
	declare branches: [MenuItem]
	force_branches = true
	
	constructor(data: AddMenuItem) {
		super(data)
		this.branches = [new MenuItem(data, this)]
	}

	wikitext(): string | undefined {
		debugger
		if (process.argv.includes('--add-triggers')) {
			const dicon = this.branches[0].icon_type == 'ChatIcon' ? '{{Диалог}}' : `{{Диалог|${DICON_MAP[this.branches[0].icon_type]}}}`
			return `:<!--Add menu item: ${dicon} ${this.branches[0].menu_text} → ${this.branches[0].trigger_act}-->`
		}
	}
	
	equals(otherTask: BaseDialogueTask | BaseDialogueTaskEntry | TranscriptionNote): boolean {
		return otherTask instanceof AddMenuItemTask
			&& this.branches[0].equals(otherTask.branches[0])
	}
}

export class MenuItem extends BaseDialogueTaskEntry {
	$type: 'Custom.MenuItem' = 'Custom.MenuItem'

	custom_string = 'custom/npc_menu'
	id?: number

	icon_type: string
	menu_text: string

	constructor(data: AddMenuItem, public source: AddMenuItemTask) {
		super()
		this.icon_type = data.MenuIconType

		this.id = data.MenuItemID

		if (data.MenuItemTextID) {
			this.menu_text = textMap.getText(data.MenuItemTextID)
		} else if (data.MenuItemID && MenuItemName[data.MenuItemID]) {
			this.menu_text = textMap.getText(MenuItemName[data.MenuItemID].TextID)
		} else {
			this.menu_text = '{{tx}}'
		}

		if (data.DialoguePath) {
			this.trigger_act = data.DialoguePath
		} else if (data.PerformanceType && data.PerformanceID) {
			this.trigger_act = TriggerPerformance.getPerformanceData(data.PerformanceType, data.PerformanceID)?.PerformancePath
		}
	}
	
	async wikitext(_lines: number, tree: ActDialogueTree): Promise<string> {
		const sourceConditions = this.source[NODE] ? tree.getActiveConditionsAt(this.source[NODE]) : []
		const dicon = this.icon_type == 'ChatIcon' ? '{{Диалог}}' : `{{Диалог|${DICON_MAP[this.icon_type]}}}`
		
		let output = ''
		if (sourceConditions.length > 0) {
			output += ';(If '
			const condList: string[] = []
			for (const condition of sourceConditions) {
				const text = await PredicateOutcome.displayPredicate(condition.predicate, condition.inverse, tree.environment)
				if (text) condList.push(text)
			}
			output += sentenceJoin(condList, 'and') + ')\n'
		}
		output += `:${dicon} ${this.menu_text}`
		
		return output
	}

	equals(otherTask: BaseDialogueTask | BaseDialogueTaskEntry | TranscriptionNote): boolean {
		return otherTask instanceof MenuItem
			&& this.menu_text == otherTask.menu_text
			&& this.icon_type == otherTask.icon_type
			&& this.trigger_act == otherTask.trigger_act
	}
}

export class ShowMenuTask extends BaseDialogueTask {
	declare $type: 'RPG.GameCore.ShowMenu'
	
	trigger = 'custom/npc_menu'
	
	wikitext(_lines: number): string | undefined {
		// let isFirst = true
		// for (const menuItem of tree.environment.menu_items) {
		// 	output.push(((isFirst || lines <= 0) ? '' : ':'.repeat(lines - 1)) + await menuItem.wikitext(lines, tree))
		// 	isFirst = false
		// }
		// if (tree.environment.menu_items.length == 0) {
		// 	return ':{{tx}}<!--ShowMenu called, but no menu items have been registered-->'
		// }
		if (process.argv.includes('--add-triggers')) {
			return ':<!--Open NPC Menu-->'
		}
		return undefined
	}
}