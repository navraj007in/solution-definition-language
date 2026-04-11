// ─── Cloud → Runtime Mapping ───
export const CLOUD_RUNTIME_MAP = {
    'vercel': { frontend: 'vercel', backend: 'vercel' },
    'aws': { frontend: 's3+cloudfront', backend: 'ecs' },
    'railway': { frontend: 'railway', backend: 'railway' },
    'gcp': { frontend: 'cloudflare-pages', backend: 'cloud-run' },
    'azure': { frontend: 'static-web-apps', backend: 'container-apps' },
};
// ─── Framework + DB → ORM Mapping ───
export const FRAMEWORK_ORM_MAP = {
    'nodejs': { postgres: 'prisma', mysql: 'prisma', sqlserver: 'prisma', mongodb: 'mongoose' },
    'python-fastapi': { postgres: 'sqlalchemy', mysql: 'sqlalchemy', sqlserver: 'sqlalchemy' },
    'dotnet-8': { postgres: 'ef-core', mysql: 'ef-core', sqlserver: 'ef-core' },
    'go': { postgres: 'gorm', mysql: 'gorm', sqlserver: 'gorm' },
    'java-spring': { postgres: 'hibernate', mysql: 'hibernate', sqlserver: 'hibernate' },
};
// ─── Budget → Monthly Ceiling ($) ───
export const BUDGET_MONTHLY_CEILING = {
    'startup': 500,
    'scaleup': 2000,
    'enterprise': 10000,
};
// ─── Stage → Default Availability Target ───
export const AVAILABILITY_BY_STAGE = {
    'MVP': '99.9',
    'Growth': '99.95',
    'Enterprise': '99.99',
};
// ─── SQL database types (for ORM inference) ───
export const SQL_DATABASE_TYPES = new Set([
    'postgres', 'mysql', 'sqlserver', 'cockroachdb', 'planetscale',
]);
