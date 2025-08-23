import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { ChangeHistory } from '../ChangeHistory.js';
import { Item } from '../Item.js';
import { n, sanitizeString } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { ItemMainType, ItemSubType } from '../files/Item.js';
import { uploadPrompt } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

rmSync('./output/items/', { recursive: true })
await Item.loadAll()

const SKIP_TYPES: (ItemSubType | ItemMainType)[] = [
	'AetherSpirit', 'AvatarCard', 'Book', 'Formula',
	'Food', 'Relic', 'RelicRarityShowOnly', 'RelicSetShowOnly',
	'Equipment'
]
const SHOP_KEYWORDS: string[] = [
	'exchange', 'shop', 'store', 'stall', 'vend', 'stand', 
	'parcel', 'truck', 'depot', 'diner', 'trolley', 'teahouse', 
	'nutritreasures', 'anderson', 'sleepless earl'
]
const sourceEntryLinkOverride = [
	'Omni-Synthesizer', 'Assignment', 'Simulated Universe',
	'Nameless Honor', 'Cosmodyssey', 'An Unexpected Turn of Events', 'Fable of the Stars',
	'Golden Capsule Machine', 'Diting', 'When the Stars of Ingenuity Shine', 'Requiem Mass',
	'Vignettes in a Cup'
]

const typeLinkOverride = {
	'Dreamscape Pass Sticker': '[[Dreamscape Pass]] Sticker'
}

const SINGLE_TYPE = {
	profile_pics: true,
	eidolons: true,
}

