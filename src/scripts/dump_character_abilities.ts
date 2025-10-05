import { mkdir, writeFile } from 'node:fs/promises';
import { ChangeHistory } from '../ChangeHistory.js';
import { Character } from '../character/Character.js';
import { sanitizeString } from '../Shared.js';
import { TextMap } from '../TextMap.js';
import { pageInfoHeader, uploadPrompt } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Template } from '../util/Template.js';

for (const character of Character.allReleased()) {
	let characterWithPath = character.name
	
	if (character.name == '(Первопроходец)') {
		characterWithPath = `Первопроходец (${character.path_display})`
	} else if (character.name == 'Март 7') {
		characterWithPath = `Март 7 (${character.path_display})`
	} else if (character.name == 'Дань Хэн: Пожиратель Луны') {
		characterWithPath = `Дань Хэн Пожиратель Луны`
	} else if (character.name == 'Дань Хэн: Освободитель Пустошей') {
		characterWithPath = `Дань Хэн Освободитель Пустошей`
	}
	
	const abilities = character.getAbilities()
	
	const characterAdded = (await ChangeHistory.character.findAdded(character.id))[0]
	
	const parentFolder = `./output/characters/${characterWithPath}-${character.id}`
	
	await mkdir(`${parentFolder}/навыки`, { recursive: true })
	await mkdir(`${parentFolder}/следы`, { recursive: true })
	await mkdir(`${parentFolder}/эйдолоны`, { recursive: true })
	
	// MAIN ABILITIES //
	for (const ability of abilities) {
		const output: string[] = [
			pageInfoHeader(ability.name),
		]
		
		let toughnessDisplay: string[] = []
		if (ability.toughness_main > 0) {
			toughnessDisplay.push(`${ability.toughness_main / 3}${!ability.single_toughness ? ' (основная цель)' : ''}`)
		}
		if (ability.toughness_adjacent > 0) {
			toughnessDisplay.push(`${ability.toughness_adjacent / 3}${!ability.toughness_adjacent ? ' (соседние цели)' : ''}`)
		}
		if (ability.toughness_aoe > 0) {
			toughnessDisplay.push(`${ability.toughness_aoe / 3}${!ability.toughness_aoe ? ' (по области)' : ''}`)
		}
		
		const infobox = new Template('Навык Инфобокс', {
			Название: ability.name,
			Изображение: `Навык ${ability.name}.png${uploadPrompt(ability.icon_path_ult || ability.icon_path, `Навык ${ability.name}.png`, `${character.name} Ability Icons`)}`,
			Персонаж: characterWithPath,
			Тип: ability.type_display,
			Тэг: ability.tag_display,
			УронСтойк: toughnessDisplay.join('<br />'),
			ЭнергияГен: ability.energy_generation || '',
			Энергия: ability.energy_cost || '',
			Длительность: '',
			Описание: ability.description.replaceAll('\n', '<br />'),
			Свойство1: '',
			Масштабирование1: '',
		})
		
		const hasMultipleOfType = abilities.find(otherAbility => otherAbility.type == ability.type && otherAbility != ability)
		
		output.push(
			infobox.block(),
			`'''«${ability.name}»''' — [[${ability.type_display}]] [[${character.name}]].`,
			'',
			'==Превью==',
			'{{Превью',
			`|Файл = ${ability.name} Превью`,
			'}}',
			'',
			'==Масштабирование==',
			ability.getScalingTable() ?? '',
			'',
			'==На других языках==',
			await TextMap.generateOL(ability.name_hash),
			'',
			'==История изменений==',
			`{{История изменений|${characterAdded}}}`,
			'',
			'==Навигация==',
			`{{Навык Навбокс|${characterWithPath}}}`,
			'',
			'[[en:]]',
		)
		
		await writeFile(`${parentFolder}/навыки/${ability.type_display}-${sanitizeString(ability.name)}.wikitext`, output.join('\n'))
	}

	// TRACES //
	for (const trace of character.getTraces()) {
		const output: string[] = [
			pageInfoHeader(trace.name),
		]

		const infobox = new Template('Навык Инфобокс', {
			Название: trace.name,
			Изображение: `След ${trace.name}.png${uploadPrompt(trace.icon_path, `След ${trace.name}.png`, `${character.name} Trace Icons`)}`,
			Персонаж: characterWithPath,
			Тип: 'Доп. способность',
			Возвышение: trace.required_ascension,
			Длительность: '',
			Описание: trace.description.replaceAll('\n', '<br />'),
			Свойство1: '',
			Масштабирование1: '',
		})

		output.push(
			infobox.block(),
			`'''«${trace.name}»''' — одна из [[дополнительная способность|дополнительных способностей]] [[${character.name}]].`,
			'',
			'==На других языках==',
			await TextMap.generateOL(trace.name_hash),
			'',
			'==История изменений',
			`{{История изменений|${characterAdded}}}`,
			'',
			'==Навигация==',
			`{{Навык Навбокс|${characterWithPath}}}`,
			'',
			'[[en:]]',
		)

		await writeFile(`${parentFolder}/следы/${trace.required_ascension}-${sanitizeString(trace.name)}.wikitext`, output.join('\n'))
	}

	// EIDOLONS //
	for (const eidolon of character.getEidolons()) {
		const output: string[] = [
			pageInfoHeader(eidolon.name),
		]

		const infobox = new Template('Эйдолон Инфобокс', {
			Название: eidolon.name,
			Изображение: `Эйдолон ${eidolon.name}.png${uploadPrompt(eidolon.icon_path, `Эйдолон ${eidolon.name}.png`, `${character.name} Eidolon Icons`)}`,
			Персонаж: characterWithPath,
			Уровень: eidolon.level,
			Длительность: '',
			Описание: eidolon.description.replaceAll('\n', '<br />'),
			Свойство1: '',
			Масштабирование1: '',
		})

		output.push(
			infobox.block(),
			`'''«${eidolon.name}»''' — ${eidolon.level} уровень [[эйдолон]]а [[${character.name}]].`,
			'',
			'==Галерея==',
			'{{Галерея|position=left|captionalign=center',
			`|Персонаж ${characterWithPath} Эйдолон ${eidolon.level}.png|Осколок Эйдолона`,
			'}}',
			'',
			'==На других языках==',
			await TextMap.generateOL(eidolon.name_hash),
			'',
			'==История изменений',
			`{{История изменений|${characterAdded}}}`,
			'',
			'==Навигация==',
			`{{Навык Навбокс|${characterWithPath}}}`,
			'',
			'[[en:]]',
		)

		await writeFile(`${parentFolder}/эйдолоны/${eidolon.level}-${sanitizeString(eidolon.name)}.wikitext`, output.join('\n'))
	}
	
	console.log(`Finished for ${characterWithPath}`)
}

console.log('Finished all characters')

teardown()