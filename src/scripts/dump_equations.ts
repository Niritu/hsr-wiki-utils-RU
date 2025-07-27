import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { Blessing } from '../Blessing.js';
import { ChangeHistory } from '../ChangeHistory.js';
import { Equation, PERIOD_MAP } from '../Equation.js';
import { replaceUnderlinedEE } from '../ExtraEffect.js';
import { sanitizeString } from '../Shared.js';
import { pathDisplayName, TextMap, textMap } from '../TextMap.js';
import { pageInfoHeader } from '../util/General.js';
import { teardown } from '../util/JSONParser.js';
import { Table } from '../util/Table.js';

const equations = Equation.loadAll();

const output: string[] = ['{{Вкладки Расходящейся вселенной}}', '']
const output2: string[] = ['{{Вкладки Расходящейся вселенной}}', '']
const glossary = new Set<number>()
const glossary2 = new Set<number>()

function addBlessingPath(path: string) {
    output2.push(`===${pathDisplayName(path)}===`);
    const blessings = [...Blessing.loadAll(true)].sort((a, b) => ((a.id - (a.rarity * 1000000000)) - (b.id - (b.rarity * 1000000000))));
    const table = new Table('sortable mw-collapsible article-table', ['Иконка', 'Название', 'Эффект', 'Усиленный эффект'])
    for (const blessing of blessings) {
        if (blessing.path != pathDisplayName(path) || blessing.active || blessing.enhanced)
            continue;
        const enhanced = blessings.find(eblessing => eblessing.buff_id == blessing.buff_id && eblessing.enhanced);
        table.addRowWithAttr(`id="${blessing.name.replaceAll('"', '&quot;').replaceAll("''", '')}"`, [
            `{{Благословение ВВ Карточка|${pathDisplayName(blessing.path)}|${blessing.icon_variant}|${blessing.rarity}}}`,
            blessing.name,
            replaceUnderlinedEE(blessing.description
                .replaceAll('\n', '<br />'), blessing.extra_effects),
            replaceUnderlinedEE(enhanced.description
                .replaceAll('\n', '<br />'), blessing.extra_effects),
        ]);
        blessing.extra_effects.forEach(trait => glossary2.add(trait));
    }
    output2.push(table.wikitable(false), '');
}
if (existsSync('./output/equations/')) {
    rmSync('./output/equations/', { recursive: true });
}
for (const period of Object.keys(PERIOD_MAP)) {
    mkdirSync(`./output/equations/${period}/boundary`, { recursive: true });
    mkdirSync(`./output/equations/${period}/3`, { recursive: true });
    mkdirSync(`./output/equations/${period}/2`, { recursive: true });
    mkdirSync(`./output/equations/${period}/1`, { recursive: true });
}
for (const equation of equations) {
    if (!equation.in_handbook && equation.rarity != 'boundary')
        continue;
    const output = [
        pageInfoHeader(equation.name),
    ];
    if (!equation.active) {
        output.push('{{Удалено|Уравнение было выведено из игры с обновлением Расходящейся вселенной в [[Версия/3.1|версии 3.1]].}}');
    }
    output.push(equation.infobox(), `'''${equation.name}''' — ${equation.rarity == 'boundary' ? `[[Расходящаяся вселенная: ${equation.period_name}/Уравнения|уравнение]] границы` : `${equation.rarity}-звёздочное [[Расходящаяся вселенная: ${equation.period_name}/Уравнения|уравнение]]`}, которое ${equation.active ? 'доступно' : 'было доступно'} в [[Расходящаяся вселенная: ${equation.period_name}|Расходящейся вселенной: ${equation.period_name}]].`, '', '==История==', `{{Описание|${equation.story.replaceAll('\n', '<br />')}}}`, '');
    if (equation.story_json) {
        const dialogue = (await equation.loadDialogue()).optimize();
        output.push('==Возврат развёртывания==', '{{Дополнить}}', '');
    }
    output.push('==На других языках==', await TextMap.generateOL(equation.name_hash), '', '==История изменений==', `{{История изменений|${(await ChangeHistory.equation.findAdded(equation.id))[0]}}}`, '', '[[en:]]');
    writeFileSync(`./output/equations/${equation.period}/${equation.rarity}/${sanitizeString(equation.name)}-${equation.id}.wikitext`, output.join('\n'));
}

output2.push('==Благословения==')
addBlessingPath('Preservation', 'Сохранение')
addBlessingPath('Remembrance', 'Память')
addBlessingPath('Nihility', 'Небытие')
addBlessingPath('Abundance', 'Изобилие')
addBlessingPath('TheHunt', 'Охота')
addBlessingPath('Destruction', 'Разрушение')
addBlessingPath('Elation', 'Радость')
addBlessingPath('Propagation', 'Распространение')
addBlessingPath('Erudition', 'Эрудиция')
// addBlessingPath('Harmony')
output.push('==Справочник==');
output2.push('==Справочник==');
const traits = [...glossary.values()].map(id => Equation.getExtraEffect(id)).sort((a, b) => {
    const name1 = textMap.getText(a?.ExtraEffectName)
    const name2 = textMap.getText(b?.ExtraEffectName)
    
    if (name1 > name2) {
        return 1
    } else if (name2 > name1) {
        return -1
    } else return 0
})
const traits2 = [...glossary2.values()].map(id => Equation.getExtraEffect(id)).sort((a, b) => {
    const name1 = textMap.getText(a?.ExtraEffectName)
    const name2 = textMap.getText(b?.ExtraEffectName)

    if (name1 > name2) {
        return 1
    } else if (name2 > name1) {
        return -1
    } else return 0
})

for (const trait of traits) {
    output.push(
        `===${textMap.getText(trait?.ExtraEffectName)}===`,
        `${textMap.getText(trait?.ExtraEffectDesc, trait?.DescParamList).replaceAll('\n', '<br />')}`,
        ''
    )
}
for (const trait of traits2) {
    output2.push(
        `===${textMap.getText(trait?.ExtraEffectName)}===`,
        `${textMap.getText(trait?.ExtraEffectDesc, trait?.DescParamList).replaceAll('\n', '<br />')}`,
        ''
    )
}

output.push('==История изменений==', '{{История изменений|2.3}}', '', '[[en:]]');
output2.push('==История изменений==', '{{История изменений|2.3}}', '', '[[en:]]');

await writeFile('./output/du-paths.wikitext', output.join('\n'));
await writeFile('./output/du-paths2.wikitext', output2.join('\n'));

teardown()