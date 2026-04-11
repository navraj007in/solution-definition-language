/**
 * Generates an OpenAPI 3.1 specification from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Entity/API source (in priority order):
 *   1. contracts.apis[] + domain.entities[] — used when present; authoritative
 *   2. Inference from personas, core flows, and auth — fallback when absent
 */
export function generateOpenApiSpec(doc) {
    const backends = doc.architecture.projects.backend || [];
    const primaryBackend = backends[0];
    const entities = resolveEntities(doc);
    const contractTags = resolveContractTags(doc);
    const spec = buildSpec(doc, primaryBackend, entities, contractTags);
    const yaml = toYaml(spec);
    const files = [
        {
            path: 'artifacts/api/openapi.yaml',
            content: yaml,
        },
    ];
    return {
        artifactType: 'openapi',
        files,
        metadata: {
            solutionName: doc.solution.name,
            endpointCount: countEndpoints(spec.paths),
            schemaCount: Object.keys(spec.components.schemas).length,
            entities: entities.map((e) => e.name),
        },
    };
}
/**
 * Returns API contract tags from contracts.apis[] when present.
 * These are used to annotate the spec with declared ownership and API type.
 */
function resolveContractTags(doc) {
    if (!doc.contracts?.apis || doc.contracts.apis.length === 0)
        return [];
    return doc.contracts.apis.map((api) => ({
        name: api.name,
        type: api.type ?? 'rest',
        owner: api.owner,
    }));
}
/**
 * Returns entities from domain.entities[] when present (authoritative),
 * otherwise falls back to inference from product personas and core flows.
 */
function resolveEntities(doc) {
    if (doc.domain?.entities && doc.domain.entities.length > 0) {
        return entitiesFromDomain(doc);
    }
    return inferEntities(doc);
}
/**
 * Converts domain.entities[] SDL declarations into InferredEntity format.
 * Always prepends a User entity when auth is present and no User is declared.
 */
