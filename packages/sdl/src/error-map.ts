import type { ErrorObject } from 'ajv';
import type { ValidationError } from './types';

// ─── allOf conditional rule mappings (by index in schema's allOf array) ───

const ALLOF_RULES: Record<number, { code: string; message: string; fix: string }> = {
  0: {
    code: 'MICROSERVICES_REQUIRES_SERVICES',
    message: 'Microservices architecture requires at least 2 services',
    fix: 'Add 2+ entries to architecture.services, or change architecture.style to "modular-monolith"',
  },
  1: {
    code: 'OIDC_REQUIRES_PROVIDER',
    message: 'OIDC strategy requires a provider to be specified',
    fix: 'Add auth.provider (e.g., "auth0", "cognito", "clerk")',
  },
  2: {
    code: 'PII_REQUIRES_ENCRYPTION',
    message: 'PII data requires encryptionAtRest: true',
    fix: 'Set nonFunctional.security.encryptionAtRest to true',
  },
  3: {
    code: 'INCOMPATIBLE_CLOUD_IAC',
    message: 'CloudFormation can only be used with AWS (cloud: "aws")',
    fix: 'Change deployment.cloud to "aws", or use "terraform" / "bicep" for Azure',
  },
  4: {
    code: 'INCOMPATIBLE_DATABASE_ORM',
    message: 'MongoDB cannot be used with Entity Framework Core — use Mongoose instead',
    fix: 'Change ORM to "mongoose" for MongoDB, or change database type to a SQL database',
  },
};

// ─── Main mapping function ───

export function mapAjvErrors(errors: ErrorObject[]): ValidationError[] {
  const result: ValidationError[] = [];
  const seen = new Set<string>();

  for (const err of errors) {
    const mapped = mapSingleError(err);
    if (!mapped) continue;

    // Deduplicate by code+path
    const key = `${mapped.code}:${mapped.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push(mapped);
  }

  return result;
}

function mapSingleError(err: ErrorObject): ValidationError | null {
  // Check if this is an allOf conditional rule error
  const allOfMatch = err.schemaPath.match(/#\/allOf\/(\d+)\//);
  if (allOfMatch) {
    return mapAllOfError(err, parseInt(allOfMatch[1], 10));
  }

  // Standard schema errors
  const path = instancePathToDot(err.instancePath);

  switch (err.keyword) {
    case 'required':
      return {
        type: 'error',
        code: 'MISSING_REQUIRED',
        path: path ? `${path}.${err.params.missingProperty}` : err.params.missingProperty,
        message: `Missing required field '${path ? `${path}.` : ''}${err.params.missingProperty}'`,
        fix: `Add the '${err.params.missingProperty}' field`,
      };

    case 'enum':
      return {
        type: 'error',
        code: 'INVALID_ENUM',
        path,
        message: `Invalid value for '${path}'`,
        fix: `Allowed values: ${(err.params.allowedValues as string[]).join(', ')}`,
      };

    case 'additionalProperties':
      return {
        type: 'error',
        code: 'UNKNOWN_FIELD',
        path: path ? `${path}.${err.params.additionalProperty}` : err.params.additionalProperty,
        message: `Unknown field '${err.params.additionalProperty}' at '${path || 'root'}'`,
        fix: `Remove the field, or prefix with 'x-' for custom extensions`,
      };

    case 'type':
      return {
        type: 'error',
        code: 'INVALID_TYPE',
        path,
        message: `'${path}' must be of type ${err.params.type}`,
        fix: `Provide a ${err.params.type} value`,
      };

    case 'pattern':
      return {
        type: 'error',
        code: 'INVALID_FORMAT',
        path,
        message: `'${path}' does not match the required pattern`,
        fix: patternFixHint(path, err.params.pattern as string),
      };

    case 'minLength':
      return {
        type: 'error',
        code: 'VALUE_TOO_SHORT',
        path,
        message: `'${path}' must be at least ${err.params.limit} characters`,
        fix: `Provide a longer value (minimum ${err.params.limit} characters)`,
      };

    case 'maxLength':
      return {
        type: 'error',
        code: 'VALUE_TOO_LONG',
        path,
        message: `'${path}' must be at most ${err.params.limit} characters`,
        fix: `Shorten the value (maximum ${err.params.limit} characters)`,
      };

    case 'minItems':
      return {
        type: 'error',
        code: 'ARRAY_TOO_SHORT',
        path,
        message: `'${path}' must have at least ${err.params.limit} item(s)`,
        fix: `Add at least ${err.params.limit} item(s)`,
      };

    case 'minimum':
      return {
        type: 'error',
        code: 'VALUE_TOO_LOW',
        path,
        message: `'${path}' must be >= ${err.params.limit}`,
        fix: `Provide a value of at least ${err.params.limit}`,
      };

    case 'const':
      return {
        type: 'error',
        code: 'INVALID_VALUE',
        path,
        message: `'${path}' must be ${JSON.stringify(err.params.allowedValue)}`,
        fix: `Set to ${JSON.stringify(err.params.allowedValue)}`,
      };

    // Skip 'if' keyword errors — these are intermediate, the 'then' errors have the real info
    case 'if':
      return null;

    default:
      return {
        type: 'error',
        code: 'SCHEMA_ERROR',
        path,
        message: `Validation error at '${path}': ${err.message || err.keyword}`,
      };
  }
}

function mapAllOfError(err: ErrorObject, ruleIndex: number): ValidationError | null {
  // Skip intermediate 'if' evaluations — only report the 'then'/'not' failures
  if (err.keyword === 'if') return null;

  const rule = ALLOF_RULES[ruleIndex];
  if (rule) {
    return {
      type: 'error',
      code: rule.code,
      path: instancePathToDot(err.instancePath) || 'root',
      message: rule.message,
      fix: rule.fix,
    };
  }

  // Fallback for unknown allOf rules
  const path = instancePathToDot(err.instancePath);
  return {
    type: 'error',
    code: 'CONDITIONAL_RULE_VIOLATION',
    path: path || 'root',
    message: `Conditional validation failed: ${err.message || 'unknown rule'}`,
  };
}

// ─── Helpers ───

function instancePathToDot(instancePath: string): string {
  if (!instancePath) return '';
  return instancePath.replace(/^\//, '').replace(/\//g, '.');
}

function patternFixHint(path: string, pattern: string): string {
  if (path === 'solution.name' || path.endsWith('.name')) {
    return 'Use only letters, numbers, spaces, and hyphens';
  }
  if (path.includes('availability.target')) {
    return 'Use format like "99.9" or "99.99" (two digits, dot, one or two digits)';
  }
  return `Value must match pattern: ${pattern}`;
}
