import { parse as yamlParse, YAMLParseError } from 'yaml';
import { ValidationError } from './types';

export interface ParseResult {
  data: unknown | null;
  errors: ValidationError[];
}

export function parse(yamlString: string): ParseResult {
  if (!yamlString || typeof yamlString !== 'string' || yamlString.trim().length === 0) {
    return {
      data: null,
      errors: [{
        type: 'error',
        code: 'EMPTY_INPUT',
        path: '',
        message: 'SDL input is empty',
        fix: 'Provide a valid YAML document',
      }],
    };
  }

  try {
    const data = yamlParse(yamlString);

    if (data === null || data === undefined) {
      return {
        data: null,
        errors: [{
          type: 'error',
          code: 'INVALID_YAML',
          path: '',
          message: 'SDL must be a YAML mapping (object), got empty document',
          fix: 'Ensure your SDL file starts with valid YAML key-value pairs',
        }],
      };
    }

    if (typeof data !== 'object' || Array.isArray(data)) {
      return {
        data: null,
        errors: [{
          type: 'error',
          code: 'INVALID_YAML',
          path: '',
          message: `SDL must be a YAML mapping (object), got ${Array.isArray(data) ? 'array' : typeof data}`,
          fix: 'Ensure your SDL file starts with valid YAML key-value pairs like "sdlVersion: \\"0.1\\""',
        }],
      };
    }

    return { data, errors: [] };
  } catch (err: unknown) {
    if (err instanceof YAMLParseError) {
      const line = err.linePos?.[0]?.line;
      const col = err.linePos?.[0]?.col;
      const location = line ? ` at line ${line}, column ${col}` : '';

      return {
        data: null,
        errors: [{
          type: 'error',
          code: 'YAML_PARSE_ERROR',
          path: '',
          message: `YAML parse error${location}: ${err.message}`,
          fix: 'Check YAML syntax — common issues: incorrect indentation, missing colons, unquoted special characters',
        }],
      };
    }

    return {
      data: null,
      errors: [{
        type: 'error',
        code: 'YAML_PARSE_ERROR',
        path: '',
        message: `YAML parse error: ${err instanceof Error ? err.message : String(err)}`,
        fix: 'Check YAML syntax',
      }],
    };
  }
}
