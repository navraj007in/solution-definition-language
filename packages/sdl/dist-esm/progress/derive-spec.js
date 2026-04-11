function componentRoot(component) {
    if (component.path && component.path !== '')
        return component.path;
    return (component.name ?? 'unknown').toLowerCase().replace(/\s+/g, '-');
}
// Detect manifest file based on runtime/language
function manifestForRuntime(root, runtime, language) {
    const base = root === '.' || root === './' ? '' : `${root}/`;
    const rt = (runtime ?? '').toLowerCase();
    const lang = (language ?? '').toLowerCase();
    if (rt.includes('dotnet') || rt.includes('.net') || lang.includes('csharp') || lang.includes('c#')) {
        return { path: `${base}*.csproj`, type: 'nuget' };
    }
    if (rt.includes('python') || lang.includes('python')) {
        return { path: `${base}requirements.txt`, type: 'pip' };
    }
    if (rt.includes('go') || lang.includes('go')) {
        return { path: `${base}go.mod`, type: 'gomod' };
    }
    if (rt.includes('java') || lang.includes('java') || lang.includes('kotlin')) {
        return { path: `${base}pom.xml`, type: 'maven' };
    }
    if (rt.includes('rust') || lang.includes('rust')) {
        return { path: `${base}Cargo.toml`, type: 'cargo' };
    }
    if (rt.includes('ruby') || lang.includes('ruby')) {
        return { path: `${base}Gemfile`, type: 'gem' };
    }
    if (rt.includes('php') || lang.includes('php')) {
        return { path: `${base}composer.json`, type: 'composer' };
    }
    // Default: Node.js
    return { path: `${base}package.json`, type: 'npm' };
}
// Database packages per runtime
const DB_PACKAGES = {
    npm: {
        postgres: ['pg', '@prisma/client', 'drizzle-orm', 'typeorm', 'knex', 'sequelize', '@neondatabase/serverless'],
        postgresql: ['pg', '@prisma/client', 'drizzle-orm', 'typeorm', 'knex', 'sequelize'],
        mysql: ['mysql2', '@prisma/client', 'drizzle-orm', 'typeorm', 'knex', 'sequelize'],
        mariadb: ['mysql2', 'mariadb', '@prisma/client'],
        mongodb: ['mongodb', 'mongoose', '@prisma/client'],
        dynamodb: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'dynamoose'],
        redis: ['redis', 'ioredis', '@upstash/redis'],
        sqlite: ['better-sqlite3', 'sqlite3', '@prisma/client', 'drizzle-orm'],
        cockroachdb: ['pg', '@prisma/client'],
        planetscale: ['@planetscale/database', '@prisma/client'],
        supabase: ['@supabase/supabase-js'],
        firebase: ['firebase-admin', 'firebase'],
        mssql: ['mssql', 'tedious', '@prisma/client'],
        sqlserver: ['mssql', 'tedious', '@prisma/client'],
        cassandra: ['cassandra-driver'],
        neo4j: ['neo4j-driver'],
        couchdb: ['nano', 'pouchdb'],
    },
    nuget: {
        postgres: ['Npgsql', 'Npgsql.EntityFrameworkCore.PostgreSQL', 'Microsoft.EntityFrameworkCore'],
        postgresql: ['Npgsql', 'Npgsql.EntityFrameworkCore.PostgreSQL'],
        mysql: ['MySql.Data', 'Pomelo.EntityFrameworkCore.MySql'],
        mongodb: ['MongoDB.Driver'],
        mssql: ['Microsoft.Data.SqlClient', 'Microsoft.EntityFrameworkCore.SqlServer'],
        sqlserver: ['Microsoft.Data.SqlClient', 'Microsoft.EntityFrameworkCore.SqlServer'],
        sqlite: ['Microsoft.EntityFrameworkCore.Sqlite'],
        redis: ['StackExchange.Redis'],
        dynamodb: ['AWSSDK.DynamoDBv2'],
        cosmosdb: ['Microsoft.Azure.Cosmos'],
    },
    pip: {
        postgres: ['psycopg2', 'psycopg2-binary', 'asyncpg', 'sqlalchemy', 'django'],
        mysql: ['mysqlclient', 'pymysql', 'sqlalchemy'],
        mongodb: ['pymongo', 'motor', 'mongoengine'],
        redis: ['redis', 'aioredis'],
        sqlite: ['sqlite3', 'sqlalchemy', 'django'],
        dynamodb: ['boto3'],
        mssql: ['pyodbc', 'pymssql'],
    },
    gomod: {
        postgres: ['github.com/lib/pq', 'github.com/jackc/pgx', 'gorm.io/driver/postgres'],
        mysql: ['github.com/go-sql-driver/mysql', 'gorm.io/driver/mysql'],
        mongodb: ['go.mongodb.org/mongo-driver'],
        redis: ['github.com/redis/go-redis', 'github.com/gomodule/redigo'],
        sqlite: ['github.com/mattn/go-sqlite3', 'gorm.io/driver/sqlite'],
    },
    maven: {
        postgres: ['org.postgresql:postgresql', 'org.hibernate:hibernate-core'],
        mysql: ['com.mysql:mysql-connector-j', 'org.hibernate:hibernate-core'],
        mongodb: ['org.mongodb:mongodb-driver-sync', 'org.springframework.data:spring-data-mongodb'],
        redis: ['io.lettuce:lettuce-core', 'redis.clients:jedis'],
    },
    cargo: {
        postgres: ['sqlx', 'diesel', 'tokio-postgres'],
        mysql: ['sqlx', 'diesel'],
        mongodb: ['mongodb'],
        redis: ['redis'],
        sqlite: ['sqlx', 'diesel', 'rusqlite'],
    },
};
// Auth packages per runtime
const AUTH_PACKAGES = {
    npm: {
        cognito: ['amazon-cognito-identity-js', '@aws-sdk/client-cognito-identity-provider'],
        auth0: ['auth0', '@auth0/nextjs-auth0', '@auth0/auth0-react'],
        clerk: ['@clerk/nextjs', '@clerk/express', '@clerk/clerk-sdk-node'],
        firebase: ['firebase-admin', 'firebase'],
        supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-nextjs'],
        saml: ['passport', '@node-saml/passport-saml', 'passport-saml'],
        'azure-ad': ['@azure/msal-node', '@azure/msal-browser', 'passport-azure-ad'],
        'entra-id': ['@azure/msal-node', '@azure/msal-browser'],
        okta: ['@okta/okta-auth-js', '@okta/okta-sdk-nodejs'],
        'email-password': ['passport', 'bcrypt', 'argon2'],
        'session-based': ['passport', 'express-session', 'bcrypt'],
        jwt: ['jsonwebtoken', 'jose', 'passport-jwt'],
        custom: ['passport', 'bcrypt', 'jsonwebtoken'],
    },
    nuget: {
        'azure-ad': ['Microsoft.Identity.Web', 'Microsoft.AspNetCore.Authentication.JwtBearer'],
        'entra-id': ['Microsoft.Identity.Web'],
        cognito: ['Amazon.AspNetCore.Identity.Cognito'],
        jwt: ['Microsoft.AspNetCore.Authentication.JwtBearer', 'System.IdentityModel.Tokens.Jwt'],
        custom: ['Microsoft.AspNetCore.Identity', 'BCrypt.Net-Next'],
        saml: ['Sustainsys.Saml2', 'ITfoxtec.Identity.Saml2'],
        okta: ['Okta.AspNetCore'],
    },
    pip: {
        cognito: ['boto3', 'warrant'],
        jwt: ['PyJWT', 'python-jose'],
        custom: ['bcrypt', 'passlib'],
        saml: ['python3-saml', 'djangosaml2'],
        'azure-ad': ['msal'],
        firebase: ['firebase-admin'],
    },
    gomod: {
        jwt: ['github.com/golang-jwt/jwt'],
        custom: ['golang.org/x/crypto'],
        cognito: ['github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider'],
    },
};
function pkgManifestPath(root) {
    return root === '.' || root === './' ? 'package.json' : `${root}/package.json`;
}
export function deriveVerificationSpec(doc) {
    const specs = [];
    // Backend services
    const backendProjects = doc.architecture?.projects?.backend ?? [];
    const services = doc.architecture?.services ?? [];
    const allBackend = [...backendProjects, ...services];
    for (const svc of allBackend) {
        if (!svc.name)
            continue;
        const root = componentRoot(svc);
        const rt = (svc.runtime ?? '').toString();
        const lang = (svc.language ?? '').toString();
        const mf = manifestForRuntime(root, rt, lang);
        const checks = [
            mf.type === 'npm' ? { kind: 'file_exists', path: 'package.json' } : { kind: 'file_glob', glob: mf.path.split('/').pop() },
            { kind: 'file_exists', path: '.env.example' },
        ];
        // ORM checks
        const orm = (svc.orm ?? svc.database?.orm ?? '').toString().toLowerCase();
        if (orm.includes('prisma')) {
            checks.push({ kind: 'file_exists', path: 'prisma/schema.prisma' });
            checks.push({ kind: 'package_installed', pkg: '@prisma/client', manifestPath: pkgManifestPath(root) });
        }
        else if (orm.includes('drizzle')) {
            checks.push({ kind: 'file_glob', glob: 'drizzle.config.*' });
            checks.push({ kind: 'package_installed', pkg: 'drizzle-orm', manifestPath: pkgManifestPath(root) });
        }
        // Entry point — runtime-aware patterns
        const rtLower = rt.toLowerCase();
        const langLower = lang.toLowerCase();
        if (rtLower.includes('dotnet') || rtLower.includes('.net') || langLower.includes('csharp')) {
            checks.push({ kind: 'file_glob', glob: 'Program.*' });
            checks.push({ kind: 'file_glob', glob: 'Startup.*' });
        }
        else if (rtLower.includes('python') || langLower.includes('python')) {
            checks.push({ kind: 'file_glob', glob: 'app.*' });
            checks.push({ kind: 'file_glob', glob: 'main.*' });
            checks.push({ kind: 'file_exists', path: 'manage.py' });
        }
        else if (rtLower.includes('go') || langLower.includes('go')) {
            checks.push({ kind: 'file_exists', path: 'main.go' });
            checks.push({ kind: 'file_glob', glob: 'cmd/*/main.go' });
        }
        else if (rtLower.includes('java') || langLower.includes('java') || langLower.includes('kotlin')) {
            checks.push({ kind: 'file_glob', glob: 'src/main/**/*Application.*' });
        }
        else if (rtLower.includes('rust') || langLower.includes('rust')) {
            checks.push({ kind: 'file_exists', path: 'src/main.rs' });
        }
        else if (rtLower.includes('ruby') || langLower.includes('ruby')) {
            checks.push({ kind: 'file_exists', path: 'config.ru' });
            checks.push({ kind: 'file_glob', glob: 'app.*' });
        }
        else if (rtLower.includes('php') || langLower.includes('php')) {
            checks.push({ kind: 'file_exists', path: 'public/index.php' });
            checks.push({ kind: 'file_glob', glob: 'artisan' });
        }
        else {
            // Default: Node.js patterns
            checks.push({ kind: 'file_glob', glob: 'src/app.*' });
            checks.push({ kind: 'file_glob', glob: 'src/index.*' });
            checks.push({ kind: 'file_glob', glob: 'src/main.*' });
        }
        const optional = [
            { kind: 'file_exists', path: 'Dockerfile' },
            { kind: 'file_exists', path: 'docker-compose.yml' },
        ];
        specs.push({
            id: `service:${svc.name}`,
            category: 'backend_services',
            label: svc.name,
            componentRoot: root,
            requiredChecks: checks,
            optionalChecks: optional,
        });
    }
    // Frontend projects — framework-aware checks
    const frontendProjects = doc.architecture?.projects?.frontend ?? [];
    for (const fe of frontendProjects) {
        if (!fe.name)
            continue;
        const root = componentRoot(fe);
        const framework = (fe.framework ?? '').toString().toLowerCase();
        const feType = (fe.type ?? '').toString().toLowerCase();
        const checks = [];
        // Flutter
        if (framework.includes('flutter')) {
            checks.push({ kind: 'file_exists', path: 'pubspec.yaml' });
            checks.push({ kind: 'file_exists', path: 'lib/main.dart' });
        }
        // Swift / iOS native
        else if (framework.includes('swift') || framework.includes('swiftui')) {
            checks.push({ kind: 'file_glob', glob: '*.xcodeproj' });
            checks.push({ kind: 'file_glob', glob: '**/*.swift' });
        }
        // Kotlin / Android native
        else if (framework.includes('kotlin') || framework.includes('jetpack')) {
            checks.push({ kind: 'file_exists', path: 'build.gradle.kts' });
            checks.push({ kind: 'file_glob', glob: 'app/src/main/**/*.kt' });
        }
        // React Native / Expo
        else if (feType.includes('mobile') || framework.includes('expo') || framework.includes('react-native')) {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            checks.push({ kind: 'file_exists', path: 'app.json' });
        }
        // Next.js
        else if (framework.includes('next')) {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            checks.push({ kind: 'file_glob', glob: 'next.config.*' });
        }
        // Angular
        else if (framework.includes('angular')) {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            checks.push({ kind: 'file_exists', path: 'angular.json' });
        }
        // Vue
        else if (framework.includes('vue') || framework.includes('nuxt')) {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            checks.push({ kind: 'file_glob', glob: 'vite.config.*' });
        }
        // Svelte
        else if (framework.includes('svelte')) {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            checks.push({ kind: 'file_glob', glob: 'svelte.config.*' });
        }
        // Blazor / .NET frontend
        else if (framework.includes('blazor') || framework.includes('maui')) {
            checks.push({ kind: 'file_glob', glob: '*.csproj' });
        }
        // Default: React/Vite
        else {
            checks.push({ kind: 'file_exists', path: 'package.json' });
            if (feType.includes('web') || !feType) {
                checks.push({ kind: 'file_exists', path: 'index.html' });
            }
        }
        specs.push({
            id: `frontend:${fe.name}`,
            category: 'frontends',
            label: `${fe.name} (${fe.framework ?? 'unknown'})`,
            componentRoot: root,
            requiredChecks: checks,
        });
    }
    // Database
    const data = doc.data;
    if (data?.primaryDatabase) {
        const db = data.primaryDatabase;
        const dbType = (db.type ?? db.engine ?? 'unknown').toString().toLowerCase();
        const ownerBackend = allBackend[0];
        const ownerRoot = ownerBackend ? componentRoot(ownerBackend) : '.';
        const ownerRt = ownerBackend ? (ownerBackend.runtime ?? '').toString() : '';
        const ownerLang = ownerBackend ? (ownerBackend.language ?? '').toString() : '';
        const mf = manifestForRuntime(ownerRoot, ownerRt, ownerLang);
        const manifest = mf.type === 'npm' ? pkgManifestPath(ownerRoot) : mf.path;
        // Get runtime-specific package list, fall back to npm
        const runtimePkgs = DB_PACKAGES[mf.type] ?? DB_PACKAGES.npm ?? {};
        const checks = [];
        const pkgs = runtimePkgs[dbType] ?? runtimePkgs[dbType.replace(/\s+/g, '')] ?? [];
        // Add each as a separate check — evaluator needs at least one to pass
        if (pkgs.length > 0) {
            checks.push(...pkgs.map(pkg => ({ kind: 'package_installed', pkg, manifestPath: manifest })));
        }
        // ORM schema — check in backend root
        const orm = ownerBackend ? (ownerBackend.orm ?? '').toString().toLowerCase() : '';
        if (orm.includes('prisma') || dbType === 'postgres' || dbType === 'mysql') {
            // Prisma is common default — check for it even if not explicitly declared
            checks.push({ kind: 'file_exists', path: 'prisma/schema.prisma' });
        }
        if (checks.length > 0) {
            specs.push({
                id: `database:${db.name ?? dbType}`,
                category: 'databases',
                label: `${db.name ?? dbType} (${db.hosting ?? 'managed'})`,
                componentRoot: ownerRoot,
                requiredChecks: checks,
            });
        }
    }
    // Cache
    if (data?.cache && data.cache.type && data.cache.type !== 'none') {
        const cacheType = data.cache.type.toString().toLowerCase();
        const ownerRoot = allBackend[0] ? componentRoot(allBackend[0]) : '.';
        const manifest = pkgManifestPath(ownerRoot);
        const CACHE_PACKAGES = {
            redis: ['redis', 'ioredis', '@upstash/redis', 'bullmq'],
            memcached: ['memcached', 'memjs'],
            valkey: ['ioredis', 'redis'],
            dragonfly: ['ioredis', 'redis'],
            elasticache: ['ioredis', 'redis'],
        };
        const pkgs = CACHE_PACKAGES[cacheType] ?? [];
        const checks = pkgs.map(pkg => ({ kind: 'package_installed', pkg, manifestPath: manifest }));
        if (checks.length > 0) {
            specs.push({
                id: `cache:${cacheType}`,
                category: 'databases',
                label: `${cacheType} cache`,
                componentRoot: ownerRoot,
                requiredChecks: checks,
            });
        }
    }
    // Auth — read from multiple possible locations in the SDL
    const auth = doc.auth;
    if (auth) {
        const ownerBackendAuth = allBackend[0];
        const ownerRoot = ownerBackendAuth ? componentRoot(ownerBackendAuth) : '.';
        const ownerRt = ownerBackendAuth ? (ownerBackendAuth.runtime ?? '').toString() : '';
        const ownerLang = ownerBackendAuth ? (ownerBackendAuth.language ?? '').toString() : '';
        const mf = manifestForRuntime(ownerRoot, ownerRt, ownerLang);
        const manifest = mf.type === 'npm' ? pkgManifestPath(ownerRoot) : mf.path;
        // Detect auth type from various SDL shapes
        const providerTypes = [];
        const strategy = (auth.strategy ?? auth.type ?? '').toString().toLowerCase();
        if (strategy)
            providerTypes.push(strategy);
        const providers = auth.providers;
        if (providers && typeof providers === 'object') {
            for (const p of Object.values(providers)) {
                const pType = (p?.type ?? '').toString().toLowerCase();
                if (pType)
                    providerTypes.push(pType);
            }
        }
        const singleProvider = (auth.provider ?? '').toString().toLowerCase();
        if (singleProvider)
            providerTypes.push(singleProvider);
        // Get runtime-specific auth packages, fall back to npm
        const runtimeAuthPkgs = AUTH_PACKAGES[mf.type] ?? AUTH_PACKAGES.npm ?? {};
        // Collect all relevant packages from all detected provider types
        const allPkgs = new Set();
        for (const pType of providerTypes) {
            const pkgs = runtimeAuthPkgs[pType];
            if (pkgs)
                pkgs.forEach(p => allPkgs.add(p));
        }
        // If nothing matched, check for generic auth packages
        if (allPkgs.size === 0) {
            ['passport', 'bcrypt', 'jsonwebtoken', 'express-session'].forEach(p => allPkgs.add(p));
        }
        const checks = [...allPkgs].map(pkg => ({
            kind: 'package_installed', pkg, manifestPath: manifest,
        }));
        // Also check for auth-related source files
        checks.push({ kind: 'file_glob', glob: 'src/**/auth*' });
        const label = providerTypes.length > 0 ? providerTypes.join(' + ') : 'Authentication';
        specs.push({
            id: `auth:${providerTypes[0] || 'custom'}`,
            category: 'auth',
            label,
            componentRoot: ownerRoot,
            requiredChecks: checks,
        });
    }
    // Infrastructure
    const deployment = doc.deployment;
    if (deployment) {
        const checks = [
            { kind: 'file_exists', path: 'docker-compose.yml' },
        ];
        const ciCd = deployment.ciCd ?? deployment.ci_cd;
        if (ciCd) {
            const provider = (ciCd.provider ?? ciCd.platform ?? '').toString().toLowerCase();
            if (provider.includes('github')) {
                checks.push({ kind: 'file_glob', glob: '.github/workflows/*.yml' });
            }
            else if (provider.includes('gitlab')) {
                checks.push({ kind: 'file_exists', path: '.gitlab-ci.yml' });
            }
        }
        specs.push({
            id: 'infrastructure:cicd',
            category: 'infrastructure',
            label: 'CI/CD & Containers',
            componentRoot: '.',
            requiredChecks: checks,
        });
    }
    // Observability — runtime-aware logging package checks
    const observability = doc.observability;
    if (observability) {
        const ownerBackendObs = allBackend[0];
        const ownerRoot = ownerBackendObs ? componentRoot(ownerBackendObs) : '.';
        const ownerRt = ownerBackendObs ? (ownerBackendObs.runtime ?? '').toString() : '';
        const ownerLang = ownerBackendObs ? (ownerBackendObs.language ?? '').toString() : '';
        const mf = manifestForRuntime(ownerRoot, ownerRt, ownerLang);
        const manifest = mf.type === 'npm' ? pkgManifestPath(ownerRoot) : mf.path;
        const LOGGING_PACKAGES = {
            npm: { pino: ['pino', 'pino-http'], winston: ['winston'], bunyan: ['bunyan'], default: ['pino', 'winston'] },
            nuget: { serilog: ['Serilog', 'Serilog.AspNetCore'], nlog: ['NLog'], default: ['Serilog', 'Microsoft.Extensions.Logging'] },
            pip: { default: ['structlog', 'loguru', 'logging'] },
            gomod: { default: ['go.uber.org/zap', 'github.com/sirupsen/logrus', 'log/slog'] },
            maven: { default: ['org.slf4j:slf4j-api', 'ch.qos.logback:logback-classic'] },
            cargo: { default: ['tracing', 'log', 'env_logger'] },
        };
        const logging = (observability.logging ?? observability.logger ?? '').toString().toLowerCase();
        const runtimeLogPkgs = LOGGING_PACKAGES[mf.type] ?? LOGGING_PACKAGES.npm;
        const logPkgs = runtimeLogPkgs[logging] ?? runtimeLogPkgs.default ?? [];
        const checks = logPkgs.map(pkg => ({
            kind: 'package_installed', pkg, manifestPath: manifest,
        }));
        specs.push({
            id: 'observability:logging',
            category: 'observability',
            label: 'Logging & Monitoring',
            componentRoot: ownerRoot,
            requiredChecks: checks,
        });
    }
    return specs;
}
