import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { renderCatalogue } from './render-catalogue.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const require = createRequire(path.join(repository, 'packages/sdl/package.json'));
const YAML = require('yaml');
const prose = ['FOUNDATIONS.md', 'OWNERSHIP-BINDINGS.md', 'CONTRACTS-ERRORS.md', 'DOMAIN-METADATA.md', 'SCOPE-OPERATIONS.md', 'NORMALIZATION.md', 'FULL-SPEC.md', 'DIAGNOSTICS.md', 'RELEASE-MIGRATION.md']
  .map(filename => fs.readFileSync(path.join(directory, '..', filename), 'utf8')).join('\n');
const declaredRules = new Set([...prose.matchAll(/(?:\*\*|\| )((?:IN|ST|ID|IM|SC|DM|NM|CF|OB|EC|DX|SO|ND|FD|DG|BL|MG)-\d{3})/g)].map(match => match[1]));
const cases = [];
for (const [filename, target] of [['cases.yaml', 'sdl-v2-foundations-draft'], ['bindings.yaml', 'sdl-v2-bindings-draft'], ['contracts.yaml', 'sdl-v2-contracts-draft'], ['domain-metadata.yaml', 'sdl-v2-domain-metadata-draft'], ['scope-operations.yaml', 'sdl-v2-scope-operations-draft'], ['normalization.yaml', 'sdl-v2-normalization-draft'], ['full-document.yaml', 'sdl-v2-full-document-draft'], ['diagnostics.yaml', 'sdl-v2-diagnostics-draft'], ['release-migration.yaml', 'sdl-v2-release-migration-draft']]) {
  const manifest = YAML.parse(fs.readFileSync(path.join(directory, filename), 'utf8'), { version: '1.2', uniqueKeys: true });
  assert.equal(manifest.format, 'sdl-conformance-cases/v1');
  assert.equal(manifest.target, target);
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length > 0);
  cases.push(...manifest.cases);
}

// Specification-owned structural artifacts only; SDL package validators are not invoked.
const Ajv = require('ajv');
const ajv = new Ajv({ strict: true, strictRequired: false, strictTypes: false, allErrors: true });
const documentSchema = JSON.parse(fs.readFileSync(path.join(directory, '../sdl-v2.schema.json'), 'utf8'));
const reportSchema = JSON.parse(fs.readFileSync(path.join(directory, '../diagnostics.schema.json'), 'utf8'));
const releaseSchema = JSON.parse(fs.readFileSync(path.join(directory, '../release-manifest.schema.json'), 'utf8'));
const migrationSchema = JSON.parse(fs.readFileSync(path.join(directory, '../migration.schema.json'), 'utf8'));
const checkStructure = ajv.compile(documentSchema);
const checkReportStructure = ajv.compile(reportSchema);
const checkReleaseStructure = ajv.compile(releaseSchema);
const checkMigrationStructure = ajv.compile(migrationSchema);
assert.equal(fs.readFileSync(path.join(directory, '../FIELD-CATALOGUE.md'), 'utf8'), renderCatalogue(documentSchema), 'field catalogue drift');
// Definitions must be self-contained and must never annotate architecture defaults.
function checkSchema(node) {
  if (node === null || typeof node !== 'object') return;
  if (node.$ref) assert.ok(node.$ref.startsWith('#/definitions/'), 'nonlocal schema reference');
  if (typeof node.type === 'string' && has(node, 'default')) assert.fail('schema default annotation');
  for (const value of Object.values(node)) checkSchema(value);
}
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.hasOwn(value, key);
const scopes = new Set(['input', 'identity', 'scalar', 'domain', 'composition', 'normalization', 'bindings', 'contracts', 'domain-metadata', 'scope-operations', 'normalization-result', 'full-document', 'diagnostics', 'release-migration']);
const outcomes = new Set(['accept', 'reject', 'resource-failure']);
const resultKeys = ['value', 'assertions', 'contributions', 'meaning', 'edges', 'targets', 'effectiveFields', 'opaqueTypes'];
const seen = new Set();
const covered = new Set();
const counts = {};
let parsedSources = 0;

checkSchema(documentSchema);
checkSchema(reportSchema);
checkSchema(releaseSchema);
checkSchema(migrationSchema);

