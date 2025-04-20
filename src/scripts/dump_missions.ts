import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { ChangeHistory } from '../ChangeHistory.js'
import { Item } from '../Item.js'
import { Area } from '../maps/Area.js'
import { Mission } from '../Mission.js'
import { DICON_MAP, wikiTitle } from '../Shared.js'
import { TextMap, textMap } from '../TextMap.js'
import { uploadPrompt } from '../util/General.js'

const PAGE_FORMAT =
`{{Дополнить|Диалоги.}}
{{Миссия Инфобокс
|id              = <<ID>>
|Название        = <<NAME_PARAM>>
|Изображение     = <<IMAGE>>
|Тип             = <<TYPE>>
|События         = <<EVENT>>
|Глава           = <<CHAPTERTITLE>>
|Условия         = <<REQUIREMENTS>>
|Персонажи       = <<CHARACTERS>>
|СтартЛокация    = <<START_AREA>>
|Мир             = <<START_WORLD>>
|Локации         = <<START_AREA>>
|Предыдущая      = <<PREV>>
|Следующая       = <<NEXT>>
|Награды         = <<REWARDS>>
}}
'''<<NAME>>''' —<<TAN>> [[<<TYPEDISPLAY>>]]<<DETAILS>>.

==Описание==
{{Описание|<<SUMMARY>>}}

==Этапы==
<<STEPS>>

==Прохождение==
{{Дополнить}}

<<DIALOGUE>>

==На других языках==
<<OL>>

==История изменений==
{{История изменений|<<VERSION>>}}
`

