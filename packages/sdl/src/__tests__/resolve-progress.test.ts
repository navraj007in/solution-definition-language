import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../index';
import { resolveProgress } from '../progress';
import type { SDLDocument, BackendProject, Database } from '../types';
import type { ProgressEvidence } from '../progress/progress.types';

const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');

/** A fully-normalized SDLDocument, built from the TaskFlow fixture so every
 * field resolveProgress's category resolvers expect is actually present —
 * with its backend ORM and primary database swapped to the given values. */
function docWithBackend(orm: BackendProject['orm'], dbType: Database['type']): SDLDocument {
  const yaml = readFileSync(join(FIXTURES_DIR, 'taskflow.yaml'), 'utf-8');
  const result = compile(yaml);
  assert.ok(result.success, `fixture must compile: ${JSON.stringify(result.errors)}`);
  const doc = result.document as SDLDocument;
  doc.architecture.projects.backend![0].orm = orm;
  doc.data.primaryDatabase = { type: dbType, hosting: 'managed' };
  return doc;
}

describe('resolveProgress — database components', () => {
  it('reaches "done" for a Mongoose-backed database once data model + driver evidence exists', () => {
    // Regression test: DB_SCHEMA_FILES has no fixed-filename convention for
    // Mongoose (schemas are inline JS/TS), so the "Schema file detected"
    // check must not be included for it — otherwise resolveStatus (which
    // requires every check to pass) can never report "done".
    const doc = docWithBackend('mongoose', 'mongodb');
    const evidence: ProgressEvidence = {
      deliverables: [{ type: 'data_model', title: 'Data Model', createdAt: '2026-01-01' }],
      completedPhases: [],
      codebaseSignals: {
        detectedDependencies: { mongoose: '^8.0.0' },
        detectedFiles: [],
        detectedConfigs: [],
      },
    };

    const snapshot = resolveProgress(doc, evidence);
    const dbCategory = snapshot.categories.find((c) => c.category === 'databases');
    assert.ok(dbCategory);
    const db = dbCategory!.components.find((c) => c.id.startsWith('database:'));
    assert.ok(db, 'expected a database component');
    assert.equal(db!.status, 'done', `expected "done", got "${db!.status}" with evidence ${JSON.stringify(db!.evidence)}`);
    assert.ok(!db!.evidence.includes('Schema file detected'), 'Mongoose has no schema-file signal to report');
  });

  it('still requires a schema file for ORMs that do have a fixed convention (e.g. Prisma)', () => {
    const doc = docWithBackend('prisma', 'postgres');
    const evidenceWithoutSchema: ProgressEvidence = {
      deliverables: [{ type: 'data_model', title: 'Data Model', createdAt: '2026-01-01' }],
      completedPhases: [],
      codebaseSignals: {
        detectedDependencies: { '@prisma/client': '^5.0.0' },
        detectedFiles: [],
        detectedConfigs: [],
      },
    };

    const withoutSchema = resolveProgress(doc, evidenceWithoutSchema);
    const dbWithout = withoutSchema.categories.find((c) => c.category === 'databases')!.components[0];
    assert.equal(dbWithout.status, 'in_progress');

    const evidenceWithSchema: ProgressEvidence = {
      ...evidenceWithoutSchema,
      codebaseSignals: {
        ...evidenceWithoutSchema.codebaseSignals!,
        detectedFiles: ['prisma/schema.prisma'],
      },
    };
    const withSchema = resolveProgress(doc, evidenceWithSchema);
    const dbWith = withSchema.categories.find((c) => c.category === 'databases')!.components[0];
    assert.equal(dbWith.status, 'done');
  });
});
