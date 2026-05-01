#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

function usage() {
  console.error('Usage: node validate-sdl.mjs <file.sdl.yaml> [--repo <path>] [--json]');
}

function parseArgs(argv) {
  const args = { file: null, repo: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') {
      args.repo = argv[i + 1];
      i += 1;
    } else if (arg === '--json') {
      args.json = true;
    } else if (!args.file) {
      args.file = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.file) {
    throw new Error('Missing SDL file path.');
  }
  return args;
}

function findUp(startDir, predicate) {
  let dir = path.resolve(startDir);
  while (true) {
    if (predicate(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function findRepo(explicitRepo, sdlFile) {
  if (explicitRepo) {
    const repo = path.resolve(explicitRepo);
    if (!fs.existsSync(repo)) {
      throw new Error(`Repo path does not exist: ${repo}`);
    }
    return repo;
  }

  const start = fs.statSync(sdlFile).isDirectory() ? sdlFile : path.dirname(sdlFile);
  return findUp(start, dir => (
    fs.existsSync(path.join(dir, 'packages/sdl/dist/index.js')) ||
    fs.existsSync(path.join(dir, 'packages/sdl/src/index.ts')) ||
    fs.existsSync(path.join(dir, 'schema/sdl-v1.1.schema.json'))
  ));
}

function loadSdlCore(repo) {
  if (!repo) return null;
  const builtCjs = path.join(repo, 'packages/sdl/dist/index.js');
  if (!fs.existsSync(builtCjs)) return null;
  const requireFromCore = createRequire(builtCjs);
  return requireFromCore(builtCjs);
}

function formatIssue(issue) {
  const pathText = issue.path ? ` at ${issue.path}` : '';
  const code = issue.code ? `[${issue.code}] ` : '';
  return `${code}${issue.message}${pathText}`;
}

function readFileForImports(rootFile) {
  return importPath => {
    const resolved = path.resolve(path.dirname(rootFile), importPath);
    return fs.readFileSync(resolved, 'utf8');
  };
}

function validateWithCore(core, yamlText, filePath) {
  const hasImports = /^\s*imports\s*:/m.test(yamlText);
  if (hasImports && typeof core.compileWithImports === 'function') {
    return core.compileWithImports(yamlText, readFileForImports(filePath), filePath);
  }
  if (typeof core.compile === 'function') {
    return core.compile(yamlText);
  }
  throw new Error('Loaded SDL core package does not expose compile().');
}

function printHuman(result, repo) {
  if (repo) {
    console.log(`SDL repo: ${repo}`);
  }
  if (result.success) {
    console.log('SDL validation: OK');
    if (result.summary) {
      console.log(`Summary: ${JSON.stringify(result.summary)}`);
    }
    if (Array.isArray(result.inferences) && result.inferences.length > 0) {
      console.log(`Normalizer inferences: ${result.inferences.length}`);
    }
    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of result.warnings) {
        console.log(`- ${formatIssue(warning)}`);
      }
    }
    if (Array.isArray(result.resolveWarnings) && result.resolveWarnings.length > 0) {
      console.log('Resolve warnings:');
      for (const warning of result.resolveWarnings) {
        console.log(`- ${warning.message}`);
      }
    }
    return;
  }

  console.log('SDL validation: FAILED');
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`- ${formatIssue(error)}`);
    }
  }
  if (Array.isArray(result.resolveErrors) && result.resolveErrors.length > 0) {
    console.log('Resolve errors:');
    for (const error of result.resolveErrors) {
      console.log(`- ${error.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(args.file);
  const yamlText = fs.readFileSync(filePath, 'utf8');
  const repo = findRepo(args.repo, filePath);
  const core = loadSdlCore(repo);

  if (!core) {
    throw new Error('Could not find built SDL core package. Run `npm install && npm run build` in packages/sdl, or pass --repo to solution-definition-language.');
  }

  const result = validateWithCore(core, yamlText, filePath);
  if (args.json) {
    console.log(JSON.stringify({ repo, ...result }, null, 2));
  } else {
    printHuman(result, repo);
  }
  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error(`validate-sdl: ${error.message}`);
  usage();
  process.exit(2);
});