for (const [source, data] of Object.entries(Item.itemData)) {
	if (source == 'character_default_pfps') continue
	
	for (const itemData of Object.values(data.data!)) {
		if (!itemData || SKIP_TYPES.includes(itemData.ItemMainType) || SKIP_TYPES.includes(itemData.ItemSubType)) continue
		
		const item = new Item(itemData)
		
		const output: string[] = []
		
		const types = await item.getTypes()
		
		output.push(
			'<%-- [PAGE_INFO]',
			`PageTitle=#${item.pagetitle}#`,
			'[END_PAGE_INFO] --%>'
		)
		
		if (types.includes('Записи')) {
			output.push('{{Дополнить}}')
		}
		
		const infobox = new Template('Предмет Инфобокс')
		
		if (item.name != item.pagetitle) {
			infobox.addParam('Название', item.name)
		}
		
		const img = await item.getImage()
		
		infobox
			.addParam('id', item.id)
			.addParam('Изображение', img + uploadPrompt(item.icon_path, img, 'Item Icons'))
			.addParam('Тип', types[0] || '')
		
		for (const [i, type] of types.entries()) {
			if (i == 0) continue
			infobox.addParam(`Тип${i + 1}`, type)
		}

		infobox
			.addParam('Инвентарь', item.inventory_tab || '')
			.addParam('Редкость', item.rarity)
			.addParam('Эффект', item.effect.replaceAll('\n', '<br />'))
			.addParam('Описание', item.desc.replaceAll('\n', '<br />'))

		const sources = await item.getSources()
		for (const [i, source] of sources.entries()) {
			const override = sourceEntryLinkOverride.find(link => source.includes(link))
			infobox.addParam(`Источник${i + 1}`, override ? source.replaceAll(override, `[[${override}]]`) : '[[' + source + ']]')
		}
		
		output.push(infobox.block())
		
		if (item.bg_desc) {
			output.push(`{{Описание|${item.bg_desc.includes('=') ? '1=' : ''}${item.bg_desc.replaceAll('\n', '<br />')}}}`)
		}
		
		switch (item.purpose_id) {
			case 2:
				const forType = item.desc.match(/Ascension of (\w+) characters/)?.[1]
				output.push(`'''${item.name}''' — ${item.rarity}-звёздочный материал для возвышения уровня [[Персонажи|персонажей]] {{${forType}|}} типа.`)
				break
				
			case 3:
				output.push(`'''${item.name}''' — ${item.rarity}-звёздочный материал для возвышения уровня [[Следы|Следов]] и [[Световые конусы|Световых конусов]].`)
				break
			
			case 7:
				output.push(`'''${item.name}''' — ${item.rarity}-звёздочный материал для возвышения уровня [[Следы|Следов]], [[Световые конусы|Световых конусов]] или [[Персонажи|персонажей]].`)
				break
			
			case 17:
				output.push(`'''${item.name}''' — ${item.rarity}-звёздочный [[Материалы для синтеза|материал для синтеза]].`)
				break
			
			case 20:
				output.push(`'''${item.name}''' — запись для [[Фонограф]]а, открывающая соответствующий трек для проигрывания в [[Общий вагон|Общем вагоне]] и [[Вагон для вечеринок|вагоне для вечеринок]].`)
				break
			
			default:
				const firstType = types[0] || (source == 'profile_pics' ? 'Аватар' : 'Предмет')
				output.push(`'''${item.name}''' —${n(firstType)} ${typeLinkOverride[firstType] || `[[${firstType}]]`}.`)
				break
		}
		
		if (sources.find(src => SHOP_KEYWORDS.find(keyword => src.toLowerCase().includes(keyword) && !src.includes('Синтез')))) {
			output.push(`\n==Приобретение==\n{{Наличие в магазинах}}`)
		}
		
		if (sources.find(src => src.match(/enem(?:y|ies)/i) || src.match(/equilibrium level/i))) {
			output.push(`\n==Dropped By==\n{{Dropped By}}`)
		}
		
		if (types.find(type => type.includes('Ascension'))) {
			output.push(`\n==Ascension Usage==\n{{Ascension Usage}}`)
		}

		if (types.find(type => type.includes('Trace'))) {
			output.push(`\n==Trace Usage==\n{{Trace Usage}}`)
		}
		
		if (types.includes('Материал для синтеза')) {
			output.push(`\n==Применение==\n{{Используется в создании}}`)
		}
		
		let readableData = item.getText()
		if (readableData) {
			output.push(
				`\n==Текст==`,
				`<div align="center">{{Цвет|Ключевой|${readableData.title}}}</div>`
			)
			if (readableData.content) {
				output.push(
					readableData.content
						.replaceAll(/{{Цвет\|(\w+)\|/gi, '{{Цвет|$1|nobold=1|')
						.replaceAll('\n', '<br />')
						.replaceAll('<br /><br />', '\n\n')
				)
			}
			if (readableData.image_path) {
				let filename = `Предмет ${sanitizeString(item.name)}.png`
				output.push(`[[Файл:${filename}|185px]]${uploadPrompt(readableData.image_path, filename, 'Изображения предметов')}`)
			}
		}
		
		output.push(
			'\n==На других языках==',
			await TextMap.generateOL(item.name_hash),
		)
		
		const [releaseVersion] = await ChangeHistory.item[source as keyof typeof ChangeHistory.item].findAdded(item.id.toString())
		output.push(
			'\n==История изменений==',
			`{{История изменений|${releaseVersion ?? `<!--unknown-->`}}}`
		)

		switch (item.inventory_tab) {
			case 'Расходные предметы':
				output.push(`\n==Навигация==\n{{Расходные предметы Навбокс}}`,
				'',
				'[[en:]]')
				break
			
			case 'Другие материалы':
				output.push(`\n==Навигация==\n{{Материалы синтеза Навбокс}}`,
				'',
				'[[en:]]')
				break
			
			case 'Материалы улучшения':
				output.push(`\n==Навигация==\n{{Материалы улучшения Навбокс}}`,
				'',
				'[[en:]]')
				break
		}

		mkdirSync(`./output/items/${source}/${sanitizeString(types[0] || (SINGLE_TYPE[source] ? '' : 'Unknown'))}/`, { recursive: true })
		writeFileSync(`./output/items/${source}/${sanitizeString(types[0] || (SINGLE_TYPE[source] ? '' : 'Unknown'))}/${sanitizeString(item.name)}-${item.id}.wikitext`, output.join('\n'))
	}
}

teardown()