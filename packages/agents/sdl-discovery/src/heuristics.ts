/**
 * Component detection heuristics for SDL Discovery Agent
 */

import type { HeuristicRule } from './types.js';

/**
 * Service detection heuristics
 */
export const serviceHeuristics: HeuristicRule[] = [
  {
    id: 'service-entrypoint-go',
    componentType: 'service',
    category: 'strong',
    signal: 'Go entrypoint file',
    weight: 0.4,
    confidence: 'high',
    indicators: ['src/main.go', 'cmd/main.go', 'cmd/server/main.go']
  },
  {
    id: 'service-entrypoint-dotnet',
    componentType: 'service',
    category: 'strong',
    signal: '.NET entrypoint',
    weight: 0.4,
    confidence: 'high',
    indicators: ['src/Program.cs', 'Program.cs', 'src/Startup.cs']
  },
  {
    id: 'service-entrypoint-nodejs',
    componentType: 'service',
    category: 'strong',
    signal: 'Node.js entrypoint',
    weight: 0.4,
    confidence: 'high',
    indicators: ['src/index.ts', 'src/index.js', 'src/server.ts', 'app.js', 'server.js', 'index.js']
  },
  {
    id: 'service-entrypoint-python',
    componentType: 'service',
    category: 'strong',
    signal: 'Python entrypoint',
    weight: 0.4,
    confidence: 'high',
    indicators: ['app.py', 'main.py', 'wsgi.py', 'asgi.py']
  },
  {
    id: 'service-dockerfile',
    componentType: 'service',
    category: 'strong',
    signal: 'Dockerfile present',
    weight: 0.3,
    confidence: 'high',
    indicators: ['Dockerfile', 'dockerfile']
  },
  {
    id: 'service-routes-express',
    componentType: 'service',
    category: 'medium',
    signal: 'Express routes',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['app.get', 'app.post', 'app.put', 'app.delete', 'router.get']
  },
  {
    id: 'service-routes-spring',
    componentType: 'service',
    category: 'medium',
    signal: 'Spring controller',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['@RestController', '@Controller', '@GetMapping', '@PostMapping']
  },
  {
    id: 'service-routes-fastapi',
    componentType: 'service',
    category: 'medium',
    signal: 'FastAPI routes',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['@app.get', '@app.post', '@app.put', '@router.get']
  },
  {
    id: 'service-env-config',
    componentType: 'service',
    category: 'medium',
    signal: 'Environment configuration',
    weight: 0.1,
    confidence: 'medium',
    indicators: ['.env.example', '.env', 'appsettings.json']
  },
  {
    id: 'service-naming',
    componentType: 'service',
    category: 'weak',
    signal: 'Service naming pattern',
    weight: 0.05,
    confidence: 'low',
    indicators: ['-service', '-api', '-server']
  }
];

/**
 * Frontend detection heuristics
 */
export const frontendHeuristics: HeuristicRule[] = [
  {
    id: 'frontend-react',
    componentType: 'frontend',
    category: 'strong',
    signal: 'React framework',
    weight: 0.4,
    confidence: 'high',
    indicators: ['react', 'next', '@reactjs']
  },
  {
    id: 'frontend-vue',
    componentType: 'frontend',
    category: 'strong',
    signal: 'Vue framework',
    weight: 0.4,
    confidence: 'high',
    indicators: ['vue', 'nuxt', '@vue']
  },
  {
    id: 'frontend-angular',
    componentType: 'frontend',
    category: 'strong',
    signal: 'Angular framework',
    weight: 0.4,
    confidence: 'high',
    indicators: ['@angular', 'angular.json']
  },
  {
    id: 'frontend-svelte',
    componentType: 'frontend',
    category: 'strong',
    signal: 'Svelte framework',
    weight: 0.4,
    confidence: 'high',
    indicators: ['svelte', 'sveltekit']
  },
  {
    id: 'frontend-pages-directory',
    componentType: 'frontend',
    category: 'medium',
    signal: 'Pages directory (SPA pattern)',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['pages/', 'src/pages/', 'app/']
  },
  {
    id: 'frontend-public-assets',
    componentType: 'frontend',
    category: 'medium',
    signal: 'Public assets directory',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['public/', 'static/', 'assets/']
  },
  {
    id: 'frontend-build-tool',
    componentType: 'frontend',
    category: 'medium',
    signal: 'Frontend build tooling',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['vite.config', 'webpack.config', 'next.config', 'gatsby-config']
  }
];

