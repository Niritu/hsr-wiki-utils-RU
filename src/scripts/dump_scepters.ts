import { writeFile } from 'fs/promises';
import { ScepterStyleType, ScepterUnitSlot } from '../files/Scepter.js';
import { Component, DisplayTypeMap, Scepter } from '../Scepter.js';
import { pageInfoHeader } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';

// SCEPTERS //
const scepterPage: string[] = [
	pageInfoHeader('Виртуальная вселенная: Область непознанного/Скипетры'),
	'{{Вкладки Виртуальная вселенная: Область непознанного}}',
	'{{Дополнить|Общие детали игрового процесса}}',
	''
]

function addScepters(type: ScepterStyleType) {
	const displayName = DisplayTypeMap[type]
	scepterPage.push(
		`==Скипетры типа ${displayName}==`,
		'{{Информация скипетра/Начало}}',
		...Scepter.loadAll(type).map(scepter => scepter.templateEntry()),
		'{{Информация скипетра/Конец}}',
		''
	)
}

addScepters('Ultimate')
addScepters('Dot')
addScepters('Follow')
addScepters('Break')

scepterPage.push('==История изменений==', '{{История изменений|2.6}}')

await writeFile(`./output/und-scepters.wikitext`, scepterPage.join('\n'))


// COMPONENTS //
const componentsPage: string[] = [
	pageInfoHeader('Виртуальная вселенная: Область непознанного/Компоненты'),
	'{{Вкладки Виртуальная вселенная: Область непознанного}}',
	'{{Дополнить|Общие детали игрового процесса}}',
	''
]

const components = Component.loadAll()

function addComponents(type: ScepterUnitSlot | 'Decision', display: string = type) {
	componentsPage.push(
		`==Компоненты типа ${display}==`,
		'{{Информация компонента/Начало}}',
		...components
			.filter(comp => type == 'Decision' ? comp.is_decision : (comp.slot == type && !comp.is_decision))
			.map(component => component.templateEntry()),
		'{{Информация компонента/Конец}}',
		''
	)
}

addComponents('Decision')
addComponents('Attach', 'Supplementary')
addComponents('Passive')

scepterPage.push('==История изменений==', '{{История изменений|2.6}}')

await writeFile(`./output/und-components.wikitext`, componentsPage.join('\n'))

teardown()