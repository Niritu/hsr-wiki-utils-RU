import { getFile } from '../files/GameFile.js'
import { teardown } from '../util/JSONParser.js'

const args = process.argv

let file = args[2]
if (!file.endsWith('.json')) {
	file += '.json'
}

if (!file.includes('/')) {
	file = 'ExcelOutput/' + file
}

const path = args[3].split('.')

const fileContent = await getFile(file)

const getPath = entry => {
	let val = entry
	for (const key of path) {
		val = val[key]
	}
	return val
}

const values = new Set<unknown>()

for (const entry of Object.values(fileContent)) {
	values.add(getPath(entry))
}

const output = [...values.values()]
	.map(val => val == undefined ? 'null' : JSON.stringify(val))

console.log(values)
console.log(output.join(' | '))

teardown()