/**
 * Library detection heuristics
 */
export const libraryHeuristics: HeuristicRule[] = [
  {
    id: 'library-referenced-as-dependency',
    componentType: 'library',
    category: 'strong',
    signal: 'Referenced by other packages',
    weight: 0.5,
    confidence: 'high',
    indicators: ['package.json imports', 'go.mod require', 'Cargo.toml dependency']
  },
  {
    id: 'library-no-entrypoint',
    componentType: 'library',
    category: 'strong',
    signal: 'No standalone entrypoint',
    weight: 0.3,
    confidence: 'high',
    indicators: ['no main.go', 'no Program.cs', 'no index.js']
  },
  {
    id: 'library-utilities-structure',
    componentType: 'library',
    category: 'medium',
    signal: 'Utility/helper structure',
    weight: 0.2,
    confidence: 'medium',
    indicators: ['src/utils/', 'lib/', 'src/lib/', 'helpers/']
  },
  {
    id: 'library-sdk-naming',
    componentType: 'library',
    category: 'weak',
    signal: 'SDK/client library naming',
    weight: 0.1,
    confidence: 'low',
    indicators: ['-sdk', '-client', '-lib']
  }
];

/**
 * Worker detection heuristics
 */
export const workerHeuristics: HeuristicRule[] = [
  {
    id: 'worker-queue-consumer',
    componentType: 'worker',
    category: 'strong',
    signal: 'Queue consumer library',
    weight: 0.4,
    confidence: 'high',
    indicators: ['kafka', 'rabbitmq', 'bull', 'celery', 'amqp']
  },
  {
    id: 'worker-scheduler',
    componentType: 'worker',
    category: 'strong',
    signal: 'Cron/job scheduler',
    weight: 0.4,
    confidence: 'high',
    indicators: ['node-cron', 'APScheduler', 'Quartz', 'BackgroundService']
  },
  {
    id: 'worker-no-http-listener',
    componentType: 'worker',
    category: 'medium',
    signal: 'No HTTP listener in Dockerfile',
    weight: 0.3,
    confidence: 'medium',
    indicators: ['no EXPOSE 80', 'no EXPOSE 3000', 'node script.js']
  },
  {
    id: 'worker-naming',
    componentType: 'worker',
    category: 'weak',
    signal: 'Worker naming pattern',
    weight: 0.1,
    confidence: 'low',
    indicators: ['-worker', '-consumer', '-job', '-scheduler']
  }
];

/**
 * All heuristic rules indexed by component type
 */
export const allHeuristics: Record<string, HeuristicRule[]> = {
  service: serviceHeuristics,
  frontend: frontendHeuristics,
  library: libraryHeuristics,
  worker: workerHeuristics
};

/**
 * Score heuristic rules for a candidate component
 *
 * @param signals Detected signals (files, patterns, etc.)
 * @param heuristics Rules to evaluate
 * @returns Score from 0 to 1
 */
