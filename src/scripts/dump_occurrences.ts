import { mkdir, writeFile } from 'fs/promises';
import { BlessingGroup } from '../Blessing.js';
import { ChangeHistory } from '../ChangeHistory.js';
import { Item } from '../Item.js';
import { displaySUMode, OccurrenceDialogueTree, OccurrenceOptionTreeEntry, OccurrenceSeries, RogueImage } from '../Occurrence.js';
import { sanitizeString, wikiTitle, zeroPad } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { pageInfoHeader } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

await mkdir('./output/occurrences/', { recursive: true })
await Item.loadFrom('main')
BlessingGroup.loadAll()

const IMAGE_ID_MAP = {
	101: 'Событие ВВ По умолчанию.png',
	102: 'Событие ВВ Фикциологи истории.png',
	103: 'Событие ВВ Пиксельный мир.png',
	104: 'Событие ВВ Неорганическая форма жизни.png',
	105: 'Событие ВВ КММ.png',
	106: 'Событие ВВ Жуань Мэй.png',
	107: 'Событие ВВ Свинки-копилки.png',
	108: 'Событие ВВ Торговец.png',
	109: 'Событие ВВ Близнецы.png',
	110: 'Событие ВВ Битва.png',
	111: 'Событие ВВ Сделка.png',
	112: 'Событие ВВ Рыцари Красоты.png',
	113: 'Событие ВВ Космические жуки.png',
	114: 'Событие ВВ Стая.png',
	115: 'Событие ВВ Рой.png',
	116: 'Событие ВВ Жуань Мэй 2.png',
	117: 'Событие ВВ Юй Цинту.png',
	118: 'Событие ВВ Гильдия эрудитов.png',
	119: 'Событие ВВ Общество гениев.png',
	120: 'Событие ВВ Механия.png',
	121: 'Событие ВВ Гадание.png',
	122: 'Событие ВВ Империя машин.png',
	123: 'Событие ВВ Опасная кормёжка.png',
	124: 'Событие ВВ Вернувшаяся хелиоби.png',
	125: 'Событие ВВ Мусорка.png',
	126: 'Событие ВВ Троичная война.png',
	127: 'Событие ВВ Жуань Мэй 3.png',
	128: 'Событие ВВ Состязание.png',
	129: 'Событие ВВ Подарок.png',
	130: 'Событие ВВ Мусорная симфония.png',
	131: 'Событие ВВ Обезьяна.png',
	132: 'Событие ВВ Церемония.png',
	133: 'Событие ВВ Форсаж.png',
	134: 'Событие ВВ Инкубатор.png',
	135: 'Событие ВВ Ремонтник.png',
	136: 'Событие ВВ Корабль дураков.png',
	137: 'Событие ВВ Храм молчания.png',
	138: 'Событие ВВ Хакеры и матросы.png',
	139: 'Событие ВВ Волна вдохновения.png',
	140: 'Событие ВВ Жизнь как пища.png',
	141: 'Событие ВВ Очередь на молитву.png',
	142: 'Событие ВВ Бормочущий.png',
	143: 'Событие ВВ Прогнившая сделка.png',
	144: 'Событие ВВ Долос.png',
}

