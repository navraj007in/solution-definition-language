import type { SDLDocument } from '../types';
import type { RawGeneratorResult } from './types';

/**
 * Generates infrastructure-as-code from an SDL document:
 *   - CI/CD pipeline (GitHub Actions / GitLab CI)
 *   - Terraform configuration for the target cloud
 * Deterministic — same input always produces identical output.
 */
export function generateCiCdPipeline(doc: SDLDocument): RawGeneratorResult {
  const provider = doc.deployment.ciCd?.provider || 'github-actions';

  let cicdResult: RawGeneratorResult;
  if (provider === 'gitlab-ci') {
    cicdResult = generateGitLabCi(doc);
  } else if (provider === 'azure-devops') {
    cicdResult = generateAzureDevOps(doc);
  } else {
    cicdResult = generateGitHubActions(doc);
  }

  // Add IaC files based on deployment.infrastructure.iac
  const iac = doc.deployment.infrastructure?.iac || 'terraform';
  const iacFiles = generateIaC(doc, iac);
  if (iacFiles) {
    cicdResult.files.push(...iacFiles);
    (cicdResult.metadata as Record<string, unknown>).hasIaC = true;
    (cicdResult.metadata as Record<string, unknown>).iac = iac;
    // Backwards-compatible alias
    if (iac === 'terraform') {
      (cicdResult.metadata as Record<string, unknown>).hasTerraform = true;
    }
  }

  // Add Dockerfiles for all projects
  const dockerfiles = generateDockerfiles(doc);
  if (dockerfiles.length > 0) {
    cicdResult.files.push(...dockerfiles);
    (cicdResult.metadata as Record<string, unknown>).hasDockerfiles = true;
  }

  return cicdResult;
}

function generateGitHubActions(doc: SDLDocument): RawGeneratorResult {
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const lines: string[] = [];

  lines.push(`name: CI/CD — ${doc.solution.name}`);
  lines.push('');
  lines.push('on:');
  lines.push('  push:');
  lines.push('    branches: [main]');
  lines.push('  pull_request:');
  lines.push('    branches: [main]');
  lines.push('');
  lines.push('env:');
  lines.push(`  NODE_VERSION: '20'`);

  // Add database env vars for test services
  const dbType = doc.data.primaryDatabase.type;
  if (dbType === 'postgres') {
    lines.push(`  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test`);
  } else if (dbType === 'mysql') {
    lines.push(`  DATABASE_URL: mysql://root:root@localhost:3306/test`);
  } else if (dbType === 'mongodb') {
    lines.push(`  DATABASE_URL: mongodb://localhost:27017/test`);
  }

  lines.push('');
  lines.push('jobs:');

  // Backend jobs
  for (const be of backends) {
    const jobId = sanitizeJobId(be.name);
    lines.push(`  ${jobId}:`);
    lines.push(`    name: Backend — ${be.name}`);
    lines.push('    runs-on: ubuntu-latest');

    // Database service container
    const services = getDatabaseService(dbType);
    if (services) {
      lines.push('    services:');
      lines.push(services);
    }

    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');

    if (be.framework === 'nodejs' || !be.framework) {
      lines.push('      - uses: actions/setup-node@v4');
      lines.push('        with:');
      lines.push('          node-version: ${{ env.NODE_VERSION }}');
      lines.push('          cache: npm');
      lines.push(`      - run: npm ci`);
      lines.push(`      - run: npm run lint`);
      if (be.orm === 'prisma') {
        lines.push(`      - run: npx prisma generate`);
      }
      lines.push(`      - run: npm test`);
      lines.push(`      - run: npm run build`);
    } else if (be.framework === 'python-fastapi') {
      lines.push('      - uses: actions/setup-python@v5');
      lines.push('        with:');
      lines.push(`          python-version: '3.12'`);
      lines.push('      - run: pip install -r requirements.txt');
      lines.push('      - run: pip install ruff pytest');
      lines.push('      - run: ruff check .');
      lines.push('      - run: pytest');
    } else if (be.framework === 'go') {
      lines.push('      - uses: actions/setup-go@v5');
      lines.push('        with:');
      lines.push(`          go-version: '1.22'`);
      lines.push('      - run: go vet ./...');
      lines.push('      - run: go test ./...');
      lines.push('      - run: go build -o bin/server ./cmd/server');
    }

    lines.push('');
  }

  // Frontend jobs
  for (const fe of frontends) {
    const jobId = sanitizeJobId(fe.name);
    lines.push(`  ${jobId}:`);
    lines.push(`    name: Frontend — ${fe.name}`);
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push('          node-version: ${{ env.NODE_VERSION }}');
    lines.push('          cache: npm');
    lines.push('      - run: npm ci');
    lines.push('      - run: npm run lint');
    lines.push('      - run: npm run build');
    lines.push('');
  }

  // Deploy job (only on push to main)
  if (backends.length > 0 || frontends.length > 0) {
    const needsJobs = [...backends, ...frontends].map((p) => sanitizeJobId(p.name));
    lines.push('  deploy:');
    lines.push(`    name: Deploy to ${deployTargetLabel(doc.deployment.cloud)}`);
    lines.push('    runs-on: ubuntu-latest');
    lines.push(`    needs: [${needsJobs.join(', ')}]`);
    lines.push("    if: github.ref == 'refs/heads/main' && github.event_name == 'push'");
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');

    const cloud = doc.deployment.cloud;
    if (cloud === 'aws') {
      lines.push('      - uses: aws-actions/configure-aws-credentials@v4');
      lines.push('        with:');
      lines.push('          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}');
      lines.push('          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}');
      lines.push('          aws-region: ${{ vars.AWS_REGION }}');
      lines.push('      - uses: aws-actions/amazon-ecr-login@v2');
      lines.push('        id: ecr-login');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push('      - name: Build and push ' + be.name);
        lines.push('        run: |');
        lines.push('          docker build -t ${{ steps.ecr-login.outputs.registry }}/' + name + ':${{ github.sha }} .');
        lines.push('          docker push ${{ steps.ecr-login.outputs.registry }}/' + name + ':${{ github.sha }}');
      }
      lines.push('      - name: Deploy to ECS');
      lines.push('        run: |');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push('          aws ecs update-service --cluster ${{ vars.ECS_CLUSTER }} --service ' + name + ' --force-new-deployment');
      }
      if (frontends.length > 0) {
        lines.push('      - name: Deploy frontend to S3 + CloudFront');
        lines.push('        run: |');
        for (const fe of frontends) {
          const envName = slugify(fe.name).toUpperCase().replace(/-/g, '_');
          lines.push('          aws s3 sync ./dist s3://${{ vars.S3_BUCKET_' + envName + ' }} --delete');
          lines.push('          aws cloudfront create-invalidation --distribution-id ${{ vars.CF_DIST_' + envName + ' }} --paths "/*"');
        }
      }
    } else if (cloud === 'vercel') {
      lines.push('      - uses: amondnet/vercel-action@v25');
      lines.push('        with:');
      lines.push('          vercel-token: ${{ secrets.VERCEL_TOKEN }}');
      lines.push('          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}');
      lines.push('          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}');
      lines.push('          vercel-args: --prod');
    } else if (cloud === 'gcp') {
      lines.push('      - uses: google-github-actions/auth@v2');
      lines.push('        with:');
      lines.push('          credentials_json: ${{ secrets.GCP_CREDENTIALS }}');
      lines.push('      - name: Set up Cloud SDK');
      lines.push('        uses: google-github-actions/setup-gcloud@v2');
      lines.push('      - name: Configure Docker for GCR');
      lines.push('        run: gcloud auth configure-docker');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push('      - name: Build and push ' + be.name);
        lines.push('        run: |');
        lines.push('          docker build -t gcr.io/${{ vars.GCP_PROJECT }}/' + name + ':${{ github.sha }} .');
        lines.push('          docker push gcr.io/${{ vars.GCP_PROJECT }}/' + name + ':${{ github.sha }}');
        lines.push('      - name: Deploy ' + be.name + ' to Cloud Run');
        lines.push('        run: |');
        lines.push('          gcloud run deploy ' + name + ' \\');
        lines.push('            --image gcr.io/${{ vars.GCP_PROJECT }}/' + name + ':${{ github.sha }} \\');
        lines.push('            --region ${{ vars.GCP_REGION }} \\');
        lines.push('            --platform managed \\');
        lines.push('            --allow-unauthenticated');
      }
    } else if (cloud === 'azure') {
      lines.push('      - uses: azure/login@v2');
      lines.push('        with:');
      lines.push('          creds: ${{ secrets.AZURE_CREDENTIALS }}');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push('      - name: Build and push ' + be.name);
        lines.push('        run: |');
        lines.push('          az acr build --registry ${{ vars.ACR_NAME }} --image ' + name + ':${{ github.sha }} .');
        lines.push('      - name: Deploy ' + be.name + ' to Container Apps');
        lines.push('        run: |');
        lines.push('          az containerapp update \\');
        lines.push('            --name ' + name + ' \\');
        lines.push('            --resource-group ${{ vars.AZURE_RESOURCE_GROUP }} \\');
        lines.push('            --image ${{ vars.ACR_NAME }}.azurecr.io/' + name + ':${{ github.sha }}');
      }
      if (frontends.length > 0) {
        lines.push('      - name: Deploy frontend to Static Web Apps');
        lines.push('        uses: azure/static-web-apps-deploy@v1');
        lines.push('        with:');
        lines.push('          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN }}');
        lines.push('          action: upload');
        lines.push('          app_location: /');
        lines.push('          output_location: dist');
      }
    } else if (cloud === 'railway') {
      lines.push('      - run: npm install -g @railway/cli');
      lines.push('      - run: railway up');
      lines.push('        env:');
      lines.push('          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}');
    } else {
      lines.push(`      - run: echo "Deploy to ${cloud} — configure deployment commands for your provider"`);
    }
    lines.push('');
  }

  const content = lines.join('\n');

  return {
    artifactType: 'iac-skeleton',
    files: [
      {
        path: 'artifacts/cicd/ci.yml',
        content,
      },
    ],
    metadata: {
      solutionName: doc.solution.name,
      provider: 'github-actions',
      cloud: doc.deployment.cloud,
    },
  };
}

