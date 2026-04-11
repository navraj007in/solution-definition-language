import type { SDLDocument, BackendProject, FrontendProject } from '../types';
import type { RawGeneratorResult, GeneratedFile } from './types';

/**
 * Generates Kubernetes manifests for production deployment.
 * Includes Deployments, Services, Ingress, ConfigMap, HPA, and Namespace.
 * Deterministic — same input always produces identical output.
 */
export function generateKubernetes(doc: SDLDocument): RawGeneratorResult {
  const files: GeneratedFile[] = [];
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const ns = slugify(doc.solution.name);

  // Namespace
  files.push({
    path: `artifacts/k8s/namespace.yaml`,
    content: renderNamespace(ns),
  });

  // ConfigMap
  files.push({
    path: `artifacts/k8s/configmap.yaml`,
    content: renderConfigMap(ns, doc),
  });

  // Backend manifests
  for (const be of backends) {
    const name = slugify(be.name);
    const port = getBackendPort(be.framework);
    const replicas = getBackendReplicas(doc);

    files.push({
      path: `artifacts/k8s/backend-${name}-deployment.yaml`,
      content: renderDeployment(ns, name, 'backend', port, replicas, be.framework),
    });
    files.push({
      path: `artifacts/k8s/backend-${name}-service.yaml`,
      content: renderService(ns, name, port),
    });
    files.push({
      path: `artifacts/k8s/backend-${name}-hpa.yaml`,
      content: renderHPA(ns, name, replicas),
    });
  }

  // Frontend manifests
  for (const fe of frontends) {
    const name = slugify(fe.name);
    files.push({
      path: `artifacts/k8s/frontend-${name}-deployment.yaml`,
      content: renderDeployment(ns, name, 'frontend', 80, 2, fe.framework),
    });
    files.push({
      path: `artifacts/k8s/frontend-${name}-service.yaml`,
      content: renderService(ns, name, 80),
    });
  }

  // Ingress
  files.push({
    path: `artifacts/k8s/ingress.yaml`,
    content: renderIngress(ns, frontends, backends, doc),
  });

  return {
    artifactType: 'deployment-guide',
    files,
    metadata: {
      solutionName: doc.solution.name,
      namespace: ns,
      backendCount: backends.length,
      frontendCount: frontends.length,
      totalManifests: files.length,
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

function getBackendReplicas(doc: SDLDocument): number {
  const users = doc.nonFunctional.scaling.expectedUsersYear1 || 1000;
  if (users > 50000) return 5;
  if (users > 10000) return 3;
  return 2;
}

function getResourceLimits(tier: 'backend' | 'frontend'): { cpuReq: string; cpuLim: string; memReq: string; memLim: string } {
  if (tier === 'backend') {
    return { cpuReq: '100m', cpuLim: '500m', memReq: '128Mi', memLim: '512Mi' };
  }
  return { cpuReq: '50m', cpuLim: '200m', memReq: '64Mi', memLim: '256Mi' };
}

// ─── Renderers ───

function renderNamespace(ns: string): string {
  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    app.kubernetes.io/managed-by: arch0-sdl
`;
}

function renderConfigMap(ns: string, doc: SDLDocument): string {
  const lines: string[] = [];
  lines.push(`apiVersion: v1`);
  lines.push(`kind: ConfigMap`);
  lines.push(`metadata:`);
  lines.push(`  name: ${ns}-config`);
  lines.push(`  namespace: ${ns}`);
  lines.push(`data:`);
  lines.push(`  NODE_ENV: "production"`);
  lines.push(`  APP_NAME: "${doc.solution.name}"`);

  const dbType = doc.data.primaryDatabase.type;
  if (dbType === 'postgres') lines.push(`  DB_TYPE: "postgres"`);
  else if (dbType === 'mysql') lines.push(`  DB_TYPE: "mysql"`);
  else if (dbType === 'mongodb') lines.push(`  DB_TYPE: "mongodb"`);
  else lines.push(`  DB_TYPE: "${dbType}"`);

  if (doc.data.cache?.type === 'redis') {
    lines.push(`  REDIS_ENABLED: "true"`);
  }

  if (doc.auth?.provider) {
    lines.push(`  AUTH_PROVIDER: "${doc.auth.provider}"`);
  }

  return lines.join('\n') + '\n';
}

function renderDeployment(
  ns: string,
  name: string,
  tier: 'backend' | 'frontend',
  port: number,
  replicas: number,
  framework: string,
): string {
  const res = getResourceLimits(tier);
  const appLabel = `${ns}-${name}`;
  const image = `${ns}/${name}:latest`;

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${appLabel}
    tier: ${tier}
    framework: ${framework}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${appLabel}
  template:
    metadata:
      labels:
        app: ${appLabel}
        tier: ${tier}
    spec:
      containers:
        - name: ${name}
          image: ${image}
          ports:
            - containerPort: ${port}
          envFrom:
            - configMapRef:
                name: ${ns}-config
          resources:
            requests:
              cpu: "${res.cpuReq}"
              memory: "${res.memReq}"
            limits:
              cpu: "${res.cpuLim}"
              memory: "${res.memLim}"
          readinessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 15
            periodSeconds: 20
`;
}

function renderService(ns: string, name: string, port: number): string {
  const appLabel = `${ns}-${name}`;

  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${ns}
spec:
  selector:
    app: ${appLabel}
  ports:
    - protocol: TCP
      port: ${port}
      targetPort: ${port}
  type: ClusterIP
`;
}

function renderHPA(ns: string, name: string, minReplicas: number): string {
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}-hpa
  namespace: ${ns}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: ${minReplicas}
  maxReplicas: ${minReplicas * 3}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
`;
}

function renderIngress(
  ns: string,
  frontends: FrontendProject[],
  backends: BackendProject[],
  doc: SDLDocument,
): string {
  const lines: string[] = [];
  const host = doc.solution.domain || `${ns}.example.com`;
  const useTls = doc.nonFunctional.security?.encryptionInTransit !== false;

  lines.push(`apiVersion: networking.k8s.io/v1`);
  lines.push(`kind: Ingress`);
  lines.push(`metadata:`);
  lines.push(`  name: ${ns}-ingress`);
  lines.push(`  namespace: ${ns}`);
  lines.push(`  annotations:`);
  lines.push(`    nginx.ingress.kubernetes.io/rewrite-target: /`);
  if (useTls) {
    lines.push(`    cert-manager.io/cluster-issuer: "letsencrypt-prod"`);
  }
  lines.push(`spec:`);
  lines.push(`  ingressClassName: nginx`);

  if (useTls) {
    lines.push(`  tls:`);
    lines.push(`    - hosts:`);
    lines.push(`        - ${host}`);
    lines.push(`      secretName: ${ns}-tls`);
  }

  lines.push(`  rules:`);
  lines.push(`    - host: ${host}`);
  lines.push(`      http:`);
  lines.push(`        paths:`);

  // API backends under /api
  for (const be of backends) {
    const name = slugify(be.name);
    const port = getBackendPort(be.framework);
    lines.push(`          - path: /api`);
    lines.push(`            pathType: Prefix`);
    lines.push(`            backend:`);
    lines.push(`              service:`);
    lines.push(`                name: ${name}`);
    lines.push(`                port:`);
    lines.push(`                  number: ${port}`);
  }

  // Frontends at /
  for (const fe of frontends) {
    const name = slugify(fe.name);
    lines.push(`          - path: /`);
    lines.push(`            pathType: Prefix`);
    lines.push(`            backend:`);
    lines.push(`              service:`);
    lines.push(`                name: ${name}`);
    lines.push(`                port:`);
    lines.push(`                  number: 80`);
  }

  return lines.join('\n') + '\n';
}
