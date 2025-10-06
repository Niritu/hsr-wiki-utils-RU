import { replaceUnderlinedEE } from '../ExtraEffect.js'
import { AvatarSkillAttackType, AvatarSkillData, AvatarSkillEffectType } from '../files/Ability.js'
import { getFile } from '../files/GameFile.js'
import { AttackType, roundTo, Value } from '../Shared.js'
import { HashReference, textMap } from '../TextMap.js'

export const AvatarSkillConfig = await getFile<AvatarSkillData[]>('ExcelOutput/AvatarSkillConfig.json')
export const AvatarServantSkillConfig = await getFile<AvatarSkillData[]>('ExcelOutput/AvatarServantSkillConfig.json')

function noneIfNegative(value: number | Value<number> | undefined) {
	if (!value) return undefined
	if (typeof(value) == 'object') value = value?.Value
	
	if (value <= 0) return undefined
	else return value
}

const abilityMaxLevels: Record<AvatarSkillAttackType, number> = {
	BPSkill: 12,
	Ultra: 12,
	Servant: 7,
	Normal: 7,
	Talent: 12,
	ServantTalent: 7,

	MazeNormal: 1,
	Maze: 1,
}

export class CharacterAbility {
	id: number
	name: string
	name_hash: HashReference
	
	description: string
	description_hash: HashReference
	extra_effect_ids: number[]
	
	max_level: number
	trigger_key: string
	
	type: AvatarSkillAttackType
	type_display: string
	
	tag: AvatarSkillEffectType
	tag_display: string
	
	icon_path: string
	icon_path_ult?: string
	
	cost_text?: string
	
	energy_generation?: number
	energy_cost?: number
	
	skill_point_generation?: number
	skill_point_cost?: number
	
	params_by_attribute: number[][]
	params_by_level: number[][]
	
	toughness_display?: number
	toughness_main: number
	toughness_adjacent: number
	toughness_aoe: number
	toughness_type: AttackType
	single_toughness: boolean
	
	constructor(data: AvatarSkillData[], isMemosprite?: boolean) {
		const firstData = data[0]
		this.id = firstData.SkillID
		
		this.name_hash = firstData.SkillName
		this.name = textMap.getText(this.name_hash)
		
		this.max_level = firstData.MaxLevel
		this.trigger_key = firstData.SkillTriggerKey
		
		this.type = firstData.AttackType || (isMemosprite ? 'ServantTalent' : 'Talent')
		this.type_display = textMap.getText(firstData.SkillTypeDesc)
		
		this.tag = firstData.SkillEffect
		this.tag_display = textMap.getText(firstData.SkillTag)
		
		this.icon_path = firstData.SkillIcon
		this.icon_path_ult = firstData.UltraSkillIcon
		
		this.energy_cost = noneIfNegative(firstData.SPNeed)
		this.energy_generation = noneIfNegative(firstData.SPBase)
		
		this.skill_point_cost = noneIfNegative(firstData.SPNeed)
		this.skill_point_generation = noneIfNegative(firstData.SPBase);
		
		[{Value: this.toughness_main}, {Value: this.toughness_aoe}, {Value: this.toughness_adjacent}] = firstData.ShowStanceList
		this.single_toughness = firstData.ShowStanceList.filter(v => v.Value > 0).length <= 1
		
		this.toughness_display = firstData.StanceDamageDisplay
		this.toughness_type = firstData.StanceDamageType
		
		const maxLevelData = data.find(data => data.Level == Math.min(abilityMaxLevels[this.type], data.MaxLevel))
		
		if (!maxLevelData) {
			throw new Error(`Missing max level scaling data for "${this.name}"`)
		}
		
		this.params_by_attribute = firstData.ParamList.map((_val, i) => data.map(lv => lv.ParamList[i].Value))
		this.params_by_level = data.map(lv => lv.ParamList.map(param => param.Value))
		
		const minMaxParams: [number, number][] = firstData.ParamList.map((val, i) => [val.Value, maxLevelData.ParamList[i].Value])
		
		this.extra_effect_ids = firstData.ExtraEffectIDList
		this.description_hash = firstData.SkillDesc
		this.description = replaceUnderlinedEE(textMap.getText(this.description_hash, minMaxParams), this.extra_effect_ids)
	}

	static fromId(id: number) {
		const dataMain = AvatarSkillConfig
			.filter(skill => skill.SkillID == id)
			.sort((s0, s1) => s0.Level - s1.Level)
		
		if (dataMain.length > 0) {
			return new CharacterAbility(dataMain, false)
		}

		const dataMemosprite = AvatarServantSkillConfig
			.filter(skill => skill.SkillID == id)
			.sort((s0, s1) => s0.Level - s1.Level)

		if (dataMemosprite.length > 0) {
			return new this(dataMemosprite, true)
		}
		
		return null
	}
	
	getScalingTable() {
		const output: string[] = [`{{Масштабирование навыка|тип=${this.type_display}`]
		for (const paramList of this.params_by_attribute) {
			if (paramList[0] == paramList[paramList.length - 1]) continue
			output.push('|' + paramList.map(param => `${roundTo(param * 100, 2)}%`).join(';'))
		}
		output.push('}}')
		if (output.length == 2) return undefined
		return output.join('\n')
	}
	
	descriptionAtLevel(level: number) {
		return replaceUnderlinedEE(textMap.getText(this.description_hash, this.params_by_level[level - 1]), this.extra_effect_ids)
	}
}