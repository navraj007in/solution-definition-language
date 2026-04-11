import type { SDLDocument } from '../types';
import type { RawGeneratorResult, GeneratedFile } from './types';

/**
 * Generates a Docker Compose file for local development.
 * Includes all backends, frontends, databases, cache, queues, and search.
 * Deterministic — same input always produces identical output.
 */
export function generateDockerCompose(doc: SDLDocument): RawGeneratorResult {
  const lines: string[] = [];
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;

  lines.push(`# Docker Compose — ${doc.solution.name} (local development)`);
  lines.push('');
  lines.push('services:');

  // ── Backend services ──
  for (const be of backends) {
    const name = slugify(be.name);
    lines.push('');
    lines.push(`  ${name}:`);
    lines.push(`    build:`);
    lines.push(`      context: ./backend-${name}`);
    lines.push(`      dockerfile: Dockerfile`);
    lines.push(`    container_name: ${slugify(doc.solution.name)}-${name}`);

    const port = getBackendPort(be.framework);
    lines.push(`    ports:`);
    lines.push(`      - "${port}:${port}"`);
    lines.push(`    environment:`);

    // Database URL
    const dbUrl = getDatabaseUrl(dbType, doc);
    if (dbUrl) lines.push(`      - DATABASE_URL=${dbUrl}`);
    lines.push(`      - NODE_ENV=development`);

    // Redis
    if (doc.data.cache?.type === 'redis') {
      lines.push(`      - REDIS_URL=redis://redis:6379`);
    }

    // Auth env vars
    if (doc.auth) {
      appendAuthEnv(lines, doc);
    }

    // Inter-service URLs (use Docker service names for networking)
    const otherBackends = backends.filter(b => b.name !== be.name);
    for (const other of otherBackends) {
      const otherSlug = slugify(other.name);
      const otherPort = getBackendPort(other.framework);
      const envKey = `URL_${other.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_SERVICE`;
      lines.push(`      - ${envKey}=http://${otherSlug}:${otherPort}`);
    }
    // Explicit services from architecture.services
    const explicitServices = doc.architecture.services || [];
    for (const svc of explicitServices) {
      const svcSlug = slugify(svc.name);
      if (!backends.some(b => slugify(b.name) === svcSlug)) {
        const envKey = `URL_${svc.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_SERVICE`;
        lines.push(`      - ${envKey}=http://${svcSlug}:3000`);
      }
    }

    lines.push(`    depends_on:`);
    const deps = getDependsOn(doc);
    for (const dep of deps) {
      lines.push(`      ${dep}:`);
      lines.push(`        condition: service_healthy`);
    }

    lines.push(`    volumes:`);
    lines.push(`      - ./backend-${name}:/app`);
    lines.push(`      - /app/node_modules`);
    lines.push(`    restart: unless-stopped`);
  }

  // ── Frontend services ──
  for (const fe of frontends) {
    const name = slugify(fe.name);
    lines.push('');
    lines.push(`  ${name}:`);
    lines.push(`    build:`);
    lines.push(`      context: ./frontend-${name}`);
    lines.push(`      dockerfile: Dockerfile`);
    lines.push(`    container_name: ${slugify(doc.solution.name)}-${name}`);
    lines.push(`    ports:`);
    lines.push(`      - "5173:5173"`);
    lines.push(`    environment:`);

    // API URLs — point to backend Docker service names
    if (backends.length === 1) {
      const apiSlug = slugify(backends[0].name);
      const apiPort = getBackendPort(backends[0].framework);
      lines.push(`      - VITE_API_URL=http://${apiSlug}:${apiPort}`);
    } else {
      for (const be of backends) {
        const beSlug = slugify(be.name);
        const bePort = getBackendPort(be.framework);
        const envKey = `VITE_${be.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_URL`;
        lines.push(`      - ${envKey}=http://${beSlug}:${bePort}`);
      }
    }

    lines.push(`    volumes:`);
    lines.push(`      - ./frontend-${name}:/app`);
    lines.push(`      - /app/node_modules`);
    lines.push(`    restart: unless-stopped`);
  }

  // ── Database services ──
  appendDatabaseService(lines, doc);

  // Secondary databases
  if (doc.data.secondaryDatabases) {
    for (const sdb of doc.data.secondaryDatabases) {
      appendSecondaryDatabase(lines, sdb.type, sdb.role || 'secondary');
    }
  }

  // ── Cache (Redis) ──
  if (doc.data.cache?.type === 'redis') {
    lines.push('');
    lines.push('  redis:');
    lines.push('    image: redis:7-alpine');
    lines.push(`    container_name: ${slugify(doc.solution.name)}-redis`);
    lines.push('    ports:');
    lines.push('      - "6379:6379"');
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "redis-cli", "ping"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push('      - redis_data:/data');
    lines.push('    restart: unless-stopped');
  }

  // ── Queues ──
  if (doc.data.queues) {
    appendQueueService(lines, doc);
  }

  // ── Search ──
  if (doc.data.search) {
    appendSearchService(lines, doc);
  }

  // ── Volumes ──
  const volumes = getVolumes(doc);
  if (volumes.length > 0) {
    lines.push('');
    lines.push('volumes:');
    for (const vol of volumes) {
      lines.push(`  ${vol}:`);
    }
  }

  // ── Networks ──
  lines.push('');
  lines.push('networks:');
  lines.push('  default:');
  lines.push(`    name: ${slugify(doc.solution.name)}-network`);

  const files: GeneratedFile[] = [
    { path: 'artifacts/docker/docker-compose.yml', content: lines.join('\n') + '\n' },
  ];

  // Generate .env for docker-compose
  files.push({ path: 'artifacts/docker/.env', content: generateComposeEnv(doc) });

  return {
    artifactType: 'repo-scaffold', // Attached to scaffold since no dedicated type
    files,
    metadata: {
      solutionName: doc.solution.name,
      serviceCount: backends.length + frontends.length,
      hasDatabase: true,
      databaseType: dbType,
      hasCache: !!doc.data.cache?.type,
      hasQueues: !!doc.data.queues,
      hasSearch: !!doc.data.search,
    },
  };
}

