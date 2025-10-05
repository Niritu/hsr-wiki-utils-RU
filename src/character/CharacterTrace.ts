import { replaceUnderlinedEE } from '../ExtraEffect.js'
import { AvatarSkillTreeData } from '../files/Character.js'
import { getExcelFile } from '../files/GameFile.js'
import { HashReference, textMap } from '../TextMap.js'

export const AvatarSkillTreeConfig = await getExcelFile<AvatarSkillTreeData>('AvatarSkillTreeConfig.json', 'PointID')

export class CharacterTrace {
	id: number
	name: string
	name_hash: HashReference

	required_ascension: number
	
	description: string
	description_hash: HashReference
	extra_effect_ids: number[]
	
	icon_path: string
	
	params: number[]
	
	constructor(data: AvatarSkillTreeData) {
		this.id = data.PointID
		
		this.name_hash = data.PointName!
		this.name = textMap.getText(this.name_hash)
		
		this.icon_path = data.IconPath
		
		this.required_ascension = data.AvatarPromotionLimit
		
		this.params = data.ParamList.map(param => param.Value)
		
		this.extra_effect_ids = data.ExtraEffectIDList
		this.description_hash = data.PointDesc!
		this.description = replaceUnderlinedEE(textMap.getText(this.description_hash, this.params), this.extra_effect_ids)
	}

	static fromId(id: number) {
		const data = AvatarSkillTreeConfig[id]
		
		if (!data) return null
		
		return new this(data)
	}
	
	static getForCharacter(characterId: number) {
		return Object.values(AvatarSkillTreeConfig)
			.filter(skill => skill.AvatarID == characterId && skill.PointType == 3)
			.map(skill => new this(skill))
	}
}