function sanitizeJobId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function deployTargetLabel(cloud: string): string {
  const labels: Record<string, string> = {
    aws: 'AWS',
    gcp: 'Google Cloud',
    azure: 'Azure',
    vercel: 'Vercel',
    railway: 'Railway',
    render: 'Render',
    'fly-io': 'Fly.io',
    cloudflare: 'Cloudflare',
  };
  return labels[cloud] || cloud;
}

// ─── GitLab CI Generator ───

function generateGitLabCi(doc: SDLDocument): RawGeneratorResult {
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push(`# CI/CD Pipeline — ${doc.solution.name}`);
  lines.push('');
  lines.push('stages:');
  lines.push('  - lint');
  lines.push('  - test');
  lines.push('  - build');
  lines.push('  - deploy');
  lines.push('');

  lines.push('variables:');
  lines.push('  NODE_VERSION: "20"');
  if (dbType === 'postgres') {
    lines.push('  POSTGRES_USER: postgres');
    lines.push('  POSTGRES_PASSWORD: postgres');
    lines.push('  POSTGRES_DB: test');
    lines.push('  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test');
  } else if (dbType === 'mysql') {
    lines.push('  MYSQL_ROOT_PASSWORD: root');
    lines.push('  MYSQL_DATABASE: test');
    lines.push('  DATABASE_URL: mysql://root:root@mysql:3306/test');
  } else if (dbType === 'mongodb') {
    lines.push('  DATABASE_URL: mongodb://mongo:27017/test');
  }
  lines.push('');

  // Backend jobs
  for (const be of backends) {
    const prefix = sanitizeJobId(be.name);

    if (be.framework === 'nodejs' || !be.framework) {
      lines.push(`${prefix}-lint:`);
      lines.push('  stage: lint');
      lines.push('  image: node:$NODE_VERSION');
      lines.push('  script:');
      lines.push('    - npm ci');
      lines.push('    - npm run lint');
      lines.push('');

      lines.push(`${prefix}-test:`);
      lines.push('  stage: test');
      lines.push('  image: node:$NODE_VERSION');
      appendGitLabServices(lines, dbType);
      lines.push('  script:');
      lines.push('    - npm ci');
      if (be.orm === 'prisma') {
        lines.push('    - npx prisma generate');
      }
      lines.push('    - npm test');
      lines.push('');

      lines.push(`${prefix}-build:`);
      lines.push('  stage: build');
      lines.push('  image: node:$NODE_VERSION');
      lines.push('  script:');
      lines.push('    - npm ci');
      lines.push('    - npm run build');
      lines.push('  artifacts:');
      lines.push('    paths:');
      lines.push('      - dist/');
      lines.push('');
    } else if (be.framework === 'python-fastapi') {
      lines.push(`${prefix}-lint:`);
      lines.push('  stage: lint');
      lines.push('  image: python:3.12');
      lines.push('  script:');
      lines.push('    - pip install ruff');
      lines.push('    - ruff check .');
      lines.push('');

      lines.push(`${prefix}-test:`);
      lines.push('  stage: test');
      lines.push('  image: python:3.12');
      appendGitLabServices(lines, dbType);
      lines.push('  script:');
      lines.push('    - pip install -r requirements.txt');
      lines.push('    - pip install pytest');
      lines.push('    - pytest');
      lines.push('');
    } else if (be.framework === 'go') {
      lines.push(`${prefix}-lint:`);
      lines.push('  stage: lint');
      lines.push('  image: golang:1.22');
      lines.push('  script:');
      lines.push('    - go vet ./...');
      lines.push('');

      lines.push(`${prefix}-test:`);
      lines.push('  stage: test');
      lines.push('  image: golang:1.22');
      appendGitLabServices(lines, dbType);
      lines.push('  script:');
      lines.push('    - go test ./...');
      lines.push('');

      lines.push(`${prefix}-build:`);
      lines.push('  stage: build');
      lines.push('  image: golang:1.22');
      lines.push('  script:');
      lines.push('    - go build -o bin/server ./cmd/server');
      lines.push('  artifacts:');
      lines.push('    paths:');
      lines.push('      - bin/');
      lines.push('');
    } else if (be.framework === 'dotnet-8') {
      lines.push(`${prefix}-build-test:`);
      lines.push('  stage: build');
      lines.push('  image: mcr.microsoft.com/dotnet/sdk:8.0');
      appendGitLabServices(lines, dbType);
      lines.push('  script:');
      lines.push('    - dotnet restore');
      lines.push('    - dotnet build --no-restore');
      lines.push('    - dotnet test --no-build');
      lines.push('    - dotnet publish -c Release -o out');
      lines.push('  artifacts:');
      lines.push('    paths:');
      lines.push('      - out/');
      lines.push('');
    }
  }

  // Frontend jobs
  for (const fe of frontends) {
    const prefix = sanitizeJobId(fe.name);

    lines.push(`${prefix}-lint:`);
    lines.push('  stage: lint');
    lines.push('  image: node:$NODE_VERSION');
    lines.push('  script:');
    lines.push('    - npm ci');
    lines.push('    - npm run lint');
    lines.push('');

    lines.push(`${prefix}-build:`);
    lines.push('  stage: build');
    lines.push('  image: node:$NODE_VERSION');
    lines.push('  script:');
    lines.push('    - npm ci');
    lines.push('    - npm run build');
    lines.push('  artifacts:');
    lines.push('    paths:');
    lines.push('      - dist/');
    lines.push('');
  }

  // Deploy job
  const cloud = doc.deployment.cloud;
  lines.push('deploy:');
  lines.push('  stage: deploy');
  lines.push('  only:');
  lines.push('    - main');

  if (cloud === 'aws') {
    lines.push('  image: amazon/aws-cli');
    lines.push('  services:');
    lines.push('    - docker:dind');
    lines.push('  before_script:');
    lines.push('    - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY');
    lines.push('  script:');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`    - docker build -t $ECR_REGISTRY/${name}:$CI_COMMIT_SHA .`);
      lines.push(`    - docker push $ECR_REGISTRY/${name}:$CI_COMMIT_SHA`);
      lines.push(`    - aws ecs update-service --cluster $ECS_CLUSTER --service ${name} --force-new-deployment`);
    }
    if (frontends.length > 0) {
      for (const fe of frontends) {
        const name = slugify(fe.name);
        lines.push(`    - aws s3 sync ./dist s3://$S3_BUCKET_${name.toUpperCase().replace(/-/g, '_')} --delete`);
        lines.push(`    - aws cloudfront create-invalidation --distribution-id $CF_DIST_${name.toUpperCase().replace(/-/g, '_')} --paths "/*"`);
      }
    }
  } else if (cloud === 'gcp') {
    lines.push('  image: google/cloud-sdk:latest');
    lines.push('  script:');
    lines.push('    - gcloud auth activate-service-account --key-file=$GCP_CREDENTIALS');
    lines.push('    - gcloud auth configure-docker');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`    - docker build -t gcr.io/$GCP_PROJECT/${name}:$CI_COMMIT_SHA .`);
      lines.push(`    - docker push gcr.io/$GCP_PROJECT/${name}:$CI_COMMIT_SHA`);
      lines.push(`    - gcloud run deploy ${name} --image gcr.io/$GCP_PROJECT/${name}:$CI_COMMIT_SHA --region $GCP_REGION --platform managed --allow-unauthenticated`);
    }
  } else if (cloud === 'azure') {
    lines.push('  image: mcr.microsoft.com/azure-cli');
    lines.push('  script:');
    lines.push('    - az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`    - az acr build --registry $ACR_NAME --image ${name}:$CI_COMMIT_SHA .`);
      lines.push(`    - az containerapp update --name ${name} --resource-group $AZURE_RESOURCE_GROUP --image $ACR_NAME.azurecr.io/${name}:$CI_COMMIT_SHA`);
    }
    if (frontends.length > 0) {
      lines.push('    - npm install -g @azure/static-web-apps-cli');
      lines.push('    - swa deploy ./dist --deployment-token $AZURE_SWA_TOKEN');
    }
  } else if (cloud === 'railway') {
    lines.push('  image: node:$NODE_VERSION');
    lines.push('  script:');
    lines.push('    - npm install -g @railway/cli');
    lines.push('    - railway up');
  } else if (cloud === 'vercel') {
    lines.push('  image: node:$NODE_VERSION');
    lines.push('  script:');
    lines.push('    - npm install -g vercel');
    lines.push('    - vercel deploy --prod --token $VERCEL_TOKEN');
  } else {
    lines.push('  script:');
    lines.push(`    - echo "Deploy to ${cloud} — configure deployment commands for your provider"`);
  }
  lines.push('');

  return {
    artifactType: 'iac-skeleton',
    files: [{ path: 'artifacts/cicd/.gitlab-ci.yml', content: lines.join('\n') }],
    metadata: {
      solutionName: doc.solution.name,
      provider: 'gitlab-ci',
      cloud: doc.deployment.cloud,
    },
  };
}

