import { writeFileSync } from 'fs';
import { Curio } from '../Curio.js';
import { uploadPrompt } from '../util/General.js';

const rarities = ['Weighted', '3', '2', '1', 'Negative', undefined]

// DIVERGENT UNIVERSE //
const outputDU: string[] = ['{{Вкладки Расходящейся вселенной}}','']

const curiosDU = Curio.loadAll(true)

for (const rarity of rarities) {
	outputDU.push(
		`==${rarity}-звёздочные диковины==`,
		'{{Диковина Информация/Начало}}'
	)
	
	outputDU.push(...curiosDU.filter(curio => curio.rarity == rarity && curio.period == 'Tourn2').map(curio => curio.entry() + uploadPrompt(curio.icon_path, `Диковина ${curio.name.replaceAll(/<\s*\/?\s*\w+\s*>/gi, '') }.png`, 'Изображения диковин')))

	outputDU.push('{{Диковина Информация/Конец}}','')
}

writeFileSync('./output/curios-du.wikitext', outputDU.join('\n'))

// CARD MODULE //
const module_output: string[] = ['return {']
module_output.push(...curiosDU.filter(curio => curio.rarity && curio.period == 'Tourn2').map(curio => `\t["${curio.name.replaceAll('"', '\\"')}"] = { Редкость = "${curio.rarity}" },`))

module_output.push('}')

writeFileSync('./output/curios-du-module.lua', module_output.join('\n'))

// SIMULATED UNIVERSE //
const outputSU: string[] = []

const curiosSUTemp = Curio.loadAll(false)
const curiosSU: Curio[] = []

for (const curio of curiosSUTemp) {
	if (!curiosSU.find(ecurio => ecurio.name == curio.name && ecurio.effect == curio.effect && ecurio.index_id == curio.index_id)) {
		curiosSU.push(curio)
	}
}

outputSU.push('{{Диковина Информация/Начало}}')
for (const curio of curiosSU) {
	outputSU.push(curio.entry() + uploadPrompt(curio.icon_path, `Диковина ${curio.name.replaceAll(/<\s*\/?\s*\w+\s*>/gi, '')}.png`, 'Иконки диковин'))
}
outputSU.push('{{Диковина Информация/Конец}}')

writeFileSync('./output/curios.wikitext', outputSU.join('\n'))