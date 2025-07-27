import { mkdir, writeFile } from 'fs/promises';
import { ChangeHistory } from '../ChangeHistory.js';
import { Item } from '../Item.js';
import { ReadableSeries } from '../Readable.js';
import { sanitizeString, wikiTitle, zeroPad } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { teardown } from '../util/JSONParser.js';
import { getCharacterMentions, getFactionMentions } from '../util/Mentions.js';
import { Template } from '../util/Template.js';

await Item.loadFrom('main', 'readables')

for (const series of ReadableSeries.loadAll()) {
	const readables = series.getReadables()
	
	if (readables.length == 0) {
		console.warn(`Серия книг "${series.name}" оказалась пустой, пропускаю...`)
		continue
	}
	
	const pageTitle = wikiTitle(series.name, 'readableseries', series.id)
	const firstReadableItem = await Item.fromId(readables[0].id)?.getImage()
	
	if (!series.visible) {
		const output = readables.map(readable => `===${readable.name}===\n:${readable.content.replaceAll('<br />', '\n:').replaceAll('\n\n', '\n:<br />') }\n`)

		await mkdir(`./output/readables/Mission-Exclusive/`, { recursive: true })
		await writeFile(`./output/readables/Mission-Exclusive/${sanitizeString(series.name)}-${series.id}.wikitext`, output.join('\n'))
		
		continue
	}
	
	const output = [
		`<%-- [PAGE_INFO]`,
		`PageTitle=#${pageTitle}#`,
		`[END_PAGE_INFO] --%>`,
		`{{Дополнить}}`,
	]
	
	const infobox = new Template('Книга Инфобокс', {
		id: zeroPad(series.id, 3),
		Название: pageTitle != series.name ? series.name : '',
		Изображение: firstReadableItem,
		Мир: series.getWorld(),
		Томов: readables.length,
		Автор: '<!--нужно добавить-->',
		Описание: series.description.replaceAll('\n', '<br />'),
	})
	
	for (const [i, readable] of readables.entries()) {
		infobox.addParam(`Том${i+1}`, '{{tx}}')
		infobox.addParam(`Источник${i+1}`, '{{tx|Отсутствует источник}}')
	}
	
	let checkStrings = readables.map(book => [book.name, book.content]).flat(1)
	
	infobox.addParam('Персонажи', getCharacterMentions(...checkStrings).join('; '))
	infobox.addParam('Фракции', getFactionMentions(...checkStrings).join('; '))
	
	output.push(
		infobox.block(12),
		`'''${series.name}''' — одна из ${readables.length > 1 ? `${readables.length} частей ` : ''}[[Книги|книг]], которую можно найти на [[${series.getWorld()}]]е.`,
		'',
		'==Локация==',
		'{{Отметка карты|<!--название карты-->|<!--id отметки-->}}',
		'',
		'==Текст=='
	)
	
	for (const readable of readables) {
		if (readables.length > 1) {
			output.push(`===${readable.name}===`)
		}
		output.push(readable.content, '')
	}
	
	output.push(
		'==На других языках==',
		await TextMap.generateOL(series.name_hash),
		'',
		'==История изменений==',
		`{{История изменений|${(await ChangeHistory.readableSeries.findAdded(series.id))?.[0]}}}`,
		'',
		'[[en:]]'
	)
	
	await mkdir(`./output/readables/${series.getWorld()}/`, { recursive: true })
	await writeFile(`./output/readables/${series.getWorld()}/${sanitizeString(series.name.replaceAll(',', ''))}-${series.id}.wikitext`, output.join('\n'))
}

teardown()