const migrationPlan = JSON.parse(fs.readFileSync(path.join(directory, '../migrations/v1.1-to-v2.0-draft.1.json'), 'utf8'));
const migrationRecords = new Map(migrationPlan.records.map(record => [record.id, record]));
const publishedBaselines = new Set(['sdl-v1.1-2026-09-12', 'sdl-v2.0-draft.1']);
const baselineVersions = new Map([['sdl-v1.1-2026-09-12', '1.1'], ['sdl-v2.0-draft.1', '2.0']]);

// Checks report shape, internal source links, scope IDs, and outcome consistency.
// It cannot establish the truth of an architectural finding or a claimed completed scope.
function reportViolations(report, item) {
  if (!checkReportStructure(report)) return ['DG-001'];
  const violations = new Set();
  if (!publishedBaselines.has(report.scope.baseline)) violations.add('DG-004');
  const ids = new Set();
  for (const source of report.sources) {
    if (ids.has(source.id)) violations.add('DG-002');
    ids.add(source.id);
    if (!has(item.sourceValues ?? {}, source.id) && !(item.unavailableSources ?? []).includes(source.id)) violations.add('DG-002');
  }
  function location(loc) {
    if (!ids.has(loc.source)) violations.add('DG-002');
    if (has(loc, 'path')) {
      if (!has(item.sourceValues ?? {}, loc.source) || !readPath(item.sourceValues[loc.source], loc.path).present) violations.add('DG-002');
    }
  }
  const errors = report.diagnostics.filter(diagnostic => diagnostic.severity === 'error');
  const resources = report.diagnostics.filter(diagnostic => diagnostic.category === 'resource');
  if (resources.some(diagnostic => diagnostic.severity !== 'error')) violations.add('DG-003');
  if (report.outcome === 'accept' && errors.length) violations.add('DG-003');
  if (report.outcome === 'reject' && (!errors.some(diagnostic => diagnostic.category === 'validation') || resources.length)) violations.add('DG-003');
  if (report.outcome === 'resource-failure' && !resources.some(diagnostic => diagnostic.severity === 'error')) violations.add('DG-003');
  for (const rule of report.scope.rules ?? []) if (!declaredRules.has(rule)) violations.add('DG-004');
  for (const diagnostic of report.diagnostics) {
    if (!declaredRules.has(diagnostic.rule) || (report.scope.kind === 'rules' && !report.scope.rules.includes(diagnostic.rule))) violations.add('DG-004');
    location(diagnostic.location);
    for (const related of diagnostic.related ?? []) location(related);
  }
  for (const advice of report.advice) if (advice.location) location(advice.location);
  return [...violations];
}

function loadArtifact(relative) {
  const filename = path.resolve(directory, relative);
  const withinDraft = path.relative(path.resolve(directory, '..'), filename);
  assert.ok(withinDraft !== '..' && !withinDraft.startsWith('../') && !path.isAbsolute(withinDraft));
  return YAML.parse(fs.readFileSync(filename, 'utf8'), { version: '1.2', uniqueKeys: true });
}

function releaseViolations(manifest, verifyHashes) {
  const violations = new Set();
  if (!checkReleaseStructure(manifest)) {
    const statusOnly = checkReleaseStructure.errors?.every(error => error.instancePath === '/status' || error.schemaPath.includes('/status/'));
    violations.add(statusOnly ? 'BL-003' : 'BL-002');
    return [...violations];
  }
  const paths = manifest.authority.map(entry => entry.path);
  const precedence = manifest.authority.map(entry => entry.precedence);
  const [year, month, day] = manifest.published.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const validDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!validDate || new Set(paths).size !== paths.length || new Set(precedence).size !== precedence.length || precedence.some((value, index) => index > 0 && value <= precedence[index - 1])) violations.add('BL-002');
  if (verifyHashes) for (const entry of manifest.authority) {
    const filename = path.resolve(repository, entry.path);
    const relative = path.relative(repository, filename);
    if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative) || !fs.existsSync(filename)) {
      violations.add('BL-002');
      continue;
    }
    const digest = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    if (digest !== entry.sha256) violations.add('BL-002');
  }
  return [...violations];
}