// ─── Helpers ───

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getBackendPort(framework: string): number {
  switch (framework) {
    case 'python-fastapi': return 8000;
    case 'go': return 8080;
    case 'dotnet-8': return 5000;
    case 'java-spring': return 8080;
    case 'ruby-rails': return 3000;
    case 'php-laravel': return 9000;
    default: return 3000;
  }
}

function getDatabaseUrl(dbType: string, doc: SDLDocument): string | null {
  const name = slugify(doc.solution.name);
  switch (dbType) {
    case 'postgres': return `postgresql://postgres:postgres@postgres:5432/${name}`;
    case 'mysql': return `mysql://root:root@mysql:3306/${name}`;
    case 'mongodb': return `mongodb://mongo:27017/${name}`;
    case 'sqlserver': return `Server=mssql,1433;Database=${name};User Id=sa;Password=YourStrong!Pass;`;
    default: return null;
  }
}

function getDependsOn(doc: SDLDocument): string[] {
  const deps: string[] = [];
  const dbType = doc.data.primaryDatabase.type;
  if (dbType === 'postgres') deps.push('postgres');
  else if (dbType === 'mysql') deps.push('mysql');
  else if (dbType === 'mongodb') deps.push('mongo');
  if (doc.data.cache?.type === 'redis') deps.push('redis');
  return deps;
}

function appendAuthEnv(lines: string[], doc: SDLDocument): void {
  if (!doc.auth) return;
  if (doc.auth.provider === 'auth0') {
    lines.push('      - AUTH0_DOMAIN=${AUTH0_DOMAIN}');
    lines.push('      - AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}');
    lines.push('      - AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET}');
  } else if (doc.auth.provider === 'clerk') {
    lines.push('      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}');
  } else if (doc.auth.provider === 'cognito') {
    lines.push('      - COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}');
    lines.push('      - COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}');
  } else if (doc.auth.provider === 'firebase') {
    lines.push('      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}');
  }
}

