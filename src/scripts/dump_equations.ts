import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { Blessing } from '../Blessing.js';
import { ChangeHistory } from '../ChangeHistory.js';
import { Equation, PERIOD_MAP } from '../Equation.js';
import { replaceUnderlinedEE } from '../ExtraEffect.js';
import { sanitizeString } from '../Shared.js';
import { pathDisplayName, TextMap, textMap } from '../TextMap.js';
import { pageInfoHeader } from '../util/General.js';
import { Table } from '../util/Table.js';
const equations = Equation.loadAll();
const output: string[] = ['{{Вкладки Расходящейся вселенной}}', '']
const output2: string[] = ['{{Вкладки Расходящейся вселенной}}', '']
const glossary = new Set();
const glossary2 = new Set();
function addBlessingPath(path) {
    output2.push(`===${pathDisplayName(path)}===`);
    const blessings = [...Blessing.loadAll(true)].sort((a, b) => ((a.id - (a.rarity * 1000000000)) - (b.id - (b.rarity * 1000000000))));
    const table = new Table('sortable mw-collapsible article-table', ['Иконка', 'Название', 'Эффект', 'Усиленный эффект'])
    for (const blessing of blessings) {
        if (blessing.path != pathDisplayName(path) || blessing.active || blessing.enhanced)
            continue;
        const enhanced = blessings.find(eblessing => eblessing.buff_id == blessing.buff_id && eblessing.enhanced);
        table.addRowWithAttr(`id="${blessing.name.replaceAll('"', '&quot;').replaceAll("''", '')}"`, [
            `{{SU Blessing Card|${pathDisplayName(blessing.path)}|${blessing.icon_variant}|${blessing.rarity}}}`,
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
    const name1 = textMap.getText(a?.ExtraEffectName);
    const name2 = textMap.getText(b?.ExtraEffectName);
    if (name1 > name2) {
        return 1;
    }
    else if (name2 > name1) {
        return -1;
    }
    else
        return 0;
});
const traits2 = [...glossary2.values()].map(id => Equation.getExtraEffect(id)).sort((a, b) => {
    const name1 = textMap.getText(a?.ExtraEffectName);
    const name2 = textMap.getText(b?.ExtraEffectName);
    if (name1 > name2) {
        return 1;
    }
    else if (name2 > name1) {
        return -1;
    }
    else
        return 0;
});
for (const trait of traits) {
    output.push(`===${textMap.getText(trait?.ExtraEffectName)}===`, `${textMap.getText(trait?.ExtraEffectDesc, trait?.DescParamList).replaceAll('\n', '<br />')}`, '');
}
for (const trait of traits2) {
    output2.push(`===${textMap.getText(trait?.ExtraEffectName)}===`, `${textMap.getText(trait?.ExtraEffectDesc, trait?.DescParamList).replaceAll('\n', '<br />')}`, '');
}
output.push('==История изменений==', '{{История изменений|2.3}}', '', '[[en:]]');
output2.push('==История изменений==', '{{История изменений|2.3}}', '', '[[en:]]');
await writeFile('./output/du-paths.wikitext', output.join('\n'));
await writeFile('./output/du-paths2.wikitext', output2.join('\n'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVtcF9lcXVhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkdW1wX2VxdWF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDeEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFekMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBRXBDLE1BQU0sTUFBTSxHQUFhLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFDNUQsTUFBTSxPQUFPLEdBQWEsQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7QUFFbkMsU0FBUyxlQUFlLENBQUMsSUFBWTtJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sZUFBZSxDQUFDLElBQUks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