function entitiesFromDomain(doc) {
    const entities = [];
    const seen = new Set();
    const hasDomainUser = doc.domain.entities.some((e) => e.name.toLowerCase() === 'user');
    if (!hasDomainUser && doc.auth && doc.auth.strategy !== 'none') {
        const userFields = [
            { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
            { name: 'email', type: 'string', required: true, description: 'User email address' },
            { name: 'name', type: 'string', required: true, description: 'Display name' },
        ];
        if (doc.auth.roles && doc.auth.roles.length > 0) {
            userFields.push({ name: 'role', type: 'string', required: true, description: `One of: ${doc.auth.roles.join(', ')}` });
        }
        userFields.push({ name: 'createdAt', type: 'string', required: true, description: 'ISO 8601 timestamp' }, { name: 'updatedAt', type: 'string', required: true, description: 'ISO 8601 timestamp' });
        entities.push({ name: 'User', fields: userFields });
        seen.add('user');
    }
    for (const domainEntity of doc.domain.entities) {
        if (seen.has(domainEntity.name.toLowerCase()))
            continue;
        seen.add(domainEntity.name.toLowerCase());
        const fields = [];
        for (const f of domainEntity.fields ?? []) {
            fields.push({
                name: f.name,
                type: sdlTypeToOpenApiType(f.type),
                required: f.required !== false && f.nullable !== true,
                description: f.description,
            });
        }
        if (!fields.some((f) => f.name === 'id')) {
            fields.unshift({ name: 'id', type: 'string', required: true, description: 'Unique identifier' });
        }
        entities.push({ name: domainEntity.name, fields });
    }
    return entities;
}
/** Map SDL field type strings to OpenAPI type strings */
function sdlTypeToOpenApiType(sdlType) {
    const map = {
        uuid: 'string',
        string: 'string',
        varchar: 'string',
        text: 'string',
        int: 'integer',
        integer: 'integer',
        bigint: 'integer',
        float: 'number',
        decimal: 'number',
        boolean: 'boolean',
        bool: 'boolean',
        date: 'string',
        datetime: 'string',
        timestamp: 'string',
        json: 'object',
        jsonb: 'object',
        enum: 'string',
    };
    return map[sdlType.toLowerCase()] ?? 'string';
}
function inferEntities(doc) {
    const entities = [];
    const seenNames = new Set();
    // Always add User entity if auth exists
    if (doc.auth && doc.auth.strategy !== 'none') {
        const userFields = [
            { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
            { name: 'email', type: 'string', required: true, description: 'User email address' },
            { name: 'name', type: 'string', required: true, description: 'Display name' },
        ];
        if (doc.auth.roles && doc.auth.roles.length > 0) {
            userFields.push({ name: 'role', type: 'string', required: true, description: `One of: ${doc.auth.roles.join(', ')}` });
        }
        userFields.push({ name: 'createdAt', type: 'string', required: true, description: 'ISO 8601 timestamp' }, { name: 'updatedAt', type: 'string', required: true, description: 'ISO 8601 timestamp' });
        entities.push({ name: 'User', fields: userFields });
        seenNames.add('user');
    }
    // Infer entities from persona goals
    for (const persona of doc.product.personas) {
        for (const goal of persona.goals) {
            const entityName = extractEntityFromGoal(goal);
            if (entityName && !seenNames.has(entityName.toLowerCase())) {
                seenNames.add(entityName.toLowerCase());
                entities.push(buildDomainEntity(entityName, doc));
            }
        }
    }
    // Infer entities from core flows
    if (doc.product.coreFlows) {
        for (const flow of doc.product.coreFlows) {
            const entityName = extractEntityFromFlow(flow.name);
            if (entityName && !seenNames.has(entityName.toLowerCase())) {
                seenNames.add(entityName.toLowerCase());
                entities.push(buildDomainEntity(entityName, doc));
            }
        }
    }
    return entities;
}
function extractEntityFromGoal(goal) {
    // "Create tasks" → "Task", "Manage orders" → "Order", "View reports" → "Report"
    const patterns = [
        /^(?:create|add|manage|view|edit|update|delete|remove|list|browse|search|submit|assign|track)\s+(.+)$/i,
        /^(?:mark|set|toggle)\s+(.+?)(?:\s+(?:as|to|complete|done|active|inactive).*)?$/i,
    ];
    for (const pattern of patterns) {
        const match = goal.match(pattern);
        if (match) {
            return singularize(capitalize(match[1].trim()));
        }
    }
    return null;
}
function extractEntityFromFlow(flowName) {
    // "User Registration" → "User" (but User already added), "Order Checkout" → "Order"
    const parts = flowName.split(/[\s_-]+/);
    if (parts.length >= 1) {
        const candidate = capitalize(parts[0]);
        // Skip common action words that aren't entities
        const nonEntities = new Set(['login', 'logout', 'signup', 'register', 'search', 'browse', 'view', 'edit', 'check', 'reset']);
        if (!nonEntities.has(candidate.toLowerCase())) {
            return singularize(candidate);
        }
        // Try second word if first was an action
        if (parts.length >= 2) {
            return singularize(capitalize(parts[1]));
        }
    }
    return null;
}
function buildDomainEntity(name, doc) {
    const fields = [
        { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
        { name: 'title', type: 'string', required: true, description: `${name} title` },
        { name: 'status', type: 'string', required: true, description: `${name} status` },
    ];
    // Add userId if auth exists (ownership)
    if (doc.auth && doc.auth.strategy !== 'none') {
        fields.push({ name: 'userId', type: 'string', required: true, description: 'Owner user ID' });
    }
    fields.push({ name: 'createdAt', type: 'string', required: true, description: 'ISO 8601 timestamp' }, { name: 'updatedAt', type: 'string', required: true, description: 'ISO 8601 timestamp' });
    return { name, fields };
}
function buildSpec(doc, backend, entities, contractTags) {
    const spec = {
        openapi: '3.1.0',
        info: {
            title: `${doc.solution.name} API`,
            version: '1.0.0',
            description: doc.solution.description,
        },
        servers: [
            { url: 'http://localhost:3000/api', description: 'Development' },
            { url: `https://api.${slugify(doc.solution.name)}.com`, description: 'Production' },
        ],
        paths: {},
        components: {
            schemas: {},
            securitySchemes: {},
        },
        tags: [],
    };
    // Annotate spec with declared API contracts when present
    if (contractTags.length > 0) {
        spec.info['x-contracts'] = contractTags.map((ct) => ({
            name: ct.name,
            type: ct.type,
            ...(ct.owner ? { owner: ct.owner } : {}),
        }));
        // REST contracts: add as primary tags for endpoint grouping; use x-basePath if declared
        for (const ct of contractTags) {
            if (ct.type === 'rest') {
                const rawContract = doc.contracts?.apis?.find((a) => a.name === ct.name);
                const basePath = rawContract?.['x-basePath'];
                spec.tags.push({
                    name: ct.name,
                    description: `REST API${ct.owner ? ` — owned by ${ct.owner}` : ''}${basePath ? ` — base path: ${basePath}` : ''}`,
                });
                // Annotate server with declared base path when available
                if (basePath && spec.servers.length > 0) {
                    spec.servers[1]['x-basePath'] = basePath;
                }
            }
            else {
                // Non-REST contracts: informational tags only
                spec.tags.push({
                    name: ct.name,
                    description: `${ct.type.toUpperCase()} API${ct.owner ? ` — owned by ${ct.owner}` : ''}`,
                });
            }
        }
    }
    // Security schemes
    if (doc.auth && doc.auth.strategy !== 'none') {
        if (doc.auth.strategy === 'oidc' || doc.auth.strategy === 'magic-link' || doc.auth.strategy === 'passwordless') {
            spec.components.securitySchemes.bearerAuth = {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            };
            spec.security = [{ bearerAuth: [] }];
        }
        else if (doc.auth.strategy === 'api-key') {
            spec.components.securitySchemes.apiKey = {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
            };
            spec.security = [{ apiKey: [] }];
        }
        // Auth endpoints
        spec.tags.push({ name: 'Auth', description: 'Authentication endpoints' });
        addAuthPaths(spec, doc);
    }
    // Health endpoint
    spec.paths['/health'] = {
        get: {
            summary: 'Health check',
            operationId: 'getHealth',
            tags: ['System'],
            security: [],
            responses: {
                '200': { description: 'Service is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
            },
        },
    };
    spec.tags.push({ name: 'System', description: 'System endpoints' });
    // Entity CRUD endpoints — tag with REST contract name when declared, else entity name
    const restContractName = contractTags.find((ct) => ct.type === 'rest')?.name;
    for (const entity of entities) {
        if (entity.name === 'User')
            continue; // User endpoints handled by auth
        addEntityCrud(spec, entity, doc, restContractName);
    }
    // Schemas
    for (const entity of entities) {
        addSchema(spec, entity);
    }
    // Error schema
    spec.components.schemas.Error = {
        type: 'object',
        properties: {
            code: { type: 'string' },
            message: { type: 'string' },
        },
        required: ['code', 'message'],
    };
    return spec;
}
function addAuthPaths(spec, doc) {
    const basePath = '/auth';
    spec.paths[`${basePath}/login`] = {
        post: {
            summary: 'Log in',
            operationId: 'login',
            tags: ['Auth'],
            security: [],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } },
            },
            responses: {
                '200': { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
                '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
    };
    spec.paths[`${basePath}/register`] = {
        post: {
            summary: 'Register a new account',
            operationId: 'register',
            tags: ['Auth'],
            security: [],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } }, required: ['email', 'password', 'name'] } } },
            },
            responses: {
                '201': { description: 'Account created', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
                '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
    };
    spec.paths[`${basePath}/me`] = {
        get: {
            summary: 'Get current user profile',
            operationId: 'getMe',
            tags: ['Auth'],
            responses: {
                '200': { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                '401': { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
    };
    spec.paths[`${basePath}/logout`] = {
        post: {
            summary: 'Log out',
            operationId: 'logout',
            tags: ['Auth'],
            responses: {
                '200': { description: 'Logged out' },
            },
        },
    };
}
function addEntityCrud(spec, entity, doc, contractTag) {
    const slug = pluralize(entity.name.toLowerCase());
    const basePath = `/${slug}`;
    // When a REST contract is declared, use it as the primary tag; keep entity name as secondary tag
    const tag = contractTag ?? entity.name;
    if (!contractTag) {
        spec.tags.push({ name: tag, description: `${entity.name} management` });
    }
    // List
    spec.paths[basePath] = {
        get: {
            summary: `List ${pluralize(entity.name.toLowerCase())}`,
            operationId: `list${pluralize(entity.name)}`,
            tags: [tag],
            parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Max items to return' },
                { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Items to skip' },
            ],
            responses: {
                '200': {
                    description: `List of ${pluralize(entity.name.toLowerCase())}`,
                    content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: `#/components/schemas/${entity.name}` } }, total: { type: 'integer' } } } } },
                },
            },
        },
        post: {
            summary: `Create a ${entity.name.toLowerCase()}`,
            operationId: `create${entity.name}`,
            tags: [tag],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.name}Input` } } },
            },
            responses: {
                '201': { description: `${entity.name} created`, content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.name}` } } } },
                '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
    };
    // Get by ID
    spec.paths[`${basePath}/{id}`] = {
        get: {
            summary: `Get a ${entity.name.toLowerCase()} by ID`,
            operationId: `get${entity.name}`,
            tags: [tag],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
                '200': { description: entity.name, content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.name}` } } } },
                '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
        patch: {
            summary: `Update a ${entity.name.toLowerCase()}`,
            operationId: `update${entity.name}`,
            tags: [tag],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.name}Input` } } },
            },
            responses: {
                '200': { description: `${entity.name} updated`, content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.name}` } } } },
                '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
        delete: {
            summary: `Delete a ${entity.name.toLowerCase()}`,
            operationId: `delete${entity.name}`,
            tags: [tag],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
                '204': { description: 'Deleted' },
                '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
        },
    };
}
function addSchema(spec, entity) {
    const properties = {};
    const required = [];
    const inputProperties = {};
    const inputRequired = [];
    for (const field of entity.fields) {
        const prop = { type: field.type === 'string' ? 'string' : field.type };
        if (field.description)
            prop.description = field.description;
        properties[field.name] = prop;
        if (field.required)
            required.push(field.name);
        // Input schema excludes auto-generated fields
        if (!['id', 'createdAt', 'updatedAt'].includes(field.name)) {
            inputProperties[field.name] = prop;
            if (field.required)
                inputRequired.push(field.name);
        }
    }
    spec.components.schemas[entity.name] = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
    };
    // Don't create Input schema for User (auth handles it)
    if (entity.name !== 'User') {
        spec.components.schemas[`${entity.name}Input`] = {
            type: 'object',
            properties: inputProperties,
            ...(inputRequired.length > 0 ? { required: inputRequired } : {}),
        };
    }
}
// ─── YAML Serializer (minimal, no dependency) ───
function toYaml(obj, indent = 0) {
    return yamlValue(obj, indent, true);
}
function yamlValue(value, indent, isRoot) {
    if (value === null || value === undefined)
        return 'null';
    if (typeof value === 'boolean')
        return value ? 'true' : 'false';
    if (typeof value === 'number')
        return String(value);
    if (typeof value === 'string')
        return yamlString(value);
    if (Array.isArray(value))
        return yamlArray(value, indent);
    if (typeof value === 'object')
        return yamlObject(value, indent, isRoot);
    return String(value);
}
function yamlString(s) {
    // Use quotes if string contains special chars
    if (s === '' || /[:#\[\]{},&*?|>!%@`'"\n]/.test(s) || s.startsWith(' ') || s.endsWith(' ') || /^\d/.test(s) || s === 'true' || s === 'false' || s === 'null') {
        return `'${s.replace(/'/g, "''")}'`;
    }
    return s;
}
function yamlObject(obj, indent, isRoot) {
    const entries = Object.entries(obj);
    if (entries.length === 0)
        return '{}';
    const pad = '  '.repeat(indent);
    const lines = [];
    for (const [key, val] of entries) {
        if (val === undefined)
            continue;
        const safeKey = /[:#\[\]{},&*?|>!%@`'".\n\s]/.test(key) ? `'${key}'` : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
            lines.push(`${pad}${safeKey}:`);
            lines.push(yamlObject(val, indent + 1, false));
        }
        else if (Array.isArray(val)) {
            lines.push(`${pad}${safeKey}:`);
            lines.push(yamlArray(val, indent + 1));
        }
        else {
            lines.push(`${pad}${safeKey}: ${yamlValue(val, indent + 1, false)}`);
        }
    }
    return lines.join('\n');
}
function yamlArray(arr, indent) {
    if (arr.length === 0)
        return '  '.repeat(indent) + '[]';
    const pad = '  '.repeat(indent);
    const lines = [];
    for (const item of arr) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            const entries = Object.entries(item).filter(([, v]) => v !== undefined);
            if (entries.length > 0) {
                const [firstKey, firstVal] = entries[0];
                const safeKey = /[:#\[\]{},&*?|>!%@`'".\n\s]/.test(firstKey) ? `'${firstKey}'` : firstKey;
                if (firstVal !== null && typeof firstVal === 'object' && !Array.isArray(firstVal) && Object.keys(firstVal).length > 0) {
                    lines.push(`${pad}- ${safeKey}:`);
                    lines.push(yamlObject(firstVal, indent + 2, false));
                }
                else if (Array.isArray(firstVal)) {
                    lines.push(`${pad}- ${safeKey}:`);
                    lines.push(yamlArray(firstVal, indent + 2));
                }
                else {
                    lines.push(`${pad}- ${safeKey}: ${yamlValue(firstVal, indent + 1, false)}`);
                }
                for (let i = 1; i < entries.length; i++) {
                    const [k, v] = entries[i];
                    const sk = /[:#\[\]{},&*?|>!%@`'".\n\s]/.test(k) ? `'${k}'` : k;
                    if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) {
                        lines.push(`${pad}  ${sk}:`);
                        lines.push(yamlObject(v, indent + 2, false));
                    }
                    else if (Array.isArray(v)) {
                        lines.push(`${pad}  ${sk}:`);
                        lines.push(yamlArray(v, indent + 2));
                    }
                    else {
                        lines.push(`${pad}  ${sk}: ${yamlValue(v, indent + 1, false)}`);
                    }
                }
            }
            else {
                lines.push(`${pad}- {}`);
            }
        }
        else {
            lines.push(`${pad}- ${yamlValue(item, indent + 1, false)}`);
        }
    }
    return lines.join('\n');
}
// ─── Helpers ───
function countEndpoints(paths) {
    let count = 0;
    for (const methods of Object.values(paths)) {
        count += Object.keys(methods).length;
    }
    return count;
}
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function singularize(s) {
    if (s.endsWith('ies'))
        return s.slice(0, -3) + 'y';
    if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes'))
        return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us'))
        return s.slice(0, -1);
    return s;
}
function pluralize(s) {
    if (s.endsWith('y') && !/[aeiou]y$/i.test(s))
        return s.slice(0, -1) + 'ies';
    if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('sh') || s.endsWith('ch'))
        return s + 'es';
    return s + 's';
}