for (const occurrence of Object.values(await OccurrenceSeries.loadAllAbstract())) {
	const firstOccurrence = occurrence.active_occurrences.find(occ => occ.mode != 'рв') ?? occurrence.active_occurrences[0]
	if (!firstOccurrence) {
		console.warn(`Skipping ${occurrence.id}, no active Occurrences`)
		continue
	}
	
	let duOccurrence = occurrence.occurrences.find(occ => occ.mode == 'рв')
	
	const infobox = new Template('ВВ Событие Инфобокс')
		.addParam('id', occurrence.id)
		.addParam('Название', firstOccurrence.name != wikiTitle(firstOccurrence.name) ? firstOccurrence.name : '')
		.addParam('Изображение', IMAGE_ID_MAP[firstOccurrence.image_id] ?? `<!--TBA: ${RogueImage[firstOccurrence.image_id]?.ImagePath}-->`)
		.addParam('Испытание_в_вв', occurrence.modes.includes('вв') ? 'Неизвестно' : '')
		// .addParam('domains_ext', '')
		.addParam('Испытание_в_рое', occurrence.modes.includes('рой') ? 'Неизвестно' : '')
		.addParam('Испытание_в_зиш', occurrence.modes.includes('зиш') ? 'Неизвестно' : '')
		.addParam('Испытание_в_рв', occurrence.modes.includes('рв') ? 'Неизвестно' : '')
		.addParam('Испытание_в_облнеп', occurrence.modes.includes('облнеп') ? 'Неизвестно' : '')
		.addParam('Требования', '')
		.addParam('Пред', '')
		.addParam('След', '')
		.addParam('Упоминания', '')
		.addParam('Порядок', firstOccurrence.order ? zeroPad(firstOccurrence.order, 3) : '')
		.addParam('Порядок_рв', duOccurrence?.order_du ? zeroPad(duOccurrence.order_du, 3) : '')
		
	const output: string[] = [
		pageInfoHeader(wikiTitle(firstOccurrence.name)),
		'{{Дополнить}}',
		infobox.block(13),
		`'''${firstOccurrence.name}''' — [[${occurrence.modes.includes('рв') ? 'Расходящаяся' : 'Виртуальная'} вселенная/События|событие]] в ${displaySUMode(occurrence.active_modes[0], true)}${occurrence.active_modes.length > 1 && occurrence.modes.includes('рв') ? ' и [[Расходящаяся вселенная|Расходящейся вселенной]]' : ''}.`,
		'',
		'==Возможные исходы==',
		'{{Возможные исходы'
	]

	const dialogueMap: Record<string, OccurrenceDialogueTree> = {}
	const allOptions: OccurrenceOptionTreeEntry[][] = []
	for (const occurrenceVariant of occurrence.active_occurrences) {
		if (dialogueMap[occurrenceVariant.mode]) {
			console.warn(`Multiple ${occurrenceVariant.mode} Occurrences found for ${occurrence.id}, ${occurrenceVariant.name}`)
		}
		
		const dialogue = dialogueMap[occurrenceVariant.mode] = await occurrenceVariant.loadDialogue()!
		dialogue.optimize()
		allOptions.push(dialogue.getOptionTree())
	}
	
	const mergedOptions = OccurrenceDialogueTree.mergeOptionTrees(allOptions, occurrence.active_modes)
	
	function addOptions(opts: OccurrenceOptionTreeEntry[], prefix: string = '') {
		for (let [i, option] of opts.entries()) {
			i += 1
			if (option.choice) {
				output.push(`|Выбор${prefix}_${i} = ${option.choice}`)
			}
			if (option.chance) {
				output.push(`|Шанс${prefix}_${i} = ${option.chance}`)
			}
			if (option.result && !option.children?.length) {
				output.push(`|Результат${prefix}_${i} = ${option.result}`)
			}
			if (option.path) {
				output.push(`|Путь${prefix}_${i}   = ${option.path}`)
			}
			if (option.modes?.length) {
				output.push(`|Режимы${prefix}_${i}  = ${option.modes.sort().join(',')}`)
			}
			if (option.children?.length) {
				output.push('')
				addOptions(option.children, `${prefix}_${i}`)
			}
			if (i != opts.length) {
				output.push('')
			}
		}
	}
	
	addOptions(mergedOptions)
	
	output.push(
		'}}',
		'',
		'==Диалог==',
		'{{Диалог Начало}}',
	)
	
	if (occurrence.active_occurrences.length == 1) {
		const dialogue = dialogueMap[firstOccurrence.mode]
		
		output.push(
			(await dialogue?.wikitext()) || '',
		)
		const unused = (await dialogue?.unusedWikitext())?.join('\n\n')
		if (unused) {
			output.push('', unused)
		}
	} else {
		output.push(':{{tx}}')
	}
	
	output.push(
		'{{Диалог Конец}}',
		'',
		'==На других языках==',
		await TextMap.generateOL(firstOccurrence.name_hash),
		'',
		'==История изменений==',
		`{{История изменений|${(await ChangeHistory.occurrences.findAdded(firstOccurrence.series.id))[0]}}}`,
		'',
		'==Навигация==',
		'{{События ВВ Навбокс}}',
		'',
		'[[en:]]'
	)
	
	const container = `./output/occurrences/${sanitizeString(firstOccurrence.name)}-${occurrence.id}`
	await mkdir(container, { recursive: true })
	
	await writeFile(`${container}/${sanitizeString(firstOccurrence.name)}-${occurrence.id}.wikitext`, output.join('\n'))
	
	for (const occurrenceVariant of occurrence.occurrences) {
		const dialogue = dialogueMap[occurrenceVariant.mode] ?? (await occurrenceVariant.loadDialogue())?.optimize()
		
		const voutput: string[] = []
		voutput.push(
			'{{Диалог Начало}}',
			(await dialogue?.wikitext()) || '',
		)
		
		const unused = (await dialogue?.unusedWikitext())?.join('\n\n')
		if (unused) {
			voutput.push('', unused)
		}
		
		voutput.push(
			// '<nowiki>\n' + dialogue?.toJSON() + '\n</nowiki>',
			'{{Диалог Конец}}'
		)
		await writeFile(`${container}/${occurrenceVariant.mode}-${sanitizeString(occurrenceVariant.name)}${occurrenceVariant.progress ? '-' + occurrenceVariant.progress : ''}.wikitext`, voutput.join('\n'))
	}
}

teardown()