function sanitize(str: string) {
	return str.replace(/[\/\<\>\:\"\\\|\?\*]/g, '')
}

if (existsSync('./output/missions/')) {
	// rmSync('./output/missions/', { recursive: true })
}
await Item.loadAll()

const only = process.argv
	.find(arg => arg.startsWith('--only='))
	?.replace('--only=', '')
	?.split(',')

const startTime = Date.now()
const allMissionData = Object.values(Mission.missionData)

for (const [i, missionData] of allMissionData.entries()) {
	if (only && !only.includes(missionData.MainMissionID.toString())) continue
	let missionStartTime = Date.now()
	
	const mission = new Mission(missionData)
	const title = wikiTitle(mission.name, 'Миссия', mission.id)
	
	let output = PAGE_FORMAT
		.replaceAll('<<TITLE>>', title)
		.replaceAll('<<NAME>>', mission.name)
		.replaceAll('<<NAME_PARAM>>', mission.name != title ? mission.name : '')
		.replaceAll('<<ID>>', mission.id.toString())
		.replaceAll('<<TAN>>', ((mission.type == 'Миссия приключения' || mission.event) ? '' : '') + (mission.event ? ' Событие' : ''))
		.replaceAll('<<TYPE>>', mission.type == 'Продолжение' ? 'Продолжение Освоения' : mission.type)
		.replaceAll('<<TYPEDISPLAY>>', mission.displayType)
		.replaceAll('<<CHAPTERTITLE>>', mission.getChapterName() || '')
		.replaceAll('<<SUMMARY>>', mission.description?.replaceAll('\n', '<br />') || "<!--официальное описание из Перекрёстка судеб-->")
		.replaceAll('<<NEXT>>', mission.getNext().map(mission => wikiTitle(mission?.name || '???', 'mission')).join(';'))
		.replaceAll('<<OL>>', await TextMap.generateOL(mission.name_hash))
		.replaceAll('<<VERSION>>', (await ChangeHistory.missions.findAdded(mission.id.toString()))[0] || '<!--unknown-->')
		.replaceAll('<<EVENT>>', mission.event?.name ?? '')
	
	const image = await mission.getImage()
	const imageName = `Миссия Освоения ${title.replaceAll(':', '')}.png`
	if (typeof(image) == 'string') {
		output = output.replaceAll('<<IMAGE>>', imageName + uploadPrompt(image, imageName, "Перекрёсток судеб"))
	} else if (!image) {
		output = output.replaceAll('<<IMAGE>>', `${imageName}`)
	} else {
		const stelleName = `Миссия Освоения ${title.replaceAll(':', '') } (Стелла).png`
		const caelusName = `Миссия Освоения ${title.replaceAll(':', '') } (Келус).png`
		output = output.replaceAll('<<IMAGE>>', 
			uploadPrompt(image.stelle, stelleName, "Перекрёсток судеб") 
			+ uploadPrompt(image.caelus, caelusName, "Перекрёсток судеб")
			+ `\n<gallery>\n${stelleName}|Стелла\n${caelusName}|Келус\n</gallery>`
		)
	}
	
	const requirements = mission.getRequirements()
	if (requirements.length > 1) {
		output = output.replaceAll('<<REQUIREMENTS>>', `\n* ${requirements.join('\n* ')}`)
	} else {
		output = output.replaceAll('<<REQUIREMENTS>>', requirements[0] || '')
	}
	output = output.replaceAll('<<PREV>>', wikiTitle(mission.prev?.name || ''))
	
	const steps = await mission.getSteps(true)
	const dialogueSections: string[] = []
	const stepList: string[] = []
	let lastName: string | undefined = undefined
	let lastDesc: string | undefined = undefined
	
	const addedMapDialogue = new Set<string | number>()
	
	for (const [i, step] of steps.entries()) {
		if (step.name && step.name != lastName) stepList.push(`# ${step.name}` + (process.argv.includes('--add-triggers') ? `{{subst:void|<!--${step.id} / ${step.order_reason}-->}}` : ''))
		const stepDialogue = await step.loadDialogue()
	
		const dialogueEntry: (string | undefined)[] = []
		
		if (step.name && step.name != lastName) {
			dialogueEntry.push(
				i > 0 ? '{{Диалог Конец}}\n' : undefined,
				`===${step.name}===`
			)
		} else if (process.argv.includes('--add-triggers')) {
			dialogueEntry.push(``)
		}
		
		if (step.description && step.description != lastDesc) {
			dialogueEntry.push(`{{Описание миссии|локация=${(await step.getFloor() ?? await step.getArea())?.name || '<!--необходимо добавить-->'}${i > 0 ? '' : ''}|${step.description.replaceAll('\n', '<br />')}}}`)
		}
		
		if (step.name && step.name != lastName) {
			dialogueEntry.push('{{Диалог Начало}}')
			if (process.argv.includes('--no-dialogue')) {
				dialogueEntry.push(':{{tx}}')
			}
		}
		
		if (!process.argv.includes('--no-dialogue')) {
			dialogueEntry.push(await stepDialogue?.wikitext())
		}

		// const groups = (await step.getGroups()).filter(group => group.act_path)
		const npcDialogueList = await step.getMapDialogue()
		for (const npcDialogue of [/*...groups, */...npcDialogueList]) {
			if (addedMapDialogue.has(npcDialogue.id)) continue
			
			const npcTree = (await npcDialogue.loadDialogue(stepDialogue?.environment ?? { main_mission_id: mission.id, sub_mission_id: step.id }))?.optimize()
			if (!npcTree) continue
			
			if ('source' in npcDialogue && !process.argv.includes('--no-dialogue')) {
				if (npcDialogue.source.type == 'npc') {
					dialogueEntry.push(`\n;(Поговорите с ${npcDialogue.source.name || npcDialogue.prompt})`)
				} else {
					dialogueEntry.push(`\n:{{Диалог|${DICON_MAP[npcDialogue.dicon]}}} ${npcDialogue.prompt}`)
				}
			}
			
			npcTree.environment.characters.forEach(chr => mission.charset.add(chr == '(Первопроходец)' ? 'Первопроходец' : chr))

			if (!process.argv.includes('--no-dialogue')) {
				dialogueEntry.push(await npcTree.wikitext())
			}
			
			if (process.argv.includes('--add-json')) {
				dialogueEntry.push('<pre>' + npcTree.toJSON() + '</pre>')
			}
			
			const unusedNpc = await npcTree.unusedWikitext()
			if (unusedNpc?.length && !process.argv.includes('--no-dialogue')) {
				dialogueEntry.push(unusedNpc.join('\n\n'))
			}

			if (!npcTree.environment.has_definite_conditional) {
				addedMapDialogue.add(npcDialogue.id)
			}
		}
		
		const unused = await stepDialogue?.unusedWikitext()
		if (unused?.length && !process.argv.includes('--no-dialogue')) {
			dialogueEntry.push(unused.join('\n\n'))
		}
		
		const result = dialogueEntry.filter(v => v != unused).join('\n')
		if (result.trim() != '') {
			dialogueSections.push(result)
		}
		
		lastName = step.name || lastName
		lastDesc = step.description || lastDesc
	}
	
	let details = ''
	
	let firstLocation: string | undefined = undefined
	let firstWorld: string | undefined = undefined
	for (const step of steps) {
		const area = await step.getFloor() || await step.getArea()
		if (area && area.name) {
			firstLocation = area.name
			firstWorld = textMap.getText(area instanceof Area ? area.world.WorldName : (await area.getArea()).world.WorldName)
			break
		}
	}
	if (mission.event) {
		details += ` из события [[${wikiTitle(mission.event.name)}]]`
	} else {
		if (firstWorld && (mission.type == 'Миссия приключения' || mission.type == 'Ежедневная миссия')) {
			details += ` в [[${firstWorld}]]`
		}

		if (mission.data.ChapterID) {
			details += ` в главе ${mission.getChapterLink()}`
		}
	}
	
	output = output
		.replaceAll('<<CHARACTERS>>', mission.characters.sort().join('; '))
		.replaceAll('<<START_AREA>>', firstLocation || '<!--стартовая локация-->')
		.replaceAll('<<START_WORLD>>', firstWorld || '<!--стартовый мир-->')
		.replaceAll('<<STEPS>>', stepList.join('\n'))
		.replaceAll('<<DIALOGUE>>', dialogueSections.join('\n') + '\n{{Диалог Конец}}')
		.replaceAll('<<DETAILS>>', details || '<!--в [мире]-->')
	
	const rewards = mission.getRewards()
	
	output = output
		.replaceAll('<<REWARDS>>', rewards.asCardListParams())

	console.log(`[${i+1}/${allMissionData.length}] Сгенерировал данные для миссии ${mission.id} "${mission.name}" (заняло ${Date.now() - missionStartTime} милисекунд)`)
	
	const path = `./output/missions/${mission.type}${mission.data.ChapterID ? `/${sanitize(mission.getChapterName()!.replace(/\.$/, '_'))}` : ''}/`
	mkdirSync(path, { recursive: true })
	writeFileSync(`${path}/${sanitize(mission.name)}-${mission.id}.wikitext`, output)
}

console.log(`Готово! Сгенерировал ${Object.keys(Mission.missionData).length} страниц миссий за ${Math.floor((Date.now() - startTime) / 1000)} секунд`)