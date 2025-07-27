import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { ChangeHistory } from '../ChangeHistory.js';
import { Item } from '../Item.js';
import { RelicSet } from '../Relics.js';
import { sanitizeString, wikiTitle } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { pageInfoHeader, uploadPrompt } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

const PARAM_KEYS = {
	HEAD: 'Голова',
	HAND: 'Руки',
	BODY: 'Тело',
	FOOT: 'Ноги',
	OBJECT: 'Вязь',
	NECK: 'Сфера'
} as const
const SETPARAM_VALUES = {
	HEAD: 'Голова',
	HAND: 'Руки',
	BODY: 'Тело',
	FOOT: 'Ноги',
	OBJECT: 'Соединительная вязь',
	NECK: 'Планарная сфера'
} as const

if (existsSync('./output/relics')) {
	await rm('./output/relics', { recursive: true })
}

await Item.loadFrom('main', 'relics')

for (const relicSet of RelicSet.loadAll()) {
	const setTitle = wikiTitle(relicSet.name, 'item', relicSet.display_item_id)
	
	const setInfobox = new Template('Набор Реликвий Инфобокс', {
		id: relicSet.display_item_id,
		Изображение: `Предмет ${sanitizeString(setTitle)}.png` + uploadPrompt(relicSet.icon_path, `Предмет ${sanitizeString(setTitle)}.png`, 'Иконки реликвий'),
		Тип: relicSet.is_planar ? 'Планарное украшение' : 'Пещерная реликвия',
		'2пБонус': relicSet.bonus2pc,
	})
	
	if (relicSet.bonus4pc) {
		setInfobox.addParam('4пБонус', relicSet.bonus4pc)
	}

	const setFolder = `${sanitizeString(setTitle)}-${relicSet.id}`
	await mkdir(`./output/relics/${setFolder}`, { recursive: true })
	
	const relics = relicSet.getSetMembers()
	
	for (const relic of relics) {
		const relicTitle = wikiTitle(relic.name, 'item', relic.id)
		setInfobox.addParam(PARAM_KEYS[relic.slot], relicTitle)
		
		const relicInfobox = new Template('Реликвия Инфобокс', {
			id: relic.id,
			Изображение: `Предмет ${sanitizeString(relicTitle)}.png` + uploadPrompt(relic.icon_path, `Предмет ${sanitizeString(relicTitle)}.png`, 'Иконки реликвий'),
			Набор: setTitle,
			Предмет: SETPARAM_VALUES[relic.slot] as any,
			Упоминания: ''
		})
		
		const relicOutput: string[] = [
			pageInfoHeader(relicTitle),
			relicInfobox.block(9),
			`{{Описание|${relic.story_intro.trim().replaceAll('\n', '<br />')}}}`,
			`'''${relic.name}''' — [[реликвия]] набора ${setTitle == relicSet.name ? `[[${setTitle}]]` : `[[${setTitle}|${relicSet.name}]]`}.`,
			'\n==Описание==',
			relic.story.trim().replaceAll(/(?<!\n)\n(?!\n)/g, '<br />'),
			'\n==На других языках==',
			await TextMap.generateOL(relic.name_hash),
			'\n==История изменений==',
			`{{История изменений|${(await ChangeHistory.item.relics.findAdded(relic.id))?.[0] ?? '<!--unknown-->'}}}`,
			'\n==Навигация==',
			`{{Набор Реликвий Навбокс|${setTitle}}}`,
			'',
			'[[en:]]'
		]
		
		await writeFile(`./output/relics/${setFolder}/${relic.name}-${relic.slot}.wikitext`, relicOutput.join('\n'))
	}
	
	const source = (await relicSet.display_item?.getSources())?.filter(src => src != 'Синтез реликвий')?.[0] ?? '{{cx|Source missing}}' // TODO: make it not suck
	
	setInfobox
		.addParam('Редкость', '2345')
		.addParam('Источник2.1', `[[${source}]]`)
		.addParam('Источник3.1', `[[${source}]]`)
		.addParam('Источник4.1', `[[${source}]]`)
		.addParam('Источник5.1', `[[${source}]]`)
		.addParam('Источник5.2', '[[Синтез реликвий]]')
		.addParam('Свойство1', '')
		.addParam('Свойство2', '')
		.addParam('Свойство3', '')
	
	const setOutput: string[] = [
		pageInfoHeader(setTitle),
		setInfobox.block(12),
		`'''${relicSet.name}''' — набор ${relicSet.is_planar ? '[[Реликвии|Реликвий]] [[:Категория:Планарные украшения|планарных украшений]]' : 'пещерных [[Реликвии|Реликвий]]'}, который можно получить за прохождение [[${source}]] в 2-5{{Иконка/Звёзды|1}} редкостях.`,
		'\n==Лор==',
		`{{Реликвия Лор|${relicSet.name}}}`,
		'\n==На других языках==',
		await TextMap.generateOL(relicSet.name_hash),
		'\n==История изменений==',
		`{{История изменений|${(await ChangeHistory.item.main.findAdded(relicSet.display_item_id))?.[0] ?? '<!--unknown-->'}}}`,
		'\n==Навигация==',
		'{{Наборы реликвий Навбокс}}',
		'',
		'[[en:]]'
	]
	
	await writeFile(`./output/relics/${setFolder}/${setFolder}.wikitext`, setOutput.join('\n'))
}

teardown()