// ─── Azure DevOps Generator ───

function generateAzureDevOps(doc: SDLDocument): RawGeneratorResult {
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push(`# Azure DevOps Pipeline — ${doc.solution.name}`);
  lines.push('# Generated by arch0 SDL');
  lines.push('');
  lines.push('trigger:');
  lines.push('  branches:');
  lines.push('    include:');
  lines.push('      - main');
  lines.push('');
  lines.push('pr:');
  lines.push('  branches:');
  lines.push('    include:');
  lines.push('      - main');
  lines.push('');
  lines.push('variables:');
  lines.push('  nodeVersion: "20"');
  if (dbType === 'postgres') {
    lines.push('  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test');
  } else if (dbType === 'mysql') {
    lines.push('  DATABASE_URL: mysql://root:root@localhost:3306/test');
  } else if (dbType === 'mongodb') {
    lines.push('  DATABASE_URL: mongodb://localhost:27017/test');
  }
  lines.push('');
  lines.push('stages:');

  // ── Build & Test stage ──
  lines.push('  - stage: BuildAndTest');
  lines.push('    displayName: Build & Test');
  lines.push('    jobs:');

  // Backend jobs
  for (const be of backends) {
    const jobId = sanitizeJobId(be.name).replace(/-/g, '_');
    lines.push(`      - job: ${jobId}`);
    lines.push(`        displayName: "Backend — ${be.name}"`);
    lines.push('        pool:');
    lines.push('          vmImage: ubuntu-latest');

    // Database service container
    if (['postgres', 'mysql', 'mongodb'].includes(dbType)) {
      lines.push('        services:');
      appendAzureDevOpsService(lines, dbType);
    }

    lines.push('        steps:');

    if (be.framework === 'nodejs' || !be.framework) {
      lines.push('          - task: UseNode@1');
      lines.push('            inputs:');
      lines.push('              version: $(nodeVersion)');
      lines.push('          - script: npm ci');
      lines.push('            displayName: Install dependencies');
      lines.push('          - script: npm run lint');
      lines.push('            displayName: Lint');
      if (be.orm === 'prisma') {
        lines.push('          - script: npx prisma generate');
        lines.push('            displayName: Generate Prisma client');
      }
      lines.push('          - script: npm test');
      lines.push('            displayName: Test');
      lines.push('          - script: npm run build');
      lines.push('            displayName: Build');
      lines.push('          - publish: dist');
      lines.push(`            artifact: ${slugify(be.name)}`);
      lines.push('            displayName: Publish artifact');
    } else if (be.framework === 'python-fastapi') {
      lines.push('          - task: UsePythonVersion@0');
      lines.push('            inputs:');
      lines.push("              versionSpec: '3.12'");
      lines.push('          - script: pip install -r requirements.txt');
      lines.push('            displayName: Install dependencies');
      lines.push('          - script: pip install ruff pytest');
      lines.push('            displayName: Install dev tools');
      lines.push('          - script: ruff check .');
      lines.push('            displayName: Lint');
      lines.push('          - script: pytest');
      lines.push('            displayName: Test');
    } else if (be.framework === 'go') {
      lines.push('          - task: UseGoVersion@0');
      lines.push('            inputs:');
      lines.push("              version: '1.22'");
      lines.push('          - script: go vet ./...');
      lines.push('            displayName: Lint');
      lines.push('          - script: go test ./...');
      lines.push('            displayName: Test');
      lines.push('          - script: go build -o bin/server ./cmd/server');
      lines.push('            displayName: Build');
      lines.push('          - publish: bin');
      lines.push(`            artifact: ${slugify(be.name)}`);
      lines.push('            displayName: Publish artifact');
    } else if (be.framework === 'dotnet-8') {
      lines.push('          - task: UseDotNet@2');
      lines.push('            inputs:');
      lines.push("              packageType: 'sdk'");
      lines.push("              version: '8.x'");
      lines.push('          - script: dotnet restore');
      lines.push('            displayName: Restore');
      lines.push('          - script: dotnet build --no-restore');
      lines.push('            displayName: Build');
      lines.push('          - script: dotnet test --no-build');
      lines.push('            displayName: Test');
      lines.push('          - script: dotnet publish -c Release -o out');
      lines.push('            displayName: Publish');
      lines.push('          - publish: out');
      lines.push(`            artifact: ${slugify(be.name)}`);
      lines.push('            displayName: Publish artifact');
    } else if (be.framework === 'java-spring') {
      lines.push('          - task: UseJavaVersion@1');
      lines.push('            inputs:');
      lines.push("              versionSpec: '21'");
      lines.push('          - script: ./gradlew check');
      lines.push('            displayName: Lint & Test');
      lines.push('          - script: ./gradlew bootJar');
      lines.push('            displayName: Build');
      lines.push('          - publish: build/libs');
      lines.push(`            artifact: ${slugify(be.name)}`);
      lines.push('            displayName: Publish artifact');
    }
    lines.push('');
  }

  // Frontend jobs
  for (const fe of frontends) {
    const jobId = sanitizeJobId(fe.name).replace(/-/g, '_');
    lines.push(`      - job: ${jobId}`);
    lines.push(`        displayName: "Frontend — ${fe.name}"`);
    lines.push('        pool:');
    lines.push('          vmImage: ubuntu-latest');
    lines.push('        steps:');
    lines.push('          - task: UseNode@1');
    lines.push('            inputs:');
    lines.push('              version: $(nodeVersion)');
    lines.push('          - script: npm ci');
    lines.push('            displayName: Install dependencies');
    lines.push('          - script: npm run lint');
    lines.push('            displayName: Lint');
    lines.push('          - script: npm run build');
    lines.push('            displayName: Build');
    lines.push('          - publish: dist');
    lines.push(`            artifact: ${slugify(fe.name)}`);
    lines.push('            displayName: Publish artifact');
    lines.push('');
  }

  // ── Deploy stage ──
  if (backends.length > 0 || frontends.length > 0) {
    lines.push('  - stage: Deploy');
    lines.push(`    displayName: Deploy to ${deployTargetLabel(doc.deployment.cloud)}`);
    lines.push('    dependsOn: BuildAndTest');
    lines.push("    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))");
    lines.push('    jobs:');
    lines.push('      - deployment: deploy');
    lines.push(`        displayName: Deploy to ${deployTargetLabel(doc.deployment.cloud)}`);
    lines.push('        pool:');
    lines.push('          vmImage: ubuntu-latest');
    lines.push('        environment: production');
    lines.push('        strategy:');
    lines.push('          runOnce:');
    lines.push('            deploy:');
    lines.push('              steps:');

    const cloud = doc.deployment.cloud;
    if (cloud === 'aws') {
      lines.push('                - task: AWSShellScript@1');
      lines.push('                  inputs:');
      lines.push("                    awsCredentials: 'aws-service-connection'");
      lines.push('                    regionName: $(AWS_REGION)');
      lines.push('                    scriptType: inline');
      lines.push('                    inlineScript: |');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push(`                      aws ecs update-service --cluster $(ECS_CLUSTER) --service ${name} --force-new-deployment`);
      }
    } else if (cloud === 'gcp') {
      lines.push('                - task: GoogleCloudSdkTool@1');
      lines.push('                - script: |');
      lines.push('                    gcloud auth activate-service-account --key-file=$(GCP_CREDENTIALS)');
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push(`                    gcloud run deploy ${name} --image gcr.io/$(GCP_PROJECT)/${name}:$(Build.BuildId) --region $(GCP_REGION) --platform managed --allow-unauthenticated`);
      }
      lines.push('                  displayName: Deploy to Cloud Run');
    } else if (cloud === 'azure') {
      for (const be of backends) {
        const name = slugify(be.name);
        lines.push(`                - task: AzureCLI@2`);
        lines.push('                  inputs:');
        lines.push("                    azureSubscription: 'azure-service-connection'");
        lines.push("                    scriptType: 'bash'");
        lines.push("                    scriptLocation: 'inlineScript'");
        lines.push('                    inlineScript: |');
        lines.push(`                      az acr build --registry $(ACR_NAME) --image ${name}:$(Build.BuildId) .`);
        lines.push(`                      az containerapp update --name ${name} --resource-group $(AZURE_RESOURCE_GROUP) --image $(ACR_NAME).azurecr.io/${name}:$(Build.BuildId)`);
        lines.push(`                  displayName: Deploy ${be.name}`);
      }
    } else if (cloud === 'vercel') {
      lines.push('                - script: |');
      lines.push('                    npm install -g vercel');
      lines.push('                    vercel deploy --prod --token $(VERCEL_TOKEN)');
      lines.push('                  displayName: Deploy to Vercel');
    } else if (cloud === 'railway') {
      lines.push('                - script: |');
      lines.push('                    npm install -g @railway/cli');
      lines.push('                    railway up');
      lines.push('                  env:');
      lines.push('                    RAILWAY_TOKEN: $(RAILWAY_TOKEN)');
      lines.push('                  displayName: Deploy to Railway');
    } else {
      lines.push(`                - script: echo "Deploy to ${cloud} — configure deployment commands for your provider"`);
      lines.push('                  displayName: Deploy');
    }
    lines.push('');
  }

  return {
    artifactType: 'iac-skeleton',
    files: [{ path: 'artifacts/cicd/azure-pipelines.yml', content: lines.join('\n') }],
    metadata: {
      solutionName: doc.solution.name,
      provider: 'azure-devops',
      cloud: doc.deployment.cloud,
    },
  };
}

