import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { ChangeHistory } from '../ChangeHistory.js';
import { Item } from '../Item.js';
import { sanitizeString, wikiTitle } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { uploadPrompt } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

if (existsSync('./output/consumables')) {
	rmSync('./output/consumables/', { recursive: true })
}

const SHOP_KEYWORDS: string[] = [
	'exchange', 'shop', 'store', 'stall', 'vend', 'stand',
	'parcel', 'truck', 'depot', 'diner', 'trolley', 'teahouse',
	'nutritreasures', 'anderson', 'sleepless earl'
]
const SHOP_KEYWORD_MATCH = new RegExp(`(?:[^\\w]|^)(${SHOP_KEYWORDS.join('|')})(?:[^\\w]|$)`, 'i')
const sourceEntryLinkOverride = ['Omni-Synthesizer', 'Assignment', 'Simulated Universe']

const groupMap = {
	2000: 'Расходные предметы HP',
	2001: 'Расходные предметы энергии',
	2003: 'Расходные предметы силы атаки',
	2006: 'Расходные предметы защиты',
	2009: 'Расходные предметы'
}

for (const itemData of Object.values(await Item.itemData.main.get())) {
	if (itemData.ItemSubType != 'Food') continue

	const item = new Item(itemData)

	const output: string[] = []

	// const types = await item.getTypes()

	output.push(
		'<%-- [PAGE_INFO]',
		`PageTitle=#${item.pagetitle}#`,
		'[END_PAGE_INFO] --%>'
	)

	const infobox = new Template('Расходный предмет Инфобокс')

	if (item.name != item.pagetitle) {
		infobox.addParam('Название', item.name)
	}

	const recipe = await item.getRecipe()
	const img = await item.getImage()

	infobox
		.addParam('id', item.id)
		.addParam('Изображения', img + uploadPrompt(item.icon_path, img, 'Изображения расходных предметов'))
		.addParam('Тип', groupMap[item.group_id!])
		.addParam('Редкость', item.rarity)
		.addParam('Эффект', item.effect.replaceAll('\n', '<br />'))
		.addParam('Описание', item.desc.replaceAll('\n', '<br />'))
		.addParam('Рецепт', recipe ? `{{cx|Отсутствует источник}}` : '')
		.addParam('Источник1', '')
		.addParam('Источник2', '')
		.addParam('Источник3', '')

	const sources = await item.getSources()
	for (const [i, source] of sources.entries()) {
		const override = sourceEntryLinkOverride.find(link => source.includes(link))
		infobox.addParam(`Источник${i + 1}`, override ? source.replaceAll(override, `[[${override}]]`) : '[[' + source + ']]')
	}

	output.push(infobox.block())

	if (item.bg_desc) {
		output.push(`{{Описание|${item.bg_desc.includes('=') ? '1=' : ''}${item.bg_desc.replaceAll('\n', '<br />')}}}`)
	}
	
	output.push(`'''${item.name}''' — [[расходный предмет]], который игрок может ${recipe ? 'создать' : 'использовать'}.`)

	if (sources.find(src => SHOP_KEYWORD_MATCH.test(src) && !src.includes('Создание'))) {
		output.push(`\n<!--==Локация==\n{{Отметка карты|<!--название карты-->|<!--id отметки-->}}-->`)
	}
	
	if (recipe) {
		const recipeTemplate = new Template('Рецепт')
		
		recipeTemplate
			.addParam('Тип', 'Синтез')
			.addParam('Группа', 'Расходные предметы')
		
		recipe.data.forEach(({ item, count }) => recipeTemplate.addParam(wikiTitle(item.name, 'item'), count))
		
		recipeTemplate.addParam('Сортировка', recipe.data.map(entry => wikiTitle(entry.item.name, 'item')).join(';'))
		
		output.push(
			'\n==Рецепт==',
			recipeTemplate.block()
		)
	}

	// if (sources.find(src => src.match(/enem(?:y|ies)/i) || src.match(/equilibrium level/i))) {
	// 	output.push(`\n==Dropped By==\n{{Dropped By}}`)
	// }

	output.push(
		'\n==На других языках==',
		await TextMap.generateOL(item.name_hash),
	)

	const [releaseVersion] = await ChangeHistory.item.main.findAdded(item.id.toString())
	output.push(
		'\n==История изменений==',
		`{{История изменений|${releaseVersion ?? `<!--unknown-->`}}}`,
		
		'\n==Навигация==',
		'{{Расходные предметы Навбокс}}',
		'',
		'[[en:]]'
	)

	mkdirSync(`./output/consumables/`, { recursive: true })
	writeFileSync(`./output/consumables/${sanitizeString(item.name)}-${item.id}.wikitext`, output.join('\n'))
}

teardown()