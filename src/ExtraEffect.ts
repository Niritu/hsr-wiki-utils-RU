import { InternalExtraEffect } from './files/Equation.js'
import { getExcelFile } from './files/GameFile.js'
import { textMap } from './TextMap.js'

export const EE_ALIASES: Record<string, string[]> = {
	'Базовый урон': ['базового урона', 'базового физического урона'],
	'Базовый шанс': ['базового шанса'],
	'Блазар': ['блазара', 'блазаром'],
	'Боевой дух': ['боевого духа', 'боевым духом'],
	'Бонус-атака': ['бонус-атаки', 'бонус-атакой', 'бонус-атаку', 'бонус-атак'],
	'Граница': ['границы'],
	'Дополнительный урон': ['дополнительный физический урон', 'дополнительный ледяной урон'],
	'Дополнительный ход': ['дополнительного хода'],
	'Дрожь': ['дрожью', 'контратаку'],
	'Душа кокона / Душа бабочки': ['душа кокона', 'душа бабочки'],
	'Задержка действия': ['действие этого противника задерживается', 'задерживает её действие', 'задерживает его действие', 'задерживаются'],
	'Капля росы': ['каплю росы', 'капли росы', 'каплей росы', 'капель росы'],
	'Контратака': ['контратаки', 'контратаку', 'контратакой'],
	'Критическое усиление': ['критического усиления'],
	'Мозг в кувшине': ['мозга в кувшине', 'мозгом в кувшине'],
	'Неспособность сражаться': ['неспособными сражаться', 'неспособны сражаться', 'неспособен сражаться', 'неспособна сражаться', 'становится неспособна сражаться'],
	'Ослабление': ['ослаблению'],
	'Ослабления контроля': ['эффектам контроля', 'эффекта контроля'],
	'Подкрепление': ['подкрепления'],
	'Подозрение': ['подозрением', 'подозрения'],
	'Послевкусие': ['послевкусием', 'послевкусия'],
	'Призыв духа памяти': ['призывает духа памяти', 'призывается дух памяти'],
	'Пробитие сопротивления': ['пробитие всех типов сопротивления', 'пробитие мнимого сопротивления', 'пробитие квантового сопротивления', 'пробитие огненного сопротивления', 'пробитие ледяного сопротивления', 'пробитие ветряного сопротивления', 'пробитие физического сопротивления', 'пробитие электрического сопротивления'],
	'Пробитие уязвимости': ['с пробитой уязвимостью', 'пробитой уязвимости', 'пробитую уязвимость', 'уязвимость цели', 'уязвимость цели не пробита', 'уязвимость цели пробита'],
	'Продвижение действия': ['продвигает действие', 'продвигает следующее действие', 'продвигает его действие вперёд', 'продвигается вперёд', 'продвигаются вперёд', 'действие вперёд', 'продвигает'],
	'Совместная атака': ['совместной атакой', 'совместную атаку', 'совместную атаку'],
	'Споры': ['спор', 'споре', 'спора', 'спору'],
	'Унисон': ['унисона'],
	'Урон пробития': ['урона ледяного пробития'],
	'Урон суперпробития': ['урона суперпробития'],
	'Усиление': ['усиления'],
	'Шёпот': ['шёпота', 'шёпотом', 'шёпоту'],
	'Эффекты задержки': ['эффект задержки', 'эффекта задержки'],
}

export const ExtraEffectConfig = await getExcelFile<InternalExtraEffect>('ExtraEffectConfig.json', 'ExtraEffectID')

function resolvePriority(name: string, id0: number) {
	let id1 = EE_PRIORITY[name]
	if (!id1) {
		EE_PRIORITY[name] = id0
		return
	}

	const isEvent0 = id0.toString().startsWith('70')
	const isEvent1 = id1.toString().startsWith('70')
	if (isEvent1 && !isEvent0) {
		EE_PRIORITY[name] = id0
	} else if (isEvent0 && !isEvent1) {
		EE_PRIORITY[name] = id1
	} else {
		// console.warn(`Collission between ${id0} and ${id1} for "${name}"`)
		EE_PRIORITY[name] = id0 < id1 ? id0 : id1
	}
}

export const EE_PRIORITY: Record<string, number> = {}
for (const effect of Object.values(ExtraEffectConfig)) {
	const effectName = textMap.getText(effect.ExtraEffectName)
	if (!effectName) continue

	resolvePriority(effectName.toLowerCase(), effect.ExtraEffectID)

	if (EE_ALIASES[effectName]) {
		for (const alias of EE_ALIASES[effectName]) {
			resolvePriority(alias, effect.ExtraEffectID)
		}
	}
}

export function replaceUnderlinedEE(str: string, activeEE: number[]) {
	return str
		.replaceAll(/<u>(["\.\s]*)(.+?)(["\.\s]*)<\/u>/gi, (fullMatch: string, before: string, eeName: string, after: string) => {
			let lowerName = eeName.toLowerCase()
				.replaceAll(/[\.\"]/gi, '')
			
			if (lowerName.endsWith("'s")) {
				after = "'s" + after
				lowerName = lowerName.replace(/'s$/i, '')
				eeName = eeName.replace(/'s(?=\b)/i, '')
			}
			
			for (const extraEffectId of activeEE) {
				const extraEffect = ExtraEffectConfig[extraEffectId]
				const checkEEName = textMap.getText(extraEffect.ExtraEffectName).replaceAll(/[\.\"]/gi, '')
				if (lowerName == checkEEName.toLowerCase() || (EE_ALIASES[checkEEName] && EE_ALIASES[checkEEName].includes(lowerName))) {
					if (EE_PRIORITY[lowerName] != extraEffectId || extraEffectId.toString().startsWith('6') || extraEffectId.toString().startsWith('7')) {
						return `${before}{{Доп эффект|${eeName}|${extraEffectId}}}${after}`
					} else {
						return `${before}{{Доп эффект|${eeName}}}${after}`
					}
				}
			}
			
			// special cases where arbitrary nouns can be included in the underline
			if (activeEE.includes(10000001) && lowerName.includes('advance')) {
				return `${before}{{Доп эффект|${eeName}|Продвижение действия}}${after}`
			} else if (activeEE.includes(10000002) && lowerName.includes('delay')) {
				return `${before}{{Доп эффект|${eeName}|Задержка действия}}${after}`
			}
			
			console.warn(`Could not find matching Extra Effect for "${eeName}" out of ${activeEE.length} active: ${activeEE.map(ee => textMap.getText(ExtraEffectConfig[ee].ExtraEffectName)).join('; ')}`)
			
			return fullMatch
		})
}