function appendAzureDevOpsService(lines: string[], dbType: string): void {
  if (dbType === 'postgres') {
    lines.push('          postgres:');
    lines.push('            image: postgres:16');
    lines.push('            ports:');
    lines.push('              - 5432:5432');
    lines.push('            env:');
    lines.push('              POSTGRES_USER: postgres');
    lines.push('              POSTGRES_PASSWORD: postgres');
    lines.push('              POSTGRES_DB: test');
  } else if (dbType === 'mysql') {
    lines.push('          mysql:');
    lines.push('            image: mysql:8');
    lines.push('            ports:');
    lines.push('              - 3306:3306');
    lines.push('            env:');
    lines.push('              MYSQL_ROOT_PASSWORD: root');
    lines.push('              MYSQL_DATABASE: test');
  } else if (dbType === 'mongodb') {
    lines.push('          mongo:');
    lines.push('            image: mongo:7');
    lines.push('            ports:');
    lines.push('              - 27017:27017');
  }
}

function appendGitLabServices(lines: string[], dbType: string): void {
  if (dbType === 'postgres') {
    lines.push('  services:');
    lines.push('    - postgres:16');
  } else if (dbType === 'mysql') {
    lines.push('  services:');
    lines.push('    - mysql:8');
  } else if (dbType === 'mongodb') {
    lines.push('  services:');
    lines.push('    - mongo:7');
  }
}

// ─── IaC Router ───

import type { GeneratedFile } from './types';

function generateIaC(doc: SDLDocument, iac: string): GeneratedFile[] | null {
  switch (iac) {
    case 'terraform':
      return generateTerraform(doc);
    case 'bicep':
      return generateBicep(doc);
    case 'pulumi':
      return generatePulumi(doc);
    case 'cdk':
      return generateCdk(doc);
    case 'cloudformation':
      return generateCloudFormation(doc);
    default:
      return null;
  }
}

// ─── Dockerfile Generator ───

function generateDockerfiles(doc: SDLDocument): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const backends = doc.architecture.projects.backend || [];

  for (const be of backends) {
    const name = slugify(be.name);
    const content = generateDockerfileForBackend(be);
    if (content) {
      files.push({ path: `artifacts/docker/backend-${name}/Dockerfile`, content });
    }
  }

  const frontends = doc.architecture.projects.frontend || [];
  for (const fe of frontends) {
    const name = slugify(fe.name);
    files.push({ path: `artifacts/docker/frontend-${name}/Dockerfile`, content: generateDockerfileForFrontend(fe) });
  }

  return files;
}