function classificationValid(record) {
  if (['editorial', 'compatible-addition'].includes(record.classification)) return record.compatibility === 'compatible';
  if (record.classification === 'semantic-clarification') return ['compatible', 'conditional'].includes(record.compatibility);
  if (record.classification === 'relaxed-validation') return ['compatible', 'conditional'].includes(record.compatibility);
  return record.compatibility === 'breaking';
}

function planViolations(plan, requireCoverage) {
  if (!checkMigrationStructure(plan) || plan.format !== 'sdl-migration-plan/v1') return ['MG-001'];
  const violations = new Set();
  if (!publishedBaselines.has(plan.from.baseline) || !publishedBaselines.has(plan.to.baseline) || baselineVersions.get(plan.from.baseline) !== plan.from.sdlVersion || baselineVersions.get(plan.to.baseline) !== plan.to.sdlVersion) violations.add('MG-001');
  const ids = plan.records.map(record => record.id);
  if (new Set(ids).size !== ids.length) violations.add('MG-001');
  for (const record of plan.records) {
    if (!classificationValid(record)) violations.add('BL-004');
    if (record.action.mode === 'automatic' && ['review', 'restructure'].includes(record.action.operation)) violations.add('MG-002');
    if (record.action.mappings && new Set(record.action.mappings.map(mapping => JSON.stringify(mapping.from))).size !== record.action.mappings.length) violations.add('MG-002');
    for (const rule of record.rules) if (!declaredRules.has(rule) || rule.startsWith('BL-') || rule.startsWith('MG-')) violations.add('MG-001');
  }
  if (requireCoverage) {
    const assigned = new Set(plan.records.flatMap(record => record.rules));
    for (const rule of declaredRules) if (!rule.startsWith('BL-') && !rule.startsWith('MG-') && !assigned.has(rule)) violations.add('BL-004');
  }
  return [...violations];
}

function setPath(value, parts, state) {
  const parent = readPath(value, parts.slice(0, -1));
  if (!parent.present || parent.value === null || typeof parent.value !== 'object') return false;
  const key = parts.at(-1);
  if (state.present) parent.value[key] = structuredClone(state.value);
  else delete parent.value[key];
  return true;
}

function migrationResultViolations(result, item) {
  if (!checkMigrationStructure(result) || result.format !== 'sdl-migration-result/v1') return ['MG-006'];
  const violations = new Set();
  const operationAllowed = (record, operation) => record && (record.action.operation === operation || (['rename', 'move'].includes(record.action.operation) && ['remove', 'add'].includes(operation)));
  if (result.plan !== migrationPlan.id || result.sourceBaseline !== migrationPlan.from.baseline || result.targetBaseline !== migrationPlan.to.baseline) violations.add('MG-007');
  for (const decision of result.decisions) {
    if (!migrationRecords.has(decision.record) || new Set(decision.options.map(option => option.id)).size !== decision.options.length) violations.add('MG-004');
    for (const option of decision.options) for (const change of option.patch ?? []) if (change.record !== decision.record || !operationAllowed(migrationRecords.get(change.record), change.operation)) violations.add('MG-004');
  }
  for (const diagnostic of result.diagnostics) if (!['MG-003', 'MG-007'].includes(diagnostic.record) && !migrationRecords.has(diagnostic.record)) violations.add('MG-004');
  let lastRecord = -1;
  let lastPath = '';
  for (const change of result.changes) {
    const record = migrationRecords.get(change.record);
    const recordIndex = migrationPlan.records.findIndex(candidate => candidate.id === change.record);
    const permittedOperation = operationAllowed(record, change.operation);
    if (!permittedOperation || recordIndex < lastRecord || (recordIndex === lastRecord && JSON.stringify(change.path) < lastPath) || isDeepStrictEqual(change.before, change.after)) violations.add('MG-005');
    lastRecord = recordIndex;
    lastPath = JSON.stringify(change.path);
  }
  const errors = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error');
  const resources = result.diagnostics.filter(diagnostic => diagnostic.category === 'resource');
  if (resources.some(diagnostic => diagnostic.severity !== 'error')) violations.add('MG-006');
  if (result.outcome === 'migrated' && (!has(result, 'document') || has(result, 'candidate') || result.decisions.length || errors.length || !checkStructure(result.document) || has(result.document, 'imports') || has(result.document, 'techDebt'))) violations.add('MG-006');
  if (result.outcome === 'needs-decision' && (!result.decisions.length || has(result, 'document'))) violations.add('MG-006');
  if (result.outcome === 'reject' && (!errors.some(diagnostic => ['validation', 'precondition'].includes(diagnostic.category)) || resources.length || has(result, 'document') || has(result, 'candidate'))) violations.add('MG-006');
  if (result.outcome === 'resource-failure' && (!resources.some(diagnostic => diagnostic.severity === 'error') || has(result, 'document') || has(result, 'candidate'))) violations.add('MG-006');
  if (has(item, 'sourceValue')) {
    const replay = structuredClone(item.sourceValue);
    for (const change of result.changes) {
      if (!isDeepStrictEqual(readPath(replay, change.path), change.before) || !setPath(replay, change.path, change.after)) violations.add('MG-005');
    }
    const target = result.document ?? result.candidate;
    if (target && !isDeepStrictEqual(replay, target)) violations.add('MG-005');
  }
  return [...violations];
}

