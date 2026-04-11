import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
// Fixtures live in src/ but tests run from dist/ — resolve to src path
const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const fixture = (name) => readFileSync(join(FIXTURES_DIR, name), 'utf-8');
describe('parse', () => {
    it('parses valid YAML into an object', () => {
        const result = parse(fixture('taskflow.yaml'));
        assert.equal(result.errors.length, 0);
        assert.ok(result.data);
        assert.equal(result.data.sdlVersion, '1.1');
    });
    it('returns EMPTY_INPUT for empty string', () => {
        const result = parse('');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'EMPTY_INPUT');
    });
    it('returns EMPTY_INPUT for whitespace-only string', () => {
        const result = parse('   \n\n  ');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'EMPTY_INPUT');
    });
    it('returns INVALID_YAML for null document', () => {
        const result = parse('---\n');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'INVALID_YAML');
    });
    it('returns INVALID_YAML for array at root', () => {
        const result = parse('- item1\n- item2\n');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'INVALID_YAML');
        assert.ok(result.errors[0].message.includes('array'));
    });
    it('returns INVALID_YAML for scalar at root', () => {
        const result = parse('just a string');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'INVALID_YAML');
    });
    it('returns YAML_PARSE_ERROR for malformed YAML', () => {
        const result = parse('key: {\nbad yaml');
        assert.equal(result.data, null);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].code, 'YAML_PARSE_ERROR');
    });
});