function generateDockerfileForBackend(be: { name: string; framework: string; orm?: string }): string | null {
  const lines: string[] = [];

  if (be.framework === 'nodejs' || !be.framework) {
    lines.push('# ── Node.js Backend ──');
    lines.push('FROM node:20-alpine AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY package*.json ./');
    lines.push('RUN npm ci');
    if (be.orm === 'prisma') {
      lines.push('COPY prisma ./prisma/');
      lines.push('RUN npx prisma generate');
    }
    lines.push('COPY . .');
    lines.push('RUN npm run build');
    lines.push('');
    lines.push('FROM node:20-alpine');
    lines.push('WORKDIR /app');
    lines.push('COPY --from=builder /app/dist ./dist');
    lines.push('COPY --from=builder /app/node_modules ./node_modules');
    lines.push('COPY --from=builder /app/package.json ./');
    if (be.orm === 'prisma') {
      lines.push('COPY --from=builder /app/prisma ./prisma');
    }
    lines.push('EXPOSE 3000');
    lines.push('CMD ["node", "dist/index.js"]');
  } else if (be.framework === 'python-fastapi') {
    lines.push('# ── Python FastAPI Backend ──');
    lines.push('FROM python:3.12-slim AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY requirements.txt .');
    lines.push('RUN pip install --no-cache-dir -r requirements.txt');
    lines.push('COPY . .');
    lines.push('');
    lines.push('FROM python:3.12-slim');
    lines.push('WORKDIR /app');
    lines.push('COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages');
    lines.push('COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn');
    lines.push('COPY --from=builder /app .');
    lines.push('EXPOSE 8000');
    lines.push('CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]');
  } else if (be.framework === 'go') {
    lines.push('# ── Go Backend ──');
    lines.push('FROM golang:1.22-alpine AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY go.mod go.sum ./');
    lines.push('RUN go mod download');
    lines.push('COPY . .');
    lines.push('RUN CGO_ENABLED=0 go build -o /server ./cmd/server');
    lines.push('');
    lines.push('FROM gcr.io/distroless/static-debian12');
    lines.push('COPY --from=builder /server /server');
    lines.push('EXPOSE 8080');
    lines.push('ENTRYPOINT ["/server"]');
  } else if (be.framework === 'dotnet-8') {
    lines.push('# ── .NET 8 Backend ──');
    lines.push('FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY *.csproj .');
    lines.push('RUN dotnet restore');
    lines.push('COPY . .');
    lines.push('RUN dotnet publish -c Release -o /out');
    lines.push('');
    lines.push('FROM mcr.microsoft.com/dotnet/aspnet:8.0');
    lines.push('WORKDIR /app');
    lines.push('COPY --from=builder /out .');
    lines.push('EXPOSE 5000');
    lines.push('ENTRYPOINT ["dotnet", "Api.dll"]');
  } else if (be.framework === 'java-spring') {
    lines.push('# ── Java Spring Boot Backend ──');
    lines.push('FROM eclipse-temurin:21-jdk AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY . .');
    lines.push('RUN ./gradlew bootJar');
    lines.push('');
    lines.push('FROM eclipse-temurin:21-jre');
    lines.push('WORKDIR /app');
    lines.push('COPY --from=builder /app/build/libs/*.jar app.jar');
    lines.push('EXPOSE 8080');
    lines.push('ENTRYPOINT ["java", "-jar", "app.jar"]');
  } else if (be.framework === 'ruby-rails') {
    lines.push('# ── Ruby on Rails Backend ──');
    lines.push('FROM ruby:3.3-slim AS builder');
    lines.push('WORKDIR /app');
    lines.push('COPY Gemfile Gemfile.lock ./');
    lines.push('RUN bundle install --without development test');
    lines.push('COPY . .');
    lines.push('RUN SECRET_KEY_BASE=placeholder bundle exec rails assets:precompile');
    lines.push('');
    lines.push('FROM ruby:3.3-slim');
    lines.push('WORKDIR /app');
    lines.push('COPY --from=builder /app .');
    lines.push('EXPOSE 3000');
    lines.push('CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]');
  } else if (be.framework === 'php-laravel') {
    lines.push('# ── PHP Laravel Backend ──');
    lines.push('FROM php:8.3-fpm');
    lines.push('WORKDIR /app');
    lines.push('RUN apt-get update && apt-get install -y libzip-dev && docker-php-ext-install zip pdo pdo_mysql');
    lines.push('COPY --from=composer:latest /usr/bin/composer /usr/bin/composer');
    lines.push('COPY . .');
    lines.push('RUN composer install --no-dev --optimize-autoloader');
    lines.push('EXPOSE 9000');
    lines.push('CMD ["php-fpm"]');
  } else {
    return null;
  }

  return lines.join('\n');
}

function generateDockerfileForFrontend(fe: { name: string; framework: string }): string {
  const lines: string[] = [];
  lines.push(`# ── Frontend (${fe.framework}) ──`);
  lines.push('FROM node:20-alpine AS builder');
  lines.push('WORKDIR /app');
  lines.push('COPY package*.json ./');
  lines.push('RUN npm ci');
  lines.push('COPY . .');
  lines.push('RUN npm run build');
  lines.push('');
  lines.push('FROM nginx:alpine');
  lines.push('COPY --from=builder /app/dist /usr/share/nginx/html');
  lines.push('COPY nginx.conf /etc/nginx/conf.d/default.conf');
  lines.push('EXPOSE 80');
  lines.push('CMD ["nginx", "-g", "daemon off;"]');
  return lines.join('\n');
}

// ─── Bicep Generator (Azure only) ───

function generateBicep(doc: SDLDocument): GeneratedFile[] | null {
  if (doc.deployment.cloud !== 'azure') return null;

  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push('// Generated from SDL');
  lines.push(`// Solution: ${doc.solution.name}`);
  lines.push('');
  lines.push("param location string = resourceGroup().location");
  lines.push(`param projectName string = '${slugify(doc.solution.name)}'`);
  lines.push("param environment string = 'production'");
  lines.push('');

  // Container Apps Environment
  if (backends.length > 0) {
    lines.push('// ── Compute (Container Apps) ──');
    lines.push('');
    lines.push("resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {");
    lines.push("  name: '${projectName}-env'");
    lines.push('  location: location');
    lines.push('  properties: {}');
    lines.push('}');
    lines.push('');

    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`resource ${name.replace(/-/g, '_')} 'Microsoft.App/containerApps@2023-05-01' = {`);
      lines.push(`  name: '\${projectName}-${name}'`);
      lines.push('  location: location');
      lines.push('  properties: {');
      lines.push('    environmentId: containerAppEnv.id');
      lines.push("    configuration: { ingress: { external: true, targetPort: 3000 } }");
      lines.push("    template: { containers: [{ name: '" + name + "', image: '${projectName}/" + name + ":latest', resources: { cpu: json('0.25'), memory: '0.5Gi' } }] }");
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  // Database
  lines.push('// ── Database ──');
  lines.push('');
  if (dbType === 'postgres') {
    lines.push("resource pgServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {");
    lines.push("  name: '${projectName}-pg'");
    lines.push('  location: location');
    lines.push("  sku: { name: 'Standard_B1ms', tier: 'Burstable' }");
    lines.push("  properties: { version: '15', administratorLogin: 'admin', administratorLoginPassword: 'CHANGE_ME' }");
    lines.push('}');
  } else if (dbType === 'mysql') {
    lines.push("resource mysqlServer 'Microsoft.DBforMySQL/flexibleServers@2023-06-30' = {");
    lines.push("  name: '${projectName}-mysql'");
    lines.push('  location: location');
    lines.push("  sku: { name: 'Standard_B1ms', tier: 'Burstable' }");
    lines.push("  properties: { administratorLogin: 'admin', administratorLoginPassword: 'CHANGE_ME' }");
    lines.push('}');
  } else if (dbType === 'mongodb') {
    lines.push("resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {");
    lines.push("  name: '${projectName}-cosmos'");
    lines.push('  location: location');
    lines.push("  kind: 'MongoDB'");
    lines.push("  properties: { databaseAccountOfferType: 'Standard', consistencyPolicy: { defaultConsistencyLevel: 'Session' }, locations: [{ locationName: location, failoverPriority: 0 }] }");
    lines.push('}');
  }
  lines.push('');

  // Cache
  if (doc.data.cache && doc.data.cache.type === 'redis') {
    lines.push('// ── Cache (Redis) ──');
    lines.push('');
    lines.push("resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {");
    lines.push("  name: '${projectName}-redis'");
    lines.push('  location: location');
    lines.push("  properties: { sku: { name: 'Basic', family: 'C', capacity: 0 } }");
    lines.push('}');
    lines.push('');
  }

  return [
    { path: 'artifacts/iac/main.bicep', content: lines.join('\n') },
  ];
}

// ─── Pulumi Generator (multi-cloud) ───

function generatePulumi(doc: SDLDocument): GeneratedFile[] | null {
  const cloud = doc.deployment.cloud;
  const generators: Record<string, (d: SDLDocument) => string> = {
    aws: generatePulumiAws,
    gcp: generatePulumiGcp,
    azure: generatePulumiAzure,
  };

  const gen = generators[cloud];
  if (!gen) return null;

  const indexTs = gen(doc);

  const pulumiYaml = [
    `name: ${slugify(doc.solution.name)}`,
    'runtime: nodejs',
    'description: Generated from SDL',
  ].join('\n');

  return [
    { path: 'artifacts/iac/index.ts', content: indexTs },
    { path: 'artifacts/iac/Pulumi.yaml', content: pulumiYaml },
  ];
}

