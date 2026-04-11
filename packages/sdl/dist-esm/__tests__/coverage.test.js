/**
 * Test coverage parity for exported APIs with thin or missing coverage:
 *   - diff()
 *   - classifyDiffForAdr()
 *   - generateAdrDraftFromDiff()
 *   - buildPricingSummaryForPrompt()
 *   - generateDeployDiagram()
 *   - migrate()
 *   - generateComplianceChecklist()
 *   - summarizeGenerationResults()
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../index';
import { diff } from '../diff';
import { classifyDiffForAdr } from '../adr-impact';
import { generateAdrDraftFromDiff } from '../adr-draft';
import { buildPricingSummaryForPrompt } from '../pricing';
import { generateDeployDiagram } from '../generators/deploy-diagram';
import { migrate } from '../migrate';
import { generateComplianceChecklist, summarizeGenerationResults, generate } from '../generators';
const FIXTURES = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
function loadCompiled(name) {
    const yaml = readFileSync(join(FIXTURES, name), 'utf-8');
    const result = compile(yaml);
    assert.ok(result.success, `fixture ${name} should compile`);
    return result.document;
}
// ─── diff() ───
describe('diff()', () => {
    it('returns identical:true for the same document', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = diff(doc, doc);
        assert.ok(result.identical);
        assert.equal(result.changes.length, 0);
    });
    it('detects a changed scalar field', () => {
        const a = loadCompiled('taskflow.yaml');
        const b = JSON.parse(JSON.stringify(a));
        b.solution.stage = 'Growth';
        const result = diff(a, b);
        assert.ok(!result.identical);
        const change = result.changes.find((c) => c.path.includes('stage'));
        assert.ok(change, 'should detect stage change');
        assert.equal(change.type, 'changed');
    });
    it('detects an added section', () => {
        const a = loadCompiled('minimal-noauth.yaml');
        const b = JSON.parse(JSON.stringify(a));
        b.testing = { unit: { framework: 'vitest' } };
        const result = diff(a, b);
        assert.ok(!result.identical);
        assert.ok(result.changes.some((c) => c.type === 'added' && c.path.includes('testing')));
    });
    it('detects a removed section', () => {
        const a = loadCompiled('taskflow.yaml');
        const b = JSON.parse(JSON.stringify(a));
        delete b.auth;
        const result = diff(a, b);
        assert.ok(!result.identical);
        assert.ok(result.changes.some((c) => c.type === 'removed' && c.path.includes('auth')));
    });
    it('returns a non-empty summary for non-identical docs', () => {
        const a = loadCompiled('taskflow.yaml');
        const b = JSON.parse(JSON.stringify(a));
        b.solution.stage = 'Growth';
        const result = diff(a, b);
        assert.ok(result.summary.length > 0);
    });
});
// ─── classifyDiffForAdr() (uses its own SdlDiffResult format) ───
describe('classifyDiffForAdr()', () => {
    it('returns empty suggestions for empty diff', () => {
        const result = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: false, sectionChanges: [], hasChanges: false,
        });
        assert.equal(result.suggestions.length, 0);
    });
    it('detects architecture style change via solution section', () => {
        // classifyArchitectureStyle looks for path === 'architecture.style' or 'style' in any section
        const result = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [
                { section: 'solution', fields: [{ path: 'architecture.style', before: 'modular-monolith', after: 'microservices' }] },
            ],
            hasChanges: true,
        });
        assert.ok(result.suggestions.length > 0, 'should produce at least one suggestion');
    });
    it('detects auth strategy change', () => {
        const result = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'auth', fields: [{ path: 'strategy', before: 'oidc', after: 'api-key' }] }],
            hasChanges: true,
        });
        assert.ok(result.suggestions.some((s) => s.category === 'authentication'));
    });
    it('detects cloud platform change', () => {
        const result = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'deployment', fields: [{ path: 'cloud', before: 'vercel', after: 'aws' }] }],
            hasChanges: true,
        });
        assert.ok(result.suggestions.some((s) => s.category === 'cloud-platform'));
    });
    it('each suggestion has category, severity, confidence, and reasonCodes', () => {
        const result = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'deployment', fields: [{ path: 'cloud', before: 'vercel', after: 'aws' }] }],
            hasChanges: true,
        });
        for (const s of result.suggestions) {
            assert.ok(s.category, 'category required');
            assert.ok(s.severity, 'severity required');
            assert.ok(s.confidence, 'confidence required');
            assert.ok(Array.isArray(s.reasonCodes), 'reasonCodes required');
        }
    });
});
// ─── generateAdrDraftFromDiff() ───
describe('generateAdrDraftFromDiff()', () => {
    it('produces a draft for a cloud platform suggestion', () => {
        const impact = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'deployment', fields: [{ path: 'cloud', before: 'vercel', after: 'aws' }] }],
            hasChanges: true,
        });
        assert.ok(impact.suggestions.length > 0);
        const suggestion = impact.suggestions[0];
        const doc = loadCompiled('taskflow.yaml');
        const draft = generateAdrDraftFromDiff(doc, suggestion);
        assert.ok(draft.title, 'draft needs a title');
        assert.ok(draft.context, 'draft needs context');
        assert.ok(draft.decision, 'draft needs a decision');
        assert.ok(draft.consequences, 'draft needs consequences');
        assert.equal(draft.sourceCategory, suggestion.category);
    });
    it('draft has sourceCategory matching the suggestion', () => {
        const impact = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'architecture', fields: [{ path: 'style', before: 'modular-monolith', after: 'microservices' }] }],
            hasChanges: true,
        });
        const doc = loadCompiled('taskflow.yaml');
        for (const suggestion of impact.suggestions) {
            const draft = generateAdrDraftFromDiff(doc, suggestion);
            assert.equal(draft.sourceCategory, suggestion.category);
        }
    });
    it('draft alternatives is an array', () => {
        const impact = classifyDiffForAdr({
            added: [], removed: [], modified: [],
            crossCuttingChanged: true,
            sectionChanges: [{ section: 'auth', fields: [{ path: 'auth.strategy', before: 'oidc', after: 'api-key' }] }],
            hasChanges: true,
        });
        const doc = loadCompiled('taskflow.yaml');
        const draft = generateAdrDraftFromDiff(doc, impact.suggestions[0]);
        assert.ok(Array.isArray(draft.alternatives));
    });
});
// ─── buildPricingSummaryForPrompt() ───
describe('buildPricingSummaryForPrompt()', () => {
    it('returns a non-empty string', () => {
        const summary = buildPricingSummaryForPrompt();
        assert.ok(typeof summary === 'string' && summary.length > 0);
    });
    it('includes platform pricing info', () => {
        const summary = buildPricingSummaryForPrompt();
        assert.ok(summary.includes('$') || summary.includes('USD') || summary.includes('cost'), 'should include pricing info');
    });
    it('is deterministic', () => {
        const a = buildPricingSummaryForPrompt();
        const b = buildPricingSummaryForPrompt();
        assert.equal(a, b);
    });
});
// ─── generateDeployDiagram() ───
describe('generateDeployDiagram()', () => {
    it('returns a result with files', () => {
        const result = generateDeployDiagram({
            strategy: 'blue-green',
            services: [
                { name: 'api', platform: 'ECS', estimatedCost: 50 },
                { name: 'web', platform: 'S3+CloudFront', estimatedCost: 10 },
            ],
            monthlyCost: { min: 50, max: 80, typical: 60 },
        });
        assert.ok(result, 'should return a result');
        assert.ok(Array.isArray(result.files) && result.files.length > 0, 'should have files');
    });
    it('output contains mermaid graph syntax', () => {
        const result = generateDeployDiagram({
            strategy: 'rolling',
            services: [{ name: 'api', platform: 'Cloud Run', estimatedCost: 30 }],
        });
        const content = result.files[0].content;
        assert.ok(content.includes('graph') || content.includes('TB') || content.includes('LR'), 'should include mermaid syntax');
    });
    it('is deterministic', () => {
        const input = {
            strategy: 'canary',
            services: [
                { name: 'api', platform: 'ECS', estimatedCost: 50 },
            ],
        };
        const a = generateDeployDiagram(input);
        const b = generateDeployDiagram(input);
        assert.equal(JSON.stringify(a.files), JSON.stringify(b.files));
    });
});
// ─── migrate() ───
describe('migrate()', () => {
    it('returns clean:true for already-valid SDL', () => {
        const yaml = readFileSync(join(FIXTURES, 'taskflow.yaml'), 'utf-8');
        const result = migrate(yaml);
        assert.ok(result.clean, 'valid SDL should be clean');
        assert.equal(result.changes.length, 0);
    });
    it('fixes stage: mvp → MVP', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: mvp
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`.trim();
        const result = migrate(yaml);
        assert.ok(!result.clean);
        assert.ok(result.changes.some((c) => c.path === 'solution.stage' && c.to === 'MVP'));
        assert.equal(result.document.solution.stage, 'MVP');
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes framework: express → nodejs', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: express
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.from === 'express' && c.to === 'nodejs'));
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes framework: fastapi → python-fastapi', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: fastapi
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.from === 'fastapi' && c.to === 'python-fastapi'));
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes auth.strategy: jwt → oidc with sessions.accessToken', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
auth:
  strategy: jwt
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.path === 'auth.strategy'));
        assert.equal(result.document.auth.strategy, 'oidc');
        assert.equal(result.document.auth.sessions.accessToken, 'jwt');
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes contracts as array → object with apis array', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
contracts:
  - name: User API
    type: rest
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.path === 'contracts'));
        assert.ok(Array.isArray(result.document.contracts.apis));
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes slos as array → object with services array', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
slos:
  - name: api
    availability: "99.9%"
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.path === 'slos'));
        assert.ok(Array.isArray(result.document.slos.services));
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('fixes unknown root key → x- prefixed', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
navigationPatterns:
  primary: sidebar
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.some((c) => c.to === 'x-navigationPatterns'));
        assert.ok('x-navigationPatterns' in result.document);
        assert.ok(!('navigationPatterns' in result.document));
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
    it('migrated output compiles clean for multiple stacked issues', () => {
        const yaml = `
sdlVersion: "1.1"
solution:
  name: Test
  description: A test application for migration testing
  stage: mvp
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: express
data:
  primaryDatabase:
    type: postgres
    hosting: managed
contracts:
  - name: REST API
    type: rest
`.trim();
        const result = migrate(yaml);
        assert.ok(result.changes.length >= 2);
        assert.ok(result.compilesClean, `errors: ${result.remainingErrors.join(', ')}`);
    });
});
// ─── generateComplianceChecklist() ───
describe('generateComplianceChecklist()', () => {
    it('returns tier advisory', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = generateComplianceChecklist(doc);
        assert.equal(result.tier, 'advisory');
    });
    it('output file path is compliance-checklist.md', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = generateComplianceChecklist(doc);
        assert.ok(result.files.some((f) => f.path.endsWith('compliance-checklist.md')));
    });
    it('produces a generic baseline when no compliance section', () => {
        const doc = loadCompiled('minimal-noauth.yaml');
        const result = generateComplianceChecklist(doc);
        const content = result.files[0].content;
        assert.ok(content.includes('# Compliance Checklist'));
    });
    it('produces framework content for GDPR', () => {
        const doc = loadCompiled('taskflow.yaml');
        doc.compliance = { frameworks: [{ name: 'GDPR', applicable: true }] };
        const result = generateComplianceChecklist(doc);
        const content = result.files[0].content;
        assert.ok(content.includes('GDPR'));
        assert.ok(content.includes('- [ ]'));
    });
    it('marks not-applicable frameworks separately', () => {
        const doc = loadCompiled('taskflow.yaml');
        doc.compliance = {
            frameworks: [
                { name: 'GDPR', applicable: true },
                { name: 'HIPAA', applicable: false },
            ],
        };
        const result = generateComplianceChecklist(doc);
        const content = result.files[0].content;
        assert.ok(content.includes('Not Applicable'));
    });
    it('includes advisory review header on markdown file', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = generateComplianceChecklist(doc);
        assert.ok(result.files[0].content.includes('sdl:generated tier:advisory'));
    });
    it('metadata includes framework names', () => {
        const doc = loadCompiled('taskflow.yaml');
        doc.compliance = { frameworks: [{ name: 'SOC2-Type2', applicable: true }] };
        const result = generateComplianceChecklist(doc);
        assert.ok(result.metadata.frameworks.includes('SOC2-Type2'));
    });
});
// ─── summarizeGenerationResults() ───
describe('summarizeGenerationResults()', () => {
    it('returns a string with total count', () => {
        const doc = loadCompiled('taskflow.yaml');
        const results = ['openapi', 'adr'].map((t) => generate(doc, t)).filter(Boolean);
        const summary = summarizeGenerationResults(results);
        assert.ok(typeof summary === 'string' && summary.length > 0);
        assert.ok(summary.includes('2'));
    });
    it('includes deterministic tier label', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = generate(doc, 'openapi');
        const summary = summarizeGenerationResults([result]);
        assert.ok(summary.includes('deterministic'));
    });
    it('includes advisory tier label and review guidance', () => {
        const doc = loadCompiled('taskflow.yaml');
        const result = generate(doc, 'adr');
        const summary = summarizeGenerationResults([result]);
        assert.ok(summary.includes('advisory'));
        assert.ok(summary.includes('review') || summary.includes('draft'));
    });
    it('handles empty results gracefully', () => {
        const summary = summarizeGenerationResults([]);
        assert.ok(typeof summary === 'string');
        assert.ok(summary.includes('0'));
    });
    it('shows inferred tier label', () => {
        const doc = loadCompiled('taskflow.yaml');
        const { generateCodingRules } = require('../generators');
        const result = generateCodingRules(doc);
        assert.ok(result, 'coding-rules should generate');
        const summary = summarizeGenerationResults([result]);
        assert.ok(summary.includes('inferred'));
    });
});
