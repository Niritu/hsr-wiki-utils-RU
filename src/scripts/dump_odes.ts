import { writeFileSync } from 'fs';
import { Item, ItemList } from '../Item.js';
import { TextMap } from '../TextMap.js';
import { TitanOde } from '../TitanOde.js';
import { pageInfoHeader } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Table } from '../util/Table.js';

const odes = TitanOde.loadAll()
await Item.loadFrom('main')

const output = [
	pageInfoHeader('Расходящаяся вселенная: Тысячеликий герой/Оды титанам'),
	'{{Вкладки Расходящаяся вселенная: Тысячеликий герой}}',
	'',
	'==Умения==',
]

const titans = new Set<string>()

for (const ode of odes) {
	titans.add(ode.titan_title)
}

const ICON_MAP = {
	'SpriteOutput/Rogue/Talent/1006.png': 'Дополнительная способность',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffHealRatio.png': 'Бонус исцеления',
	'SpriteOutput/Rogue/Talent/1004.png': 'Снижение урона',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffDefenceUp.png': 'Защита',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffHPBoost.png': 'Повышение HP',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffDamageResistance.png': 'Сопротивление эффектам',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffShield.png': 'Щит',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffAttackUp.png': 'Повышение атаки',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffAttackUpElement.png': 'Повышение всего урона',
	'SpriteOutput/UI/Avatar/Icon/IconCriticalDamage.png': 'Крит. урон',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffBreakDamage.png': 'Эффект пробития',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffStatusProbability.png': 'Шанс попадания эффектов',
	'SpriteOutput/BuffIcon/Inlevel/IconBuffSpeedUp.png': 'Повышение скорости'
}

for (const titan of titans) {
	output.push(`===${titan}===`)
	
	const odeTable = new Table('article-table')
	for (const ode of odes.filter(ode => ode.titan_title == titan).sort((o0, o1) => o0.level - o1.level)) {
		odeTable.addRow(
			`! rowspan="2" | ${ode.level}`,
			`class="align-center" | {{Иконка|${ICON_MAP[ode.icon]}|размер=48px|invert=1}}`,
			`'''${ode.name}'''<br />${ode.description.replaceAll('\n', '<br />')}`
		)
		odeTable.addRow(
			`${new ItemList(ode.cost).asItemList(false, 'sent', true)}`,
			`class="align-right" | [[#${ode.story_name}|${ode.story_name} →]]`
		)
	}
	
	output.push(
		odeTable.wikitable(false),
		''
	)
}

output.push('==Секреты==')

for (const ode of odes) {
	if (!ode.story_json) continue
	
	output.push(`===${ode.story_name}===`)
	
	const dialogue = (await ode.loadDialogue())!.optimize()
	
	output.push(
		'{{Диалог Начало}}',
		await dialogue.wikitext(),
		'{{Диалог Конец}}',
		'----',
		''
	)
}

output.push(
	'==На других языках==',
	await TextMap.generateOL(9436507094703352798n),
	'',
	'==История изменений==',
	'{{История изменений|3.1}}'
)

writeFileSync('./output/du-odes.wikitext', output.join('\n'))

teardown()