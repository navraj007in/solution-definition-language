import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../index';
function extractQuickExample(readme) {
    const match = readme.match(/## Quick Example\s+```yaml\n([\s\S]*?)\n```/);
    assert.ok(match, 'README Quick Example block not found');
    return match[1];
}
describe('README examples', () => {
    it('compiles the Quick Example against the active SDL contract', () => {
        const readme = readFileSync(join(__dirname, '..', '..', '..', '..', 'README.md'), 'utf-8');
        const quickExample = extractQuickExample(readme);
        const result = compile(quickExample);
        assert.equal(result.success, true, JSON.stringify(result.errors, null, 2));
        assert.ok(result.document);
        assert.equal(result.document.sdlVersion, '1.1');
        assert.equal(result.document.solution.stage, 'MVP');
        assert.equal(result.document.architecture.projects.frontend?.[0].framework, 'nextjs');
        assert.equal(result.document.architecture.projects.backend?.[0].framework, 'nodejs');
    });
});