function generatePulumiAws(doc: SDLDocument): string {
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push('import * as pulumi from "@pulumi/pulumi";');
  lines.push('import * as aws from "@pulumi/aws";');
  lines.push('');
  lines.push('const config = new pulumi.Config();');
  lines.push(`const projectName = config.get("projectName") || "${slugify(doc.solution.name)}";`);
  lines.push('');

  // VPC
  lines.push('// ── Networking ──');
  lines.push('const vpc = new aws.ec2.Vpc(`${projectName}-vpc`, { cidrBlock: "10.0.0.0/16", enableDnsHostnames: true });');
  lines.push('');

  // ECS
  if (backends.length > 0) {
    lines.push('// ── Compute (ECS Fargate) ──');
    lines.push('const cluster = new aws.ecs.Cluster(`${projectName}-cluster`);');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`const ${name.replace(/-/g, '_')}_task = new aws.ecs.TaskDefinition("${name}", { family: "${name}", cpu: "256", memory: "512", requiresCompatibilities: ["FARGATE"], networkMode: "awsvpc", containerDefinitions: JSON.stringify([{ name: "${name}", image: "${name}:latest", portMappings: [{ containerPort: 3000 }] }]) });`);
    }
    lines.push('');
  }

  // Database
  lines.push('// ── Database ──');
  if (dbType === 'postgres' || dbType === 'mysql') {
    const engine = dbType === 'postgres' ? 'aurora-postgresql' : 'aurora-mysql';
    lines.push(`const db = new aws.rds.Cluster("db", { engine: "${engine}", clusterIdentifier: \`\${projectName}-db\`, masterUsername: "admin", masterPassword: "CHANGE_ME", skipFinalSnapshot: true });`);
  } else if (dbType === 'mongodb') {
    lines.push('// MongoDB: Use MongoDB Atlas provider or DocumentDB');
    lines.push(`const docdb = new aws.docdb.Cluster("docdb", { clusterIdentifier: \`\${projectName}-docdb\`, masterUsername: "admin", masterPassword: "CHANGE_ME", skipFinalSnapshot: true });`);
  }
  lines.push('');

  lines.push('export const vpcId = vpc.id;');
  if (backends.length > 0) {
    lines.push('export const clusterId = cluster.id;');
  }

  return lines.join('\n');
}

function generatePulumiGcp(doc: SDLDocument): string {
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push('import * as pulumi from "@pulumi/pulumi";');
  lines.push('import * as gcp from "@pulumi/gcp";');
  lines.push('');
  lines.push('const config = new pulumi.Config();');
  lines.push(`const projectName = config.get("projectName") || "${slugify(doc.solution.name)}";`);
  lines.push('');

  if (backends.length > 0) {
    lines.push('// ── Compute (Cloud Run) ──');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`const ${name.replace(/-/g, '_')} = new gcp.cloudrun.Service("${name}", { location: "us-central1", template: { spec: { containers: [{ image: \`gcr.io/\${gcp.config.project}/${name}:latest\` }] } } });`);
    }
    lines.push('');
  }

  lines.push('// ── Database ──');
  if (dbType === 'postgres' || dbType === 'mysql') {
    const version = dbType === 'postgres' ? 'POSTGRES_15' : 'MYSQL_8_0';
    lines.push(`const db = new gcp.sql.DatabaseInstance("db", { databaseVersion: "${version}", settings: { tier: "db-f1-micro" }, deletionProtection: false });`);
  }
  lines.push('');

  return lines.join('\n');
}

function generatePulumiAzure(doc: SDLDocument): string {
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push('import * as pulumi from "@pulumi/pulumi";');
  lines.push('import * as azure from "@pulumi/azure-native";');
  lines.push('');
  lines.push('const config = new pulumi.Config();');
  lines.push(`const projectName = config.get("projectName") || "${slugify(doc.solution.name)}";`);
  lines.push('');

  lines.push('const resourceGroup = new azure.resources.ResourceGroup(`${projectName}-rg`);');
  lines.push('');

  if (backends.length > 0) {
    lines.push('// ── Compute (Container Apps) ──');
    lines.push('const containerEnv = new azure.app.ManagedEnvironment(`${projectName}-env`, { resourceGroupName: resourceGroup.name, location: resourceGroup.location });');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`const ${name.replace(/-/g, '_')} = new azure.app.ContainerApp("${name}", { resourceGroupName: resourceGroup.name, environmentId: containerEnv.id, template: { containers: [{ name: "${name}", image: "${name}:latest" }] } });`);
    }
    lines.push('');
  }

  lines.push('// ── Database ──');
  if (dbType === 'postgres') {
    lines.push(`const pgServer = new azure.dbforpostgresql.Server("pg", { resourceGroupName: resourceGroup.name, location: resourceGroup.location, version: "15", sku: { name: "Standard_B1ms", tier: "Burstable" } });`);
  }
  lines.push('');

  lines.push('export const rgName = resourceGroup.name;');

  return lines.join('\n');
}

// ─── CDK Generator (AWS only) ───

function generateCdk(doc: SDLDocument): GeneratedFile[] | null {
  if (doc.deployment.cloud !== 'aws') return null;

  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const name = slugify(doc.solution.name);
  const className = name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Stack';
  const lines: string[] = [];

  lines.push("import * as cdk from 'aws-cdk-lib';");
  lines.push("import * as ec2 from 'aws-cdk-lib/aws-ec2';");
  lines.push("import * as ecs from 'aws-cdk-lib/aws-ecs';");
  lines.push("import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';");
  if (dbType === 'postgres' || dbType === 'mysql') {
    lines.push("import * as rds from 'aws-cdk-lib/aws-rds';");
  }
  lines.push("import { Construct } from 'constructs';");
  lines.push('');
  lines.push(`export class ${className} extends cdk.Stack {`);
  lines.push('  constructor(scope: Construct, id: string, props?: cdk.StackProps) {');
  lines.push('    super(scope, id, props);');
  lines.push('');
  lines.push('    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });');
  lines.push('    const cluster = new ecs.Cluster(this, "Cluster", { vpc });');
  lines.push('');

  for (const be of backends) {
    const svcName = slugify(be.name);
    lines.push(`    // ${be.name}`);
    lines.push(`    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "${svcName}", {`);
    lines.push(`      cluster,`);
    lines.push(`      taskImageOptions: { image: ecs.ContainerImage.fromRegistry("${svcName}:latest") },`);
    lines.push(`      desiredCount: 1,`);
    lines.push('    });');
    lines.push('');
  }

  if (dbType === 'postgres') {
    lines.push('    new rds.DatabaseInstance(this, "Database", { engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }), vpc, instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO) });');
  } else if (dbType === 'mysql') {
    lines.push('    new rds.DatabaseInstance(this, "Database", { engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }), vpc, instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO) });');
  }

  lines.push('  }');
  lines.push('}');

  const appTs = [
    "import * as cdk from 'aws-cdk-lib';",
    `import { ${className} } from './lib/stack';`,
    '',
    'const app = new cdk.App();',
    `new ${className}(app, '${name}');`,
  ].join('\n');

  return [
    { path: 'artifacts/iac/lib/stack.ts', content: lines.join('\n') },
    { path: 'artifacts/iac/bin/app.ts', content: appTs },
  ];
}

// ─── CloudFormation Generator (AWS only) ───

