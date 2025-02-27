import clipboard from 'clipboardy';
import { TextMap } from '../TextMap.js';
import { AWB } from '../util/AWB.js';

while (true) {
	const input = await AWB.prompt('Введите ID строки из текстмапа...')
	const list = input.split(';')
	
	const result = await TextMap.generateOL(list)

	await clipboard.write(result)
	console.log('Результат скопирован в буфер обмена!')
}