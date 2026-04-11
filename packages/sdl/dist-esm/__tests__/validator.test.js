import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { validate } from '../validator';
const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const fixture = (name) => {
    const yaml = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
    return parse(yaml).data;
};
describe('validate', () => {
    describe('valid input', () => {
        it('accepts a core-only v1.1 document', () => {
            const result = validate({
                sdlVersion: '1.1',
                solution: {
                    name: 'CoreOnly',
                    description: 'Minimal SDL v1.1 document',
                    stage: 'MVP',
                },
                architecture: {
                    style: 'modular-monolith',
                    projects: {
                        backend: [{ name: 'api', framework: 'nodejs' }],
                    },
                },
                data: {
                    primaryDatabase: { type: 'postgres', hosting: 'managed' },
                },
            });
            assert.equal(result.valid, true);
            assert.equal(result.errors.length, 0);
            assert.ok(result.summary);
            assert.equal(result.summary.artifactsToGenerate, 0);
        });
        it('accepts the TaskFlow minimal example', () => {
            const result = validate(fixture('taskflow.yaml'));
            assert.equal(result.valid, true);
            assert.equal(result.errors.length, 0);
            assert.ok(result.summary);
            assert.equal(result.summary.architecture, 'modular-monolith');
            assert.equal(result.summary.projects, 2);
            assert.equal(result.summary.artifactsToGenerate, 5);
        });
        it('allows x- extension fields', () => {
            const data = fixture('taskflow.yaml');
            data['x-custom'] = 'extension value';
            const result = validate(data);
            assert.equal(result.valid, true);
        });
    });
    describe('missing required fields', () => {
        it('rejects SDL missing required core fields', () => {
            const result = validate(fixture('missing-required.yaml'));
            assert.equal(result.valid, false);
            assert.ok(result.errors.length > 0);
            const codes = result.errors.map(e => e.code);
            assert.ok(codes.includes('MISSING_REQUIRED'), `Expected MISSING_REQUIRED in ${JSON.stringify(codes)}`);
        });
    });
    describe('conditional rules (allOf)', () => {
        it('rejects Azure + CloudFormation', () => {
            const result = validate(fixture('azure-cloudformation.yaml'));
            assert.equal(result.valid, false);
            const codes = result.errors.map(e => e.code);
            assert.ok(codes.includes('INCOMPATIBLE_CLOUD_IAC'), `Expected INCOMPATIBLE_CLOUD_IAC in ${JSON.stringify(codes)}`);
        });
        it('rejects MongoDB + EF Core', () => {
            const result = validate(fixture('mongodb-efcore.yaml'));
            assert.equal(result.valid, false);
            const codes = result.errors.map(e => e.code);
            assert.ok(codes.includes('INCOMPATIBLE_DATABASE_ORM'), `Expected INCOMPATIBLE_DATABASE_ORM in ${JSON.stringify(codes)}`);
        });
        it('rejects PII without encryptionAtRest', () => {
            const result = validate(fixture('pii-no-encryption.yaml'));
            assert.equal(result.valid, false);
            const codes = result.errors.map(e => e.code);
            assert.ok(codes.includes('PII_REQUIRES_ENCRYPTION'), `Expected PII_REQUIRES_ENCRYPTION in ${JSON.stringify(codes)}`);
        });
    });
    describe('enum validation', () => {
        it('rejects invalid architecture style', () => {
            const data = fixture('taskflow.yaml');
            data.architecture.style = 'monolith';
            const result = validate(data);
            assert.equal(result.valid, false);
            const enumError = result.errors.find(e => e.code === 'INVALID_ENUM');
            assert.ok(enumError, 'Expected INVALID_ENUM error');
            assert.ok(enumError.fix.includes('modular-monolith'));
        });
    });
    describe('additionalProperties', () => {
        it('rejects unknown fields without x- prefix', () => {
            const data = fixture('taskflow.yaml');
            data.solution.unknownField = 'bad';
            const result = validate(data);
            assert.equal(result.valid, false);
            const unknownError = result.errors.find(e => e.code === 'UNKNOWN_FIELD');
            assert.ok(unknownError, 'Expected UNKNOWN_FIELD error');
            assert.ok(unknownError.fix.includes('x-'));
        });
    });
});