function generateCloudFormation(doc: SDLDocument): GeneratedFile[] | null {
  if (doc.deployment.cloud !== 'aws') return null;

  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;
  const lines: string[] = [];

  lines.push('AWSTemplateFormatVersion: "2010-09-09"');
  lines.push(`Description: Infrastructure for ${doc.solution.name}`);
  lines.push('');
  lines.push('Parameters:');
  lines.push('  ProjectName:');
  lines.push('    Type: String');
  lines.push(`    Default: ${slugify(doc.solution.name)}`);
  lines.push('  Environment:');
  lines.push('    Type: String');
  lines.push('    Default: production');
  lines.push('');
  lines.push('Resources:');

  // VPC
  lines.push('  VPC:');
  lines.push('    Type: AWS::EC2::VPC');
  lines.push('    Properties:');
  lines.push('      CidrBlock: 10.0.0.0/16');
  lines.push('      EnableDnsHostnames: true');
  lines.push('      Tags:');
  lines.push('        - Key: Name');
  lines.push('          Value: !Sub ${ProjectName}-vpc');
  lines.push('');

  // ECS
  if (backends.length > 0) {
    lines.push('  ECSCluster:');
    lines.push('    Type: AWS::ECS::Cluster');
    lines.push('    Properties:');
    lines.push('      ClusterName: !Sub ${ProjectName}-cluster');
    lines.push('');
  }

  // Database
  if (dbType === 'postgres' || dbType === 'mysql') {
    lines.push('  Database:');
    lines.push('    Type: AWS::RDS::DBCluster');
    lines.push('    Properties:');
    lines.push(`      Engine: ${dbType === 'postgres' ? 'aurora-postgresql' : 'aurora-mysql'}`);
    lines.push('      MasterUsername: admin');
    lines.push('      MasterUserPassword: !Ref AWS::NoValue  # Use Secrets Manager');
    lines.push('');
  }

  lines.push('Outputs:');
  lines.push('  VPCId:');
  lines.push('    Value: !Ref VPC');

  return [
    { path: 'artifacts/iac/template.yaml', content: lines.join('\n') },
  ];
}

// ─── Terraform Generator ───

function generateTerraform(doc: SDLDocument): GeneratedFile[] | null {
  const cloud = doc.deployment.cloud;
  const generators: Record<string, (d: SDLDocument) => string> = {
    aws: generateTerraformAws,
    gcp: generateTerraformGcp,
    azure: generateTerraformAzure,
  };

  const gen = generators[cloud];
  if (!gen) return null;

  const mainTf = gen(doc);
  const files: GeneratedFile[] = [
    { path: 'artifacts/iac/main.tf', content: mainTf },
    { path: 'artifacts/iac/variables.tf', content: generateTerraformVariables(doc) },
  ];

  return files;
}

function generateTerraformVariables(doc: SDLDocument): string {
  const lines: string[] = [];
  lines.push('# Generated from SDL');
  lines.push(`# Solution: ${doc.solution.name}`);
  lines.push('');
  lines.push('variable "project_name" {');
  lines.push('  type    = string');
  lines.push(`  default = "${slugify(doc.solution.name)}"`);
  lines.push('}');
  lines.push('');
  lines.push('variable "environment" {');
  lines.push('  type    = string');
  lines.push('  default = "production"');
  lines.push('}');
  lines.push('');

  const cloud = doc.deployment.cloud;
  if (cloud === 'aws') {
    lines.push('variable "aws_region" {');
    lines.push('  type    = string');
    lines.push('  default = "us-east-1"');
    lines.push('}');
  } else if (cloud === 'gcp') {
    lines.push('variable "gcp_project" {');
    lines.push('  type = string');
    lines.push('}');
    lines.push('');
    lines.push('variable "gcp_region" {');
    lines.push('  type    = string');
    lines.push('  default = "us-central1"');
    lines.push('}');
  } else if (cloud === 'azure') {
    lines.push('variable "location" {');
    lines.push('  type    = string');
    lines.push('  default = "eastus"');
    lines.push('}');
  }

  return lines.join('\n');
}