export function scoreComponent(signals: string[], heuristics: HeuristicRule[]): number {
  let score = 0;

  for (const heuristic of heuristics) {
    for (const signal of signals) {
      if (heuristic.indicators.some(indicator => signal.includes(indicator))) {
        score += heuristic.weight;
        break;
      }
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Determine confidence level from score
 */
export function confidenceFromScore(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Complexity Signal Detection (v1.0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit breaker libraries that indicate failure isolation is in place
 */
export const circuitBreakerSignals: readonly string[] = [
  'opossum',
  'hystrix',
  'resilience4j',
  'polly',
  'cockatiel',
  'pybreaker',
  'circuit-breaker',
  'brakes',
  'node-circuit-breaker'
];

/**
 * Retry/backoff libraries that add to temporal complexity
 */
export const retrySignals: readonly string[] = [
  'p-retry',
  'axios-retry',
  'retry-as-promised',
  'async-retry',
  'retry',
  'exponential-backoff',
  'tenacity',
  'backoff'
];

/**
 * Distributed tracing libraries that lower delivery burden
 */
export const tracingSignals: readonly string[] = [
  '@opentelemetry/sdk-node',
  'opentelemetry',
  'jaeger-client',
  'elastic-apm-node',
  'dd-trace',
  'newrelic',
  'zipkin'
];

/**
 * Metrics libraries that lower delivery burden
 */
export const metricsSignals: readonly string[] = [
  'prom-client',
  'hot-shots',
  'statsd',
  'datadog',
  'node-dogstatsd',
  'prometheus-client',
  '@opentelemetry/exporter-prometheus'
];

/**
 * Structured logging libraries (reduce delivery burden vs. console.log)
 */
export const loggingSignals: readonly string[] = [
  'winston',
  'pino',
  'bunyan',
  'log4js',
  'morgan',
  'serilog',
  'microsoft.extensions.logging',
  'zap',
  'logrus',
  'zerolog'
];

/**
 * Secrets management packages (reduce delivery burden vs. .env)
 */
export const secretsSignals: readonly string[] = [
  '@aws-sdk/client-secrets-manager',
  'aws-secrets-manager',
  '@azure/keyvault-secrets',
  'node-vault',
  'vault',
  'hashicorp/vault',
  '@google-cloud/secret-manager'
];

/**
 * Feature flag libraries (indicate fallback capability)
 */
export const featureFlagSignals: readonly string[] = [
  'unleash-client',
  'launchdarkly-node-client-sdk',
  '@launchdarkly/node-server-sdk',
  'flagsmith',
  'openfeature',
  'growthbook',
  'flipper'
];

/**
 * Distributed state / locking libraries
 */
export const distributedStateSignals: readonly string[] = [
  'redlock',
  'redis-semaphore',
  'node-redlock',
  'ioredis',
  'distributed-lock',
  'pg-boss',
  'bullmq'
];

/**
 * Checks if any signal from a list appears in a set of package names (case-insensitive)
 *
 * @param packages List of package names from dependencies
 * @param signals List of signal strings to match
 * @returns Matched package names
 */
export function detectSignals(packages: string[], signals: readonly string[]): string[] {
  return packages.filter(pkg =>
    signals.some(signal => pkg.toLowerCase().includes(signal.toLowerCase()))
  );
}

/**
 * Returns true if circuit breaker usage is detected in the package list
 */
export function hasCircuitBreaker(packages: string[]): boolean {
  return detectSignals(packages, circuitBreakerSignals).length > 0;
}

/**
 * Returns true if distributed tracing is detected in the package list
 */
export function hasDistributedTracing(packages: string[]): boolean {
  return detectSignals(packages, tracingSignals).length > 0;
}

/**
 * Returns true if metrics instrumentation is detected
 */
export function hasMetrics(packages: string[]): boolean {
  return detectSignals(packages, metricsSignals).length > 0;
}

/**
 * Returns true if structured logging is detected
 */
export function hasStructuredLogging(packages: string[]): boolean {
  return detectSignals(packages, loggingSignals).length > 0;
}

/**
 * Returns true if vault/secrets manager is detected (not just .env)
 */
export function hasSecretsManager(packages: string[]): boolean {
  return detectSignals(packages, secretsSignals).length > 0;
}

/**
 * Returns true if feature flags are in use (fallback capability signal)
 */
export function hasFeatureFlags(packages: string[]): boolean {
  return detectSignals(packages, featureFlagSignals).length > 0;
}