function appendDatabaseService(lines: string[], doc: SDLDocument): void {
  const dbType = doc.data.primaryDatabase.type;
  const name = slugify(doc.solution.name);

  if (dbType === 'postgres') {
    lines.push('');
    lines.push('  postgres:');
    lines.push('    image: postgres:16-alpine');
    lines.push(`    container_name: ${name}-postgres`);
    lines.push('    ports:');
    lines.push('      - "5432:5432"');
    lines.push('    environment:');
    lines.push('      - POSTGRES_USER=postgres');
    lines.push('      - POSTGRES_PASSWORD=postgres');
    lines.push(`      - POSTGRES_DB=${name}`);
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD-SHELL", "pg_isready -U postgres"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push('      - postgres_data:/var/lib/postgresql/data');
    lines.push('    restart: unless-stopped');
  } else if (dbType === 'mysql') {
    lines.push('');
    lines.push('  mysql:');
    lines.push('    image: mysql:8');
    lines.push(`    container_name: ${name}-mysql`);
    lines.push('    ports:');
    lines.push('      - "3306:3306"');
    lines.push('    environment:');
    lines.push('      - MYSQL_ROOT_PASSWORD=root');
    lines.push(`      - MYSQL_DATABASE=${name}`);
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push('      - mysql_data:/var/lib/mysql');
    lines.push('    restart: unless-stopped');
  } else if (dbType === 'mongodb') {
    lines.push('');
    lines.push('  mongo:');
    lines.push('    image: mongo:7');
    lines.push(`    container_name: ${name}-mongo`);
    lines.push('    ports:');
    lines.push('      - "27017:27017"');
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "mongosh", "--eval", "db.adminCommand(\'ping\')"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push('      - mongo_data:/data/db');
    lines.push('    restart: unless-stopped');
  }
}

function appendSecondaryDatabase(lines: string[], dbType: string, role: string): void {
  const suffix = slugify(role);
  if (dbType === 'postgres') {
    lines.push('');
    lines.push(`  postgres-${suffix}:`);
    lines.push('    image: postgres:16-alpine');
    lines.push('    ports:');
    lines.push('      - "5433:5432"');
    lines.push('    environment:');
    lines.push('      - POSTGRES_USER=postgres');
    lines.push('      - POSTGRES_PASSWORD=postgres');
    lines.push(`      - POSTGRES_DB=${suffix}`);
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD-SHELL", "pg_isready -U postgres"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push(`      - postgres_${suffix}_data:/var/lib/postgresql/data`);
    lines.push('    restart: unless-stopped');
  } else if (dbType === 'mysql') {
    lines.push('');
    lines.push(`  mysql-${suffix}:`);
    lines.push('    image: mysql:8');
    lines.push('    ports:');
    lines.push('      - "3307:3306"');
    lines.push('    environment:');
    lines.push('      - MYSQL_ROOT_PASSWORD=root');
    lines.push(`      - MYSQL_DATABASE=${suffix}`);
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push(`      - mysql_${suffix}_data:/var/lib/mysql`);
    lines.push('    restart: unless-stopped');
  } else if (dbType === 'mongodb') {
    lines.push('');
    lines.push(`  mongo-${suffix}:`);
    lines.push('    image: mongo:7');
    lines.push('    ports:');
    lines.push('      - "27018:27017"');
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "mongosh", "--eval", "db.adminCommand(\'ping\')"]');
    lines.push('      interval: 5s');
    lines.push('      timeout: 3s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push(`      - mongo_${suffix}_data:/data/db`);
    lines.push('    restart: unless-stopped');
  }
}

function appendQueueService(lines: string[], doc: SDLDocument): void {
  const provider = doc.data.queues?.provider;
  const name = slugify(doc.solution.name);

  if (provider === 'rabbitmq' || provider === 'redis') {
    // Redis queues already covered by redis service
    if (provider === 'rabbitmq') {
      lines.push('');
      lines.push('  rabbitmq:');
      lines.push('    image: rabbitmq:3-management-alpine');
      lines.push(`    container_name: ${name}-rabbitmq`);
      lines.push('    ports:');
      lines.push('      - "5672:5672"');
      lines.push('      - "15672:15672"');
      lines.push('    healthcheck:');
      lines.push('      test: ["CMD", "rabbitmq-diagnostics", "check_running"]');
      lines.push('      interval: 10s');
      lines.push('      timeout: 5s');
      lines.push('      retries: 5');
      lines.push('    volumes:');
      lines.push('      - rabbitmq_data:/var/lib/rabbitmq');
      lines.push('    restart: unless-stopped');
    }
  } else if (provider === 'kafka') {
    lines.push('');
    lines.push('  kafka:');
    lines.push('    image: confluentinc/cp-kafka:7.6.0');
    lines.push(`    container_name: ${name}-kafka`);
    lines.push('    ports:');
    lines.push('      - "9092:9092"');
    lines.push('    environment:');
    lines.push('      - KAFKA_NODE_ID=1');
    lines.push('      - KAFKA_PROCESS_ROLES=broker,controller');
    lines.push('      - KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093');
    lines.push('      - KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:9093');
    lines.push('      - KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER');
    lines.push('      - CLUSTER_ID=local-dev-cluster');
    lines.push('    volumes:');
    lines.push('      - kafka_data:/var/lib/kafka/data');
    lines.push('    restart: unless-stopped');
  }
}