function generateTerraformAws(doc: SDLDocument): string {
  const lines: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];
  const dbType = doc.data.primaryDatabase.type;

  lines.push('# Generated from SDL');
  lines.push(`# Solution: ${doc.solution.name}`);
  lines.push('');
  lines.push('terraform {');
  lines.push('  required_version = ">= 1.5"');
  lines.push('  required_providers {');
  lines.push('    aws = {');
  lines.push('      source  = "hashicorp/aws"');
  lines.push('      version = "~> 5.0"');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('provider "aws" {');
  lines.push('  region = var.aws_region');
  lines.push('}');
  lines.push('');

  // VPC
  lines.push('# ── Networking ──');
  lines.push('');
  lines.push('resource "aws_vpc" "main" {');
  lines.push('  cidr_block           = "10.0.0.0/16"');
  lines.push('  enable_dns_hostnames = true');
  lines.push('  tags = { Name = "${var.project_name}-vpc" }');
  lines.push('}');
  lines.push('');
  lines.push('resource "aws_subnet" "public" {');
  lines.push('  vpc_id                  = aws_vpc.main.id');
  lines.push('  cidr_block              = "10.0.1.0/24"');
  lines.push('  map_public_ip_on_launch = true');
  lines.push('  tags = { Name = "${var.project_name}-public" }');
  lines.push('}');
  lines.push('');
  lines.push('resource "aws_subnet" "private" {');
  lines.push('  vpc_id     = aws_vpc.main.id');
  lines.push('  cidr_block = "10.0.2.0/24"');
  lines.push('  tags = { Name = "${var.project_name}-private" }');
  lines.push('}');
  lines.push('');

  // ECS cluster for backends
  if (backends.length > 0) {
    lines.push('# ── Compute (ECS) ──');
    lines.push('');
    lines.push('resource "aws_ecs_cluster" "main" {');
    lines.push('  name = "${var.project_name}-cluster"');
    lines.push('}');
    lines.push('');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`resource "aws_ecs_task_definition" "${name}" {`);
      lines.push('  family                   = "${var.project_name}-' + name + '"');
      lines.push('  requires_compatibilities = ["FARGATE"]');
      lines.push('  network_mode             = "awsvpc"');
      lines.push('  cpu                      = 256');
      lines.push('  memory                   = 512');
      lines.push('  container_definitions    = jsonencode([{');
      lines.push(`    name  = "${name}"`);
      lines.push(`    image = "\${var.project_name}-${name}:latest"`);
      lines.push('    portMappings = [{ containerPort = 3000 }]');
      lines.push('  }])');
      lines.push('}');
      lines.push('');
      lines.push(`resource "aws_ecs_service" "${name}" {`);
      lines.push('  name            = "${var.project_name}-' + name + '"');
      lines.push('  cluster         = aws_ecs_cluster.main.id');
      lines.push(`  task_definition = aws_ecs_task_definition.${name}.arn`);
      lines.push('  desired_count   = 1');
      lines.push('  launch_type     = "FARGATE"');
      lines.push('  network_configuration {');
      lines.push('    subnets = [aws_subnet.private.id]');
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  // S3 for frontend
  if (frontends.length > 0) {
    lines.push('# ── Frontend Hosting (S3 + CloudFront) ──');
    lines.push('');
    for (const fe of frontends) {
      const name = slugify(fe.name);
      lines.push(`resource "aws_s3_bucket" "${name}" {`);
      lines.push('  bucket = "${var.project_name}-' + name + '"');
      lines.push('}');
      lines.push('');
    }
  }

  // Database
  lines.push('# ── Database ──');
  lines.push('');
  if (dbType === 'postgres' || dbType === 'mysql') {
    const engine = dbType === 'postgres' ? 'aurora-postgresql' : 'aurora-mysql';
    lines.push('resource "aws_rds_cluster" "main" {');
    lines.push(`  engine         = "${engine}"`);
    lines.push('  cluster_identifier = "${var.project_name}-db"');
    lines.push('  master_username    = "admin"');
    lines.push('  master_password    = "CHANGE_ME"  # Use secrets manager');
    lines.push('  skip_final_snapshot = true');
    lines.push('}');
  } else if (dbType === 'mongodb') {
    lines.push('# MongoDB: Use MongoDB Atlas (external) or DocumentDB');
    lines.push('resource "aws_docdb_cluster" "main" {');
    lines.push('  cluster_identifier = "${var.project_name}-docdb"');
    lines.push('  master_username    = "admin"');
    lines.push('  master_password    = "CHANGE_ME"  # Use secrets manager');
    lines.push('  skip_final_snapshot = true');
    lines.push('}');
  } else if (dbType === 'dynamodb') {
    lines.push('resource "aws_dynamodb_table" "main" {');
    lines.push('  name         = "${var.project_name}-data"');
    lines.push('  billing_mode = "PAY_PER_REQUEST"');
    lines.push('  hash_key     = "pk"');
    lines.push('  range_key    = "sk"');
    lines.push('  attribute { name = "pk" type = "S" }');
    lines.push('  attribute { name = "sk" type = "S" }');
    lines.push('}');
  }
  lines.push('');

  // Cache
  if (doc.data.cache && doc.data.cache.type === 'redis') {
    lines.push('# ── Cache (ElastiCache) ──');
    lines.push('');
    lines.push('resource "aws_elasticache_cluster" "redis" {');
    lines.push('  cluster_id      = "${var.project_name}-redis"');
    lines.push('  engine          = "redis"');
    lines.push('  node_type       = "cache.t3.micro"');
    lines.push('  num_cache_nodes = 1');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateTerraformGcp(doc: SDLDocument): string {
  const lines: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;

  lines.push('# Generated from SDL');
  lines.push(`# Solution: ${doc.solution.name}`);
  lines.push('');
  lines.push('terraform {');
  lines.push('  required_version = ">= 1.5"');
  lines.push('  required_providers {');
  lines.push('    google = {');
  lines.push('      source  = "hashicorp/google"');
  lines.push('      version = "~> 5.0"');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('provider "google" {');
  lines.push('  project = var.gcp_project');
  lines.push('  region  = var.gcp_region');
  lines.push('}');
  lines.push('');

  // Cloud Run for backends
  if (backends.length > 0) {
    lines.push('# ── Compute (Cloud Run) ──');
    lines.push('');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`resource "google_cloud_run_service" "${name}" {`);
      lines.push(`  name     = "\${var.project_name}-${name}"`);
      lines.push('  location = var.gcp_region');
      lines.push('  template {');
      lines.push('    spec {');
      lines.push('      containers {');
      lines.push(`        image = "gcr.io/\${var.gcp_project}/${name}:latest"`);
      lines.push('        resources {');
      lines.push('          limits = { memory = "512Mi" cpu = "1" }');
      lines.push('        }');
      lines.push('      }');
      lines.push('    }');
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  // Database
  lines.push('# ── Database ──');
  lines.push('');
  if (dbType === 'postgres' || dbType === 'mysql') {
    const dbVersion = dbType === 'postgres' ? 'POSTGRES_15' : 'MYSQL_8_0';
    lines.push('resource "google_sql_database_instance" "main" {');
    lines.push('  name             = "${var.project_name}-db"');
    lines.push(`  database_version = "${dbVersion}"`);
    lines.push('  region           = var.gcp_region');
    lines.push('  settings {');
    lines.push('    tier = "db-f1-micro"');
    lines.push('  }');
    lines.push('  deletion_protection = false');
    lines.push('}');
  } else if (dbType === 'mongodb') {
    lines.push('# MongoDB: Use MongoDB Atlas (external provider)');
    lines.push('# See: registry.terraform.io/providers/mongodb/mongodbatlas');
  }
  lines.push('');

  // Cache
  if (doc.data.cache && doc.data.cache.type === 'redis') {
    lines.push('# ── Cache (Memorystore) ──');
    lines.push('');
    lines.push('resource "google_redis_instance" "cache" {');
    lines.push('  name           = "${var.project_name}-redis"');
    lines.push('  memory_size_gb = 1');
    lines.push('  region         = var.gcp_region');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateTerraformAzure(doc: SDLDocument): string {
  const lines: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const dbType = doc.data.primaryDatabase.type;

  lines.push('# Generated from SDL');
  lines.push(`# Solution: ${doc.solution.name}`);
  lines.push('');
  lines.push('terraform {');
  lines.push('  required_version = ">= 1.5"');
  lines.push('  required_providers {');
  lines.push('    azurerm = {');
  lines.push('      source  = "hashicorp/azurerm"');
  lines.push('      version = "~> 3.0"');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('provider "azurerm" {');
  lines.push('  features {}');
  lines.push('}');
  lines.push('');
  lines.push('resource "azurerm_resource_group" "main" {');
  lines.push('  name     = "${var.project_name}-rg"');
  lines.push('  location = var.location');
  lines.push('}');
  lines.push('');

  // Container Apps for backends
  if (backends.length > 0) {
    lines.push('# ── Compute (Container Apps) ──');
    lines.push('');
    lines.push('resource "azurerm_container_app_environment" "main" {');
    lines.push('  name                = "${var.project_name}-env"');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('}');
    lines.push('');
    for (const be of backends) {
      const name = slugify(be.name);
      lines.push(`resource "azurerm_container_app" "${name}" {`);
      lines.push(`  name                         = "\${var.project_name}-${name}"`);
      lines.push('  container_app_environment_id = azurerm_container_app_environment.main.id');
      lines.push('  resource_group_name          = azurerm_resource_group.main.name');
      lines.push('  revision_mode                = "Single"');
      lines.push('  template {');
      lines.push('    container {');
      lines.push(`      name   = "${name}"`);
      lines.push(`      image  = "\${var.project_name}/${name}:latest"`);
      lines.push('      cpu    = 0.25');
      lines.push('      memory = "0.5Gi"');
      lines.push('    }');
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }
  }

  // Database
  lines.push('# ── Database ──');
  lines.push('');
  if (dbType === 'postgres') {
    lines.push('resource "azurerm_postgresql_flexible_server" "main" {');
    lines.push('  name                = "${var.project_name}-pg"');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  version             = "15"');
    lines.push('  sku_name            = "B_Standard_B1ms"');
    lines.push('  storage_mb          = 32768');
    lines.push('  administrator_login    = "admin"');
    lines.push('  administrator_password = "CHANGE_ME"  # Use Key Vault');
    lines.push('}');
  } else if (dbType === 'mysql') {
    lines.push('resource "azurerm_mysql_flexible_server" "main" {');
    lines.push('  name                = "${var.project_name}-mysql"');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  sku_name            = "B_Standard_B1ms"');
    lines.push('  administrator_login    = "admin"');
    lines.push('  administrator_password = "CHANGE_ME"  # Use Key Vault');
    lines.push('}');
  } else if (dbType === 'mongodb') {
    lines.push('resource "azurerm_cosmosdb_account" "main" {');
    lines.push('  name                = "${var.project_name}-cosmos"');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  offer_type          = "Standard"');
    lines.push('  kind                = "MongoDB"');
    lines.push('  consistency_policy { consistency_level = "Session" }');
    lines.push('  geo_location { location = azurerm_resource_group.main.location failover_priority = 0 }');
    lines.push('}');
  }
  lines.push('');

  // Cache
  if (doc.data.cache && doc.data.cache.type === 'redis') {
    lines.push('# ── Cache (Azure Cache for Redis) ──');
    lines.push('');
    lines.push('resource "azurerm_redis_cache" "main" {');
    lines.push('  name                = "${var.project_name}-redis"');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  capacity            = 0');
    lines.push('  family              = "C"');
    lines.push('  sku_name            = "Basic"');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getDatabaseService(dbType: string): string | null {
  if (dbType === 'postgres') {
    return [
      '      postgres:',
      '        image: postgres:16',
      '        env:',
      '          POSTGRES_USER: postgres',
      '          POSTGRES_PASSWORD: postgres',
      '          POSTGRES_DB: test',
      '        ports:',
      '          - 5432:5432',
      '        options: >-',
      '          --health-cmd pg_isready',
      '          --health-interval 10s',
      '          --health-timeout 5s',
      '          --health-retries 5',
    ].join('\n');
  }

  if (dbType === 'mysql') {
    return [
      '      mysql:',
      '        image: mysql:8',
      '        env:',
      '          MYSQL_ROOT_PASSWORD: root',
      '          MYSQL_DATABASE: test',
      '        ports:',
      '          - 3306:3306',
      '        options: >-',
      '          --health-cmd "mysqladmin ping"',
      '          --health-interval 10s',
      '          --health-timeout 5s',
      '          --health-retries 5',
    ].join('\n');
  }

  if (dbType === 'mongodb') {
    return [
      '      mongo:',
      '        image: mongo:7',
      '        ports:',
      '          - 27017:27017',
    ].join('\n');
  }

  return null;
}
