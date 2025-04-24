import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { sanitizeString } from '../Shared.js';
import { Tutorial } from '../Tutorial.js';
import { pageInfoHeader, uploadPrompt } from '../util/General.js';
import { Template, TemplateMap } from '../util/Template.js';

if (existsSync('./output/tutorials/')) {
	await rm('./output/tutorials/', { recursive: true })
}

for (const tutorial of Tutorial.loadAll()) {
	const template = new Template<'Обучение', TemplateMap['Обучение']>('Обучение', {
		сортировка: tutorial.page_ids[0], // idk why its like this on the wiki... theres a dedicated Order param in the excels?
		название: tutorial.name,
		подназвание: '', // unused by the game but still added to every tutorial page for some reason
		тип: tutorial.can_review ? tutorial.type : '',
		статья: '',
	})
	
	const fileTitle = sanitizeString(tutorial.pagetitle.replace('Обучение/', '').replaceAll(':', ''))
	
	for (const [i, page] of tutorial.getPages().entries()) {
		const fileName = `Обучение ${fileTitle} ${i + 1}.png`
		template.addParam(`изображение${i + 1}`, `${fileName}${uploadPrompt(page.image, fileName, 'Изображения обучений')}`)
		template.addParam(`текст${i+1}`, page.text)
	}
	
	const output = pageInfoHeader(tutorial.pagetitle) + '\n' + template.block(9)
	
	await mkdir(`./output/tutorials/${tutorial.type || 'Unknown'}/`, { recursive: true })
	await writeFile(`./output/tutorials/${tutorial.type || 'Unknown'}/${fileTitle}-${tutorial.id}.wikitext`, output)
}