function migrationArtifactViolations(item, artifact) {
  if (item.artifactKind === 'release-manifest') return releaseViolations(artifact, has(item, 'artifactFile') || item.verifyHashes === true);
  if (item.artifactKind === 'migration-plan') return planViolations(artifact, has(item, 'artifactFile'));
  if (item.artifactKind === 'migration-result') return migrationResultViolations(artifact, item);
  return ['MG-001'];
}

function checkSource(source, label) {
  assert.equal(typeof source, 'string', `${label}: source must be a string`);
  const documents = YAML.parseAllDocuments(source, { version: '1.2', schema: 'core', uniqueKeys: true });
  assert.equal(documents.length, 1, `${label}: accepted source must have one YAML document`);
  assert.deepEqual(documents[0].errors.map(error => error.message), [], `${label}: YAML errors`);
  const value = documents[0].toJS();
  assert.ok(isObject(value), `${label}: accepted source must decode to a mapping`);
  parsedSources += 1;
  return value;
}

function readPath(value, parts) {
  assert.ok(Array.isArray(parts));
  for (const part of parts) {
    assert.ok(typeof part === 'string' || (Number.isInteger(part) && part >= 0));
    if (value === null || typeof value !== 'object' || (Array.isArray(value) ? typeof part !== 'number' : typeof part !== 'string') || !has(value, part)) return { present: false };
    value = value[part];
  }
  return { present: true, value };
}

function terminalPaths(value, prefix = []) {
  if (value === null || typeof value !== 'object' || Object.keys(value).length === 0) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => terminalPaths(child, [...prefix, Array.isArray(value) ? Number(key) : key]));
}

