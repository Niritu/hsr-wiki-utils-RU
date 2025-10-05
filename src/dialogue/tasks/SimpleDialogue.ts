import { PlayAndWaitSimpleTalk, PlayMultiVoiceTalk, PlayOptionTalk, TalkOptionSimple } from '../../files/graph/Dialog.js';
import { DICON_MAP } from '../../Shared.js';
import { TalkSentenceMultiVoice, textMap } from '../../TextMap.js';
import { TranscriptionNote } from '../../util/AbstractDialogueTree.js';
import { ActDialogueTree } from '../Dialogue.js';
import { BaseDialogueTask, BaseDialogueTaskEntry, TalkSentenceTaskEntry } from '../DialogueBase.js';
import { GraphEnvironment } from '../Environment.js';

export class SimpleTalkTask extends BaseDialogueTask {
	declare $type: 'RPG.GameCore.PlayAndWaitSimpleTalk' | 'RPG.GameCore.PlaySimpleTalk' | 'RPG.GameCore.PlayMissionTalk'
	entries?: TalkSentenceTaskEntry[]
	black_screen?: boolean

	constructor(data: PlayAndWaitSimpleTalk, env: GraphEnvironment) {
		super(data)
		this.entries = data.SimpleTalkList.map(sent => new TalkSentenceTaskEntry(sent, env))
		this.black_screen = data.BlackMask
	}

	wikitext(): undefined | string {
		if (this.black_screen) {
			return `;(Screen fades to black)`
		}
	}
}

export class OptionTalkTask extends BaseDialogueTask {
	declare $type: 'RPG.GameCore.PlayOptionTalk'
	branches: OptionTalkTaskEntry[]

	constructor(data: PlayOptionTalk, env: GraphEnvironment) {
		super(data)
		
		let onlyOneTrigger = true
		let lastTrigger = data.OptionList[0]?.TriggerCustomString
		for (const opt of data.OptionList) {
			if (opt.TriggerCustomString != lastTrigger) {
				onlyOneTrigger = false
				break
			}
		}
		
		if (onlyOneTrigger && lastTrigger) {
			this.trigger = lastTrigger
		}
		this.branches = data.OptionList.map(option => new OptionTalkTaskEntry(option, env, onlyOneTrigger))
	}

	equals(otherTask: BaseDialogueTask | BaseDialogueTaskEntry | TranscriptionNote): boolean {
		return otherTask instanceof OptionTalkTask
			&& this.branches.length == otherTask.branches.length
			&& !this.branches.find((opt1, i) => !opt1.equals(otherTask.branches[i]))
	}

	wikitext(): undefined {
		return undefined
	}
}

export class OptionTalkTaskEntry extends TalkSentenceTaskEntry {
	option_text?: string
	icon_type: keyof typeof DICON_MAP
	
	constructor(data: TalkOptionSimple, env: GraphEnvironment, noTrigger?: boolean) {
		super(data, env)
		if (!noTrigger) {
			this.trigger = data.TriggerCustomString
		}
		this.icon_type = data.OptionIconType as keyof typeof DICON_MAP
	}
	
	wikitext(): string {
		const dicon = this.icon_type == 'ChatIcon' ? '{{Диалог}}' : `{{Диалог|${DICON_MAP[this.icon_type]}}}`
		return `:${dicon} ${this.option_text || textMap.getSentence(this.sentence_id, true, false, false)}`
	}
}

export class PlayMultiVoiceTask extends BaseDialogueTask {
	declare $type: 'RPG.GameCore.PlayMultiVoiceTalk'
	
	sentence_id: number
	
	constructor(data: PlayMultiVoiceTalk) {
		super(data)
		this.sentence_id = data.TalkSentenceID
	}
	
	wikitext(lines: number, tree: ActDialogueTree): string | undefined | Promise<string | undefined> {
		tree.environment.voice_ids.push(...TalkSentenceMultiVoice[this.sentence_id].VoiceIDList)
		return ':' + textMap.getSentence(this.sentence_id, false, false, false)
	}
}