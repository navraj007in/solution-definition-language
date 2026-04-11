import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { detectWarnings } from '../warnings';
const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const loadSDL = (name) => {
    const yaml = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
    return parse(yaml).data;
};
describe('detectWarnings', () => {
    it('warns about microservices with small team', () => {
        const sdl = loadSDL('microservices-small-team.yaml');
        const warnings = detectWarnings(sdl);
        const complexity = warnings.find(w => w.code === 'COMPLEXITY_EXCEEDS_TEAM_CAPACITY');
        assert.ok(complexity, 'Expected COMPLEXITY_EXCEEDS_TEAM_CAPACITY warning');
        assert.ok(complexity.message.includes('1 developer'));
        assert.ok(complexity.recommendation.includes('modular-monolith'));
    });
    it('does not warn about modular-monolith with small team', () => {
        const sdl = loadSDL('taskflow.yaml');
        const warnings = detectWarnings(sdl);
        const complexity = warnings.find(w => w.code === 'COMPLEXITY_EXCEEDS_TEAM_CAPACITY');
        assert.equal(complexity, undefined);
    });
    it('does not warn when auth is present for multi-persona', () => {
        const sdl = loadSDL('taskflow.yaml');
        // TaskFlow has auth defined, so no warning
        const warnings = detectWarnings(sdl);
        const authWarning = warnings.find(w => w.code === 'MISSING_RECOMMENDED_FIELD');
        assert.equal(authWarning, undefined);
    });
    it('warns about multi-persona with admin but no auth', () => {
        const sdl = loadSDL('taskflow.yaml');
        delete sdl.auth;
        sdl.product.personas.push({ name: 'Admin', goals: ['Manage users'], accessLevel: 'admin' });
        const warnings = detectWarnings(sdl);
        const authWarning = warnings.find(w => w.code === 'MISSING_RECOMMENDED_FIELD');
        assert.ok(authWarning, 'Expected MISSING_RECOMMENDED_FIELD warning');
        assert.ok(authWarning.message.includes('Admin'));
    });
    it('produces no warnings for well-balanced TaskFlow', () => {
        const sdl = loadSDL('taskflow.yaml');
        const warnings = detectWarnings(sdl);
        assert.equal(warnings.length, 0, `Unexpected warnings: ${JSON.stringify(warnings)}`);
    });
});
