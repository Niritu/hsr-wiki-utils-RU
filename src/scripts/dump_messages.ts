import { writeFile } from 'fs/promises';
import { ChangeHistory } from '../ChangeHistory.js';
import { MessageItem, MessagesContact } from '../Messages.js';
import { Mission } from '../Mission.js';
import { sanitizeString } from '../Shared.js';
import { pageInfoHeader } from '../util/General.js';
import { Template } from '../util/Template.js';

for (const contact of MessagesContact.loadAll()) {
	const participants = new Set<string>()
	
	const daily: string[] = []
	const mission: string[] = []
	
	for (const group of contact.getGroups()) {
		let out = group.isDaily() ? daily : mission
		
		for (const section of group.getSections()) {
			const firstMessageWords = MessageItem.fromId(section.starting_message_ids[0]).text?.replaceAll('\n', ' ')?.split(' ') || []
			let header = ''
			if (firstMessageWords?.length > 6) {
				header = firstMessageWords.slice(0, 4).join(' ') + '...'
			} else {
				header = firstMessageWords.join(' ')
			}
			
			const messages = (await section.getMessages()).optimize()
			out.push(
				`===${header}===`,
				group.isDaily() ? `{{Сообщения\n|условие_получения = \n|текст=\n${await messages.wikitext()}\n}}` : `{{Сообщения\n|условие_получения = \n|текст =\n${await messages.wikitext()}\n}}`,
				'----',
				''
			)
			messages.getParticipants().forEach(participant => participants.add(`[[${participant.name == '(Первопроходец)' ? 'Первопроходец' : participant.name}]]`))
		}
	}

	const infobox = new Template('Сообщение Инфобокс')
		.addParam('id', contact.id)

	if (contact.fake_name && contact.fake_name != contact.name) {
		infobox.addParam('Название', contact.fake_name)
	}
	infobox
		.addParam('Изображение', `${contact.type == 'Группа' ? 'НИП' : contact.type} ${contact.name} Иконка.png`)
		.addParam('Тип', contact.type)

	if (contact.type != 'Группа') {
		infobox
			.addParam('Отправитель', contact.name)
			.addParam('ПодписьСоо', contact.signature || '')
	} else {
		infobox.addParam('Персонажи', [...participants.values()].sort().join('; '))
	}

	if (contact.fake_faction && contact.fake_faction != contact.faction) {
		const condition = contact.reveal_mission_id ? `Миссия [[${Mission.fromId(contact.reveal_mission_id).pagetitle}]]` : '{{Дополнить}}'
		infobox.addParam('Фракция', `[[${contact.fake_faction}]] (Перед завершением ${condition})<br />[[${contact.faction}]] (После завершения ${condition})`)
	} else {
		infobox.addParam('Фракция', contact.faction ?? '')
	}
	
	const output: string[] = [
		pageInfoHeader(`Сообщения/${contact.name}`),
		infobox.block(),
		''
	]
	
	if (mission.length > 0) {
		output.push(
			'==Сюжетные сообщения==',
			...mission
		)
	}
	
	if (daily.length > 0) {
		output.push(
			'==Ежедневные сообщения==',
			...daily
		)
	}
	
	output.push(
		'==История изменений==',
		`{{История изменений|${(await ChangeHistory.messageContact.findAdded(contact.id))[0]}}}`,
		'',
		'==Навигация==',
		'{{Сообщения Навбокс}}'
	)
	
	if (daily.length == 0 && mission.length == 0) continue
	await writeFile(`./output/messages/${contact.type}/${sanitizeString(contact.name)}-${contact.id}.wikitext`, output.join('\n'))
}