// Check positive result artifacts for packaging, lineage coverage, and journal reconstruction.
// This does not decide debt/compliance semantics or generate a normalized SDL value.
function checkResult(result, item, assembled) {
  assert.equal(result.format, 'sdl-normalization-result/v1');
  assert.ok(isObject(result.document) && isObject(item.sourceValues));
  const { sources, origins, changes } = result.provenance;
  assert.ok(Array.isArray(sources) && Array.isArray(origins) && Array.isArray(changes) && Array.isArray(result.suggestions));
  const sourceIds = new Set();
  for (const source of sources) {
    assert.ok(typeof source.id === 'string' && source.id.length > 0 && !sourceIds.has(source.id));
    assert.ok(['source', 'assembled'].includes(source.kind) && has(item.sourceValues, source.id));
    sourceIds.add(source.id);
  }
  function inputs(locators, allowEmpty = false) {
    assert.ok(Array.isArray(locators) && (allowEmpty || locators.length > 0));
    assert.equal(new Set(locators.map(locator => JSON.stringify([locator.source, locator.path]))).size, locators.length);
    for (const locator of locators) {
      assert.ok(sourceIds.has(locator.source));
      assert.equal(readPath(item.sourceValues[locator.source], locator.path).present, true, `${item.id}: input locator missing`);
    }
  }
  const expectedPaths = terminalPaths(result.document).map(parts => JSON.stringify(parts)).sort();
  assert.deepEqual(origins.map(origin => JSON.stringify(origin.path)).sort(), expectedPaths, `${item.id}: terminal origin coverage`);
  for (const origin of origins) {
    inputs(origin.inputs);
    assert.ok(['source', 'canonical'].includes(origin.kind));
    if (origin.kind === 'canonical') assert.ok(['ND-002', 'NM-002'].includes(origin.rule));
    else {
      assert.ok(!has(origin, 'rule'));
      for (const locator of origin.inputs) assert.deepEqual(readPath(result.document, origin.path), readPath(item.sourceValues[locator.source], locator.path));
    }
  }
  const replay = structuredClone(assembled);
  for (const event of changes) {
    assert.ok(['ND-002', 'NM-002'].includes(event.rule) && ['canonicalize', 'shadow'].includes(event.kind));
    inputs(event.inputs);
    for (const state of [event.before, event.after]) {
      assert.equal(typeof state.present, 'boolean');
      assert.equal(has(state, 'value'), state.present);
    }
    assert.notDeepEqual(event.before, event.after);
    assert.deepEqual(readPath(assembled, event.path), event.before, `${item.id}: before snapshot`);
    assert.deepEqual(readPath(result.document, event.path), event.after, `${item.id}: after snapshot`);
    assert.ok(event.path.length > 0);
    const parent = readPath(replay, event.path.slice(0, -1));
    assert.ok(parent.present && isObject(parent.value));
    if (event.after.present) Object.defineProperty(parent.value, event.path.at(-1), { value: structuredClone(event.after.value), writable: true, enumerable: true, configurable: true });
    else delete parent.value[event.path.at(-1)];
  }
  assert.deepEqual(replay, result.document, `${item.id}: journal reconstruction`);
  for (const suggestion of result.suggestions) {
    assert.ok(isObject(suggestion.profile) && ['id', 'version'].every(key => typeof suggestion.profile[key] === 'string' && suggestion.profile[key].length > 0));
    assert.ok(Array.isArray(suggestion.path) && has(suggestion, 'value'));
    assert.ok(typeof suggestion.reason === 'string' && /[^ \t\r\n]/.test(suggestion.reason));
    inputs(suggestion.inputs, true);
  }
}

for (const item of cases) {
  assert.ok(isObject(item), 'case must be an object');
  assert.match(item.id, /^[a-z][a-z0-9-]+$/);
  assert.ok(!seen.has(item.id), `duplicate case: ${item.id}`);
  seen.add(item.id);
  assert.ok(scopes.has(item.scope), `${item.id}: unknown scope`);
  counts[item.scope] = (counts[item.scope] ?? 0) + 1;
  assert.ok(Array.isArray(item.rules) && item.rules.length > 0, `${item.id}: rules required`);
  assert.equal(new Set(item.rules).size, item.rules.length, `${item.id}: repeated rule`);
  for (const rule of item.rules) {
    assert.ok(declaredRules.has(rule), `${item.id}: unknown rule ${rule}`);
    covered.add(rule);
  }
  const expected = item.expected;
  assert.ok(isObject(expected) && outcomes.has(expected.outcome), `${item.id}: expected outcome required`);
  if (item.scope === 'full-document') {
    assert.ok(['accept', 'reject'].includes(expected.structure), `${item.id}: structural expectation required`);
    const valid = checkStructure(item.value);
    assert.equal(valid, expected.structure === 'accept', `${item.id}: structural result differs: ${JSON.stringify(checkStructure.errors)}`);
    if (expected.outcome === 'accept') {
      assert.ok(checkStructure(expected.value), `${item.id}: normalized result fails structure: ${JSON.stringify(checkStructure.errors)}`);
      assert.ok(!has(expected.value, 'imports') && !has(expected.value, 'techDebt'), `${item.id}: normalized result retains input metadata/alias`);
    }
    if (item.files) {
      assert.ok(has(item.files, item.root));
      for (const [name, source] of Object.entries(item.files)) {
        assert.ok(!path.posix.isAbsolute(name) && !name.includes('\\') && !name.split('/').some(part => part === '..' || part === '.' || part === ''));
        checkSource(source, `${item.id}/${name}`);
      }
      for (const name of expected.contributions ?? []) assert.ok(has(item.files, name));
      if (expected.contributions) {
        assert.equal(new Set(expected.contributions).size, expected.contributions.length);
        assert.equal(expected.contributions.at(-1), item.root);
      }
    }
  }
  if (item.scope === 'diagnostics') {
    assert.deepEqual(reportViolations(item.value, item).sort(), [...(expected.violations ?? [])].sort(), `${item.id}: diagnostic artifact expectation differs`);
  }
  if (item.scope === 'release-migration') {
    const artifact = item.artifactFile ? loadArtifact(item.artifactFile) : item.value;
    assert.ok(isObject(artifact), `${item.id}: artifact must be an object`);
    assert.deepEqual(migrationArtifactViolations(item, artifact).sort(), [...(expected.violations ?? [])].sort(), `${item.id}: release/migration artifact expectation differs`);
  }
  if (item.reportFile) {
    const filename = path.resolve(directory, item.reportFile);
    const relative = path.relative(path.resolve(directory, '..'), filename);
    assert.ok(relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative));
    assert.deepEqual(YAML.parse(fs.readFileSync(filename, 'utf8')), item.value, `${item.id}: report example drift`);
  }
  if (item.resultFile) {
    const filename = path.resolve(directory, item.resultFile);
    const relative = path.relative(path.resolve(directory, '..'), filename);
    assert.ok(relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative));
    assert.deepEqual(YAML.parse(fs.readFileSync(filename, 'utf8'), { version: '1.2', uniqueKeys: true }), expected.result, `${item.id}: result example drift`);
  }
  if (expected.outcome === 'accept' && expected.result) {
    assert.deepEqual(expected.result.document, expected.value);
    checkResult(expected.result, item, item.value);
  }
  if (expected.outcome === 'accept' && item.scope === 'normalization-result') checkResult(item.value, item, item.assembledInput);
  for (const key of ['resources', 'resourceFailures']) {
    if (!has(item, key)) continue;
    assert.ok(isObject(item[key]), `${item.id}: ${key} must be a mapping`);
    for (const [filename, value] of Object.entries(item[key])) {
      assert.ok(filename.length > 0 && !path.posix.isAbsolute(filename) && !filename.includes('\\') && !filename.split('/').some(part => part === '..' || part === '.' || part === ''));
      assert.equal(path.posix.normalize(filename), filename, `${item.id}: resource keys must be canonical`);
      if (key === 'resources') assert.equal(typeof value, 'string');
      else {
        assert.ok(['permission-denied', 'limit-exceeded'].includes(value));
        assert.ok(!has(item.resources ?? {}, filename), `${item.id}: resource cannot also fail`);
      }
    }
  }
  for (const [virtualPath, sourceFile] of Object.entries(item.resourceFiles ?? {})) {
    const filename = path.resolve(directory, sourceFile);
    const relative = path.relative(path.resolve(directory, '..'), filename);
    assert.ok(relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative));
    assert.equal(fs.readFileSync(filename, 'utf8'), item.resources?.[virtualPath], `${item.id}: external example drift`);
  }
  if (has(item, 'records')) {
    assert.equal(item.scope, 'domain-metadata');
    assert.ok(isObject(item.records), `${item.id}: records must be an entity mapping`);
    for (const records of Object.values(item.records)) assert.ok(Array.isArray(records) && records.every(isObject), `${item.id}: record sets must contain objects`);
  }
  if (has(item, 'observation')) {
    assert.equal(item.scope, 'contracts');
    const observation = item.observation;
    assert.ok(isObject(observation));
    assert.equal(typeof observation.api, 'string');
    assert.ok(Number.isInteger(observation.failedExecution) && observation.failedExecution > 0);
    assert.ok(observation.replaySafe === null || typeof observation.replaySafe === 'boolean');
    assert.ok(Number.isInteger(observation.status));
    assert.ok(observation.code === null || typeof observation.code === 'string');
    if (has(observation, 'retryAfter')) assert.ok(Array.isArray(observation.retryAfter) && observation.retryAfter.every(value => typeof value === 'string'));
    if (has(observation, 'responseReceivedAt')) assert.ok(Number.isFinite(Date.parse(observation.responseReceivedAt)));
    if (has(observation, 'remainingDeadlineMs')) assert.ok(Number.isFinite(observation.remainingDeadlineMs) && observation.remainingDeadlineMs >= 0);
  }
  if (item.sourceFile) {
    const filename = path.resolve(directory, item.sourceFile);
    const relative = path.relative(path.resolve(directory, '..'), filename);
    assert.ok(relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative), `${item.id}: sourceFile must stay within the draft`);
    assert.deepEqual(checkSource(fs.readFileSync(filename, 'utf8'), item.id), item.value, `${item.id}: worked example differs from case`);
  }
  if (expected.outcome === 'accept') {
    assert.ok(resultKeys.some(key => has(expected, key)), `${item.id}: observable expected result required`);
    assert.ok(!has(expected, 'violations'), `${item.id}: accepted case cannot require violations`);
  } else {
    assert.ok(Array.isArray(expected.violations) && expected.violations.length > 0, `${item.id}: required violations missing`);
    for (const rule of expected.violations) assert.ok(item.rules.includes(rule), `${item.id}: violation ${rule} not in governing rules`);
    if (expected.outcome === 'resource-failure') assert.equal(expected.partialResultIsConformant, false);
  }
  for (const warning of [...(expected.warnings ?? []), ...(expected.forbiddenWarnings ?? [])]) {
    assert.ok(item.rules.includes(warning.rule), `${item.id}: warning rule missing`);
    assert.equal(typeof warning.kind, 'string');
  }
  for (const forbidden of expected.forbiddenWarnings ?? []) {
    assert.ok(!(expected.warnings ?? []).some(warning => warning.rule === forbidden.rule && warning.kind === forbidden.kind), `${item.id}: advisory both required and forbidden`);
  }
  for (const assertion of expected.assertions ?? []) {
    assert.ok(Array.isArray(assertion.path), `${item.id}: assertion path must be an array`);
    assert.ok(assertion.path.every(part => typeof part === 'string' || (Number.isInteger(part) && part >= 0)));
    assert.notEqual(has(assertion, 'equals'), has(assertion, 'length'), `${item.id}: choose equals or length`);
    if (has(assertion, 'length')) assert.ok(Number.isInteger(assertion.length) && assertion.length >= 0);
  }
  for (const target of expected.targets ?? []) {
    for (const key of ['sourcePath', 'targetPath']) {
      assert.ok(Array.isArray(target[key]) && target[key].length > 0, `${item.id}: target path required`);
      let current = item.value;
      for (const part of target[key]) {
        assert.ok(current !== null && typeof current === 'object' && has(current, part), `${item.id}: target path does not exist`);
        current = current[part];
      }
    }
  }
  if (item.scope === 'input') {
    assert.equal(typeof item.source, 'string');
    if (expected.outcome === 'accept') assert.deepEqual(checkSource(item.source, item.id), expected.value, `${item.id}: decoded value differs`);
  } else if (item.scope === 'composition') {
    assert.ok(isObject(item.files) && has(item.files, item.root), `${item.id}: root source missing`);
    for (const [filename, source] of Object.entries(item.files)) {
      assert.ok(!path.posix.isAbsolute(filename) && !filename.includes('\\') && !filename.split('/').includes('..'));
      assert.equal(path.posix.normalize(filename), filename, `${item.id}: file keys must be canonical`);
      assert.equal(typeof source, 'string');
      if (expected.outcome === 'accept') checkSource(source, `${item.id}/${filename}`);
    }
    for (const filename of expected.contributions ?? []) assert.ok(has(item.files, filename), `${item.id}: unknown contribution ${filename}`);
    if (expected.contributions) {
      assert.equal(new Set(expected.contributions).size, expected.contributions.length, `${item.id}: repeated contribution`);
      assert.equal(expected.contributions.at(-1), item.root, `${item.id}: root must contribute last`);
    }
    if (item.limits) assert.ok(Number.isInteger(item.limits.maxImportDepth) && item.limits.maxImportDepth >= 3);
  } else if (item.scope !== 'release-migration') {
    assert.ok(has(item, 'value'), `${item.id}: decoded input required`);
    if (item.scope === 'scalar') assert.equal(typeof item.field, 'string');
    else assert.ok(isObject(item.value), `${item.id}: fragment must be an object`);
  }
}

// CF-001 defines the observable result format checked above; it is not a separate input predicate.
for (const rule of declaredRules) assert.ok(rule === 'CF-001' || covered.has(rule), `no case covers ${rule}`);
console.log(`Checked ${seen.size} cases, ${covered.size} input/semantic rules, and ${parsedSources} parsed YAML sources.`);
console.log(JSON.stringify(counts));
console.log('Corpus integrity passed. This is not a v2 implementation-conformance result.');
