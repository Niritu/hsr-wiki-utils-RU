import { InternalExtraEffect } from './files/Equation.js'
import { getExcelFile } from './files/GameFile.js'
import { textMap } from './TextMap.js'

export const EE_ALIASES: Record<string, string[]> = {
	'Базовый шанс': ['базового шанса'],
	'Бонус-атака': ['бонус-атаки', 'бонус-атакой', 'бонус-атаку', 'бонус-атак'],
	'Дополнительный урон': ['дополнительный физический урон', 'совместную атаку', 'дополнительный ледяной урон'],
	'Дополнительный ход': ['дополнительного хода'],
	'Задержка действия': ['действие этого противника задерживается', 'задерживает её действие', 'задерживает его действие', 'задерживаются'],
	'Контратака': ['контратаки', 'контратаку'],
	'Неспособность сражаться': ['неспособными сражаться', 'неспособны сражаться', 'неспособен сражаться', 'неспособна сражаться', 'становится неспособна сражаться'],
	'Ослабление': ['ослаблению'],
	'Ослабления контроля': ['эффектам контроля', 'эффекта контроля'],
	'Подкрепление': ['подкрепления'],
	'Призыв духа памяти': ['призывает духа памяти', 'призывается дух памяти'],
	'Пробитие сопротивления': ['пробитие всех типов сопротивления', 'пробитие мнимого сопротивления', 'пробитие квантового сопротивления', 'пробитие огненного сопротивления', 'пробитие ледяного сопротивления', 'пробитие ветряного сопротивления', 'пробитие физического сопротивления', 'пробитие электрического сопротивления'],
	'Пробитие уязвимости': ['с пробитой уязвимостью', 'пробитой уязвимости', 'пробитую уязвимость', 'уязвимость цели'],
	'Продвижение действия': ['продвигает действие', 'продвигает следующее действие', 'продвигает его действие вперёд', 'продвигается вперёд', 'продвигаются вперёд', 'действие вперёд', 'продвигает'],
	'Совместная атака': ['совместной атакой', 'совместную атаку'],
	'Урон пробития': ['урона ледяного пробития'],
	'Урон суперпробития': ['урона суперпробития'],
	'Усиление': ['усиления'],
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
						return `${before}{{Extra Effect|${eeName}|${extraEffectId}}}${after}`
					} else {
						return `${before}{{Extra Effect|${eeName}}}${after}`
					}
				}
			}
			
			// special cases where arbitrary nouns can be included in the underline
			if (activeEE.includes(10000001) && lowerName.includes('advance')) {
				return `${before}{{Extra Effect|${eeName}|Action Advanced}}${after}`
			} else if (activeEE.includes(10000002) && lowerName.includes('delay')) {
				return `${before}{{Extra Effect|${eeName}|Action Delayed}}${after}`
			}
			
			console.warn(`Could not find matching Extra Effect for "${eeName}" out of ${activeEE.length} active: ${activeEE.map(ee => textMap.getText(ExtraEffectConfig[ee].ExtraEffectName)).join('; ')}`)
			
			return fullMatch
		})
}