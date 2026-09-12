import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = value => '`' + String(value).replaceAll('|', '\\|').replaceAll('`', '&#96;') + '`';
export function renderCatalogue(schema) {
  const lines = [
    '# SDL v2 field catalogue', '',
    '**Unreleased draft.** This catalogue is rendered from [sdl-v2.schema.json](sdl-v2.schema.json); [the consolidated contract](FULL-SPEC.md) and its linked semantic slices supply meanings and cross-field rules. No package definitions are required.', '',
    'Each group is a reusable schema definition; `$` is the root document. Dotted paths describe nested fields, `[]` array items, and `<oneOf N>`/`<anyOf N>` alternative shapes. Required means required when its containing object/declaration exists, subject to ST-002 fragment assembly. Array-item rows are not themselves named fields. Unlisted lower bounds are zero; omitted fields stay absent. Conditional predicates are shown verbatim so requiredness is not lost in a flat table. All numbers are exact input-profile values.', '',
    'Regenerate with `node spec/v2/conformance/render-catalogue.mjs --write`. The corpus checker compares this file with the rendering to detect drift.', ''
  ];
  function visit(node, label, presence) {
    let shape = node.$ref ? node.$ref.replace('#/definitions/', '') : node.type ?? (node.oneOf ? 'one alternative' : node.anyOf ? 'one or more alternatives' : 'any input-profile value');
    if (node.type === 'object') shape += node.additionalProperties === true ? ' (open)' : ' (closed; x-* allowed)';
    const constraints = [];
    for (const key of ['const', 'enum', 'minLength', 'maxLength', 'pattern', 'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum', 'minItems', 'maxItems', 'uniqueItems', 'required', 'dependencies', 'allOf', 'if', 'then', 'else', 'not']) {
      if (Object.hasOwn(node, key)) constraints.push(code(key + ': ' + JSON.stringify(node[key])));
    }
    lines.push(`| ${code(label)} | ${shape} | ${presence} | ${constraints.join('; ') || '—'} |`);
    for (const [key, child] of Object.entries(node.properties ?? {})) visit(child, label === '$' ? key : label + '.' + key, (node.required ?? []).includes(key) ? 'required' : 'optional');
    if (node.items) visit(node.items, label + '[]', 'item');
    for (const keyword of ['oneOf', 'anyOf']) for (const [i, child] of (node[keyword] ?? []).entries()) {
      // Constraint-only alternatives are shown as complete predicates, not invented fields.
      if (!child.type && !child.$ref) lines.push(`| ${code(label + ' <' + keyword + ' ' + (i + 1) + '>')} | predicate | conditional | ${code(JSON.stringify(child))} |`);
      else visit(child, label + ' <' + keyword + ' ' + (i + 1) + '>', 'alternative');
    }
  }
  for (const [name, definition] of [['Document', schema], ...Object.entries(schema.definitions)]) {
    lines.push('## ' + name, '', '| Path | Shape | Presence | Structural constraints |', '|---|---|---|---|');
    visit(definition, name === 'Document' ? '$' : name, name === 'Document' ? 'required' : 'when referenced');
    lines.push('');
  }
  return lines.join('\n');
}
if (process.argv.includes('--write')) fs.writeFileSync(path.join(directory, 'FIELD-CATALOGUE.md'), renderCatalogue(JSON.parse(fs.readFileSync(path.join(directory, 'sdl-v2.schema.json'), 'utf8'))));