function appendSearchService(lines: string[], doc: SDLDocument): void {
  const provider = doc.data.search?.provider;
  const name = slugify(doc.solution.name);

  if (provider === 'elasticsearch') {
    lines.push('');
    lines.push('  elasticsearch:');
    lines.push('    image: elasticsearch:8.13.0');
    lines.push(`    container_name: ${name}-elasticsearch`);
    lines.push('    ports:');
    lines.push('      - "9200:9200"');
    lines.push('    environment:');
    lines.push('      - discovery.type=single-node');
    lines.push('      - xpack.security.enabled=false');
    lines.push('      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"');
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]');
    lines.push('      interval: 10s');
    lines.push('      timeout: 5s');
    lines.push('      retries: 5');
    lines.push('    volumes:');
    lines.push('      - elasticsearch_data:/usr/share/elasticsearch/data');
    lines.push('    restart: unless-stopped');
  } else if (provider === 'meilisearch') {
    lines.push('');
    lines.push('  meilisearch:');
    lines.push('    image: getmeili/meilisearch:v1.7');
    lines.push(`    container_name: ${name}-meilisearch`);
    lines.push('    ports:');
    lines.push('      - "7700:7700"');
    lines.push('    environment:');
    lines.push('      - MEILI_ENV=development');
    lines.push('    volumes:');
    lines.push('      - meilisearch_data:/meili_data');
    lines.push('    restart: unless-stopped');
  } else if (provider === 'typesense') {
    lines.push('');
    lines.push('  typesense:');
    lines.push('    image: typesense/typesense:26.0');
    lines.push(`    container_name: ${name}-typesense`);
    lines.push('    ports:');
    lines.push('      - "8108:8108"');
    lines.push('    environment:');
    lines.push('      - TYPESENSE_API_KEY=dev-key');
    lines.push('    volumes:');
    lines.push('      - typesense_data:/data');
    lines.push('    restart: unless-stopped');
  }
}

function getVolumes(doc: SDLDocument): string[] {
  const vols: string[] = [];
  const dbType = doc.data.primaryDatabase.type;

  if (dbType === 'postgres') vols.push('postgres_data');
  else if (dbType === 'mysql') vols.push('mysql_data');
  else if (dbType === 'mongodb') vols.push('mongo_data');

  if (doc.data.secondaryDatabases) {
    for (const sdb of doc.data.secondaryDatabases) {
      const suffix = slugify(sdb.role || 'secondary');
      if (sdb.type === 'postgres') vols.push(`postgres_${suffix}_data`);
      else if (sdb.type === 'mysql') vols.push(`mysql_${suffix}_data`);
      else if (sdb.type === 'mongodb') vols.push(`mongo_${suffix}_data`);
    }
  }

  if (doc.data.cache?.type === 'redis') vols.push('redis_data');

  if (doc.data.queues?.provider === 'rabbitmq') vols.push('rabbitmq_data');
  if (doc.data.queues?.provider === 'kafka') vols.push('kafka_data');

  if (doc.data.search?.provider === 'elasticsearch') vols.push('elasticsearch_data');
  if (doc.data.search?.provider === 'meilisearch') vols.push('meilisearch_data');
  if (doc.data.search?.provider === 'typesense') vols.push('typesense_data');

  return vols;
}

function generateComposeEnv(doc: SDLDocument): string {
  const lines: string[] = [];
  lines.push(`# Docker Compose environment — ${doc.solution.name}`);
  lines.push('# Copy to .env and fill in values');
  lines.push('');
  lines.push(`COMPOSE_PROJECT_NAME=${slugify(doc.solution.name)}`);
  lines.push('');

  if (doc.auth) {
    if (doc.auth.provider === 'auth0') {
      lines.push('AUTH0_DOMAIN=');
      lines.push('AUTH0_CLIENT_ID=');
      lines.push('AUTH0_CLIENT_SECRET=');
    } else if (doc.auth.provider === 'clerk') {
      lines.push('CLERK_SECRET_KEY=');
    } else if (doc.auth.provider === 'cognito') {
      lines.push('COGNITO_USER_POOL_ID=');
      lines.push('COGNITO_CLIENT_ID=');
    } else if (doc.auth.provider === 'firebase') {
      lines.push('FIREBASE_PROJECT_ID=');
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}
