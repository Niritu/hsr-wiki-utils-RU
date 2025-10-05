import { replaceUnderlinedEE } from '../ExtraEffect.js'
import { AvatarRankData } from '../files/Ability.js'
import { getExcelFile } from '../files/GameFile.js'
import { HashReference, textMap } from '../TextMap.js'

export const AvatarRankConfig = await getExcelFile<AvatarRankData>('AvatarRankConfig.json', 'RankID')

export class CharacterEidolon {
	id: number
	name: string
	name_hash: HashReference

	level: number
	
	description: string
	description_hash: HashReference
	extra_effect_ids: number[]
	
	icon_path: string
	
	params: number[]
	
	constructor(data: AvatarRankData) {
		this.id = data.RankID
		
		this.name_hash = data.Name!
		this.name = textMap.getText(this.name_hash)
		
		this.icon_path = data.IconPath
		
		this.level = data.Rank
		
		this.params = data.Param.map(param => param.Value)
		
		this.extra_effect_ids = data.ExtraEffectIDList
		this.description_hash = data.Desc
		this.description = replaceUnderlinedEE(textMap.getText(this.description_hash, this.params), this.extra_effect_ids)
	}

	static fromId(id: number) {
		const data = AvatarRankConfig[id]
		
		if (!data) return null
		
		return new this(data)
	}
}