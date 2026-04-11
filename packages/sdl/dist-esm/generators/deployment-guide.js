/**
 * Generates a deployment guide (runbook) from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Produces a markdown guide covering:
 *   - Prerequisites
 *   - Environment variables
 *   - Database setup
 *   - Build and deploy steps (cloud-specific)
 *   - Post-deployment verification
 *   - Rollback procedure
 */
export function generateDeploymentGuide(doc) {
    const markdown = renderGuide(doc);
    return {
        artifactType: 'deployment-guide',
        files: [
            {
                path: 'artifacts/deployment/deployment-guide.md',
                content: markdown,
            },
        ],
        metadata: {
            solutionName: doc.solution.name,
            cloud: doc.deployment.cloud,
            database: doc.data.primaryDatabase.type,
            projectCount: countProjects(doc),
        },
    };
}
function renderGuide(doc) {
    const lines = [];
    const cloud = doc.deployment.cloud;
    const cloudName = cloudLabel(cloud);
    const frontends = doc.architecture.projects.frontend || [];
    const backends = doc.architecture.projects.backend || [];
    lines.push(`# ${doc.solution.name} — Deployment Guide`);
    lines.push('');
    lines.push(`> Cloud: ${cloudName} | Stage: ${doc.solution.stage} | Generated from SDL`);
    lines.push('');
    // ── Prerequisites ──
    lines.push('## 1. Prerequisites');
    lines.push('');
    lines.push('### Required Accounts');
    lines.push('');
    lines.push(`- [ ] ${cloudName} account`);
    if (doc.auth?.provider) {
        lines.push(`- [ ] ${displayName(doc.auth.provider)} account`);
    }
    if (doc.integrations?.payments) {
        lines.push(`- [ ] ${displayName(doc.integrations.payments.provider || 'payment')} account`);
    }
    if (doc.integrations?.email) {
        lines.push(`- [ ] ${displayName(doc.integrations.email.provider || 'email')} account`);
    }
    if (doc.integrations?.monitoring) {
        lines.push(`- [ ] ${displayName(doc.integrations.monitoring.provider || 'monitoring')} account`);
    }
    lines.push('');
    lines.push('### Required Tools');
    lines.push('');
    for (const tool of getRequiredTools(doc)) {
        lines.push(`- [ ] ${tool}`);
    }
    lines.push('');
    // ── Environment Variables ──
    lines.push('## 2. Environment Variables');
    lines.push('');
    lines.push('Create a `.env` file for each environment (dev, staging, production):');
    lines.push('');
    lines.push('```bash');
    for (const envVar of getEnvVars(doc)) {
        lines.push(`${envVar.name}=${envVar.example}  # ${envVar.description}`);
    }
    lines.push('```');
    lines.push('');
    // ── Database Setup ──
    lines.push('## 3. Database Setup');
    lines.push('');
    const db = doc.data.primaryDatabase;
    const dbName = displayName(db.type);
    lines.push(`### ${dbName} (${db.hosting})`);
    lines.push('');
    if (db.hosting === 'managed') {
        lines.push(getManagedDbInstructions(db.type, cloud));
    }
    else {
        lines.push(`1. Install ${dbName} locally or provision a server`);
        lines.push(`2. Create the database: \`${getCreateDbCommand(db.type)}\``);
    }
    lines.push('');
    const ormBackend = backends.find((be) => be.orm);
    if (ormBackend?.orm) {
        lines.push(`### Schema Migrations (${displayName(ormBackend.orm)})`);
        lines.push('');
        lines.push('```bash');
        lines.push(getMigrationCommands(ormBackend.orm));
        lines.push('```');
        lines.push('');
    }
    // ── Build Steps ──
    lines.push('## 4. Build');
    lines.push('');
    for (const be of backends) {
        lines.push(`### Backend: ${be.name} (${frameworkLabel(be.framework)})`);
        lines.push('');
        lines.push('```bash');
        lines.push(getBuildCommands(be.framework, 'backend'));
        lines.push('```');
        lines.push('');
    }
    for (const fe of frontends) {
        lines.push(`### Frontend: ${fe.name} (${frameworkLabel(fe.framework)})`);
        lines.push('');
        lines.push('```bash');
        lines.push(getBuildCommands(fe.framework, 'frontend'));
        lines.push('```');
        lines.push('');
    }
    // ── Deploy Steps ──
    lines.push('## 5. Deploy');
    lines.push('');
    lines.push(getDeployInstructions(doc));
    lines.push('');
    // ── Post-Deploy Verification ──
    lines.push('## 6. Post-Deployment Verification');
    lines.push('');
    lines.push('```bash');
    lines.push('# Health check');
    lines.push('curl -s https://YOUR_DOMAIN/api/health | jq .');
    lines.push('');
    if (doc.auth) {
        lines.push('# Auth check');
        lines.push('curl -s -X POST https://YOUR_DOMAIN/api/auth/login \\');
        lines.push("  -H 'Content-Type: application/json' \\");
        lines.push('  -d \'{"email":"test@example.com","password":"test"}\'');
    }
    lines.push('```');
    lines.push('');
    lines.push('### Checklist');
    lines.push('');
    lines.push('- [ ] Health endpoint returns 200');
    if (doc.auth)
        lines.push('- [ ] Authentication flow works');
    lines.push('- [ ] Database connections are healthy');
    if (doc.integrations?.payments)
        lines.push('- [ ] Payment webhook is reachable');
    if (doc.deployment.networking?.customDomain)
        lines.push('- [ ] Custom domain resolves correctly');
    lines.push('- [ ] SSL certificate is valid');
    lines.push('- [ ] Logs are flowing');
    lines.push('');
    // ── Rollback ──
    lines.push('## 7. Rollback Procedure');
    lines.push('');
    lines.push(getRollbackInstructions(cloud));
    lines.push('');
    // ── Environments ──
    if (doc.deployment.ciCd?.environments && doc.deployment.ciCd.environments.length > 0) {
        lines.push('## 8. Environments');
        lines.push('');
        lines.push('| Environment | Auto-Deploy | Requires Tests | Secrets |');
        lines.push('|---|---|---|---|');
        for (const env of doc.deployment.ciCd.environments) {
            lines.push(`| ${env.name} | ${env.autoApproval ? 'Yes' : 'No'} | ${env.requiresTests !== false ? 'Yes' : 'No'} | ${env.secrets?.join(', ') || '-'} |`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
// ─── Content Generators ───
function getRequiredTools(doc) {
    const tools = [];
    tools.push('Node.js 20+ and npm');
    tools.push('Git');
    const backends = doc.architecture.projects.backend || [];
    for (const be of backends) {
        if (be.framework === 'python-fastapi')
            tools.push('Python 3.12+');
        if (be.framework === 'go')
            tools.push('Go 1.22+');
        if (be.framework === 'dotnet-8')
            tools.push('.NET 8 SDK');
        if (be.framework === 'java-spring')
            tools.push('Java 21+ / Maven');
    }
    const cloud = doc.deployment.cloud;
    if (cloud === 'aws')
        tools.push('AWS CLI v2');
    if (cloud === 'gcp')
        tools.push('gcloud CLI');
    if (cloud === 'azure')
        tools.push('Azure CLI');
    if (cloud === 'vercel')
        tools.push('Vercel CLI (`npm i -g vercel`)');
    if (cloud === 'railway')
        tools.push('Railway CLI (`npm i -g @railway/cli`)');
    if (cloud === 'fly-io')
        tools.push('Fly CLI (`flyctl`)');
    if (doc.deployment.infrastructure?.iac === 'terraform')
        tools.push('Terraform 1.5+');
    if (doc.deployment.infrastructure?.iac === 'pulumi')
        tools.push('Pulumi CLI');
    const ormBackend = backends.find((be) => be.orm);
    if (ormBackend?.orm === 'prisma')
        tools.push('Prisma CLI (`npx prisma`)');
    return [...new Set(tools)];
}
function getEnvVars(doc) {
    const vars = [];
    vars.push({ name: 'NODE_ENV', example: 'production', description: 'Runtime environment' });
    vars.push({ name: 'PORT', example: '3000', description: 'Server port' });
    vars.push({ name: 'DATABASE_URL', example: getDatabaseUrlExample(doc.data.primaryDatabase.type), description: `${displayName(doc.data.primaryDatabase.type)} connection string` });
    if (doc.auth?.provider) {
        const prefix = doc.auth.provider.toUpperCase().replace(/-/g, '_');
        vars.push({ name: `${prefix}_DOMAIN`, example: 'your-tenant.auth0.com', description: `${displayName(doc.auth.provider)} domain` });
        vars.push({ name: `${prefix}_CLIENT_ID`, example: 'your-client-id', description: `${displayName(doc.auth.provider)} client ID` });
        vars.push({ name: `${prefix}_CLIENT_SECRET`, example: 'your-client-secret', description: `${displayName(doc.auth.provider)} client secret` });
    }
    if (doc.integrations?.payments?.provider) {
        const prefix = doc.integrations.payments.provider.toUpperCase();
        vars.push({ name: `${prefix}_SECRET_KEY`, example: 'sk_test_...', description: `${displayName(doc.integrations.payments.provider)} secret key` });
        vars.push({ name: `${prefix}_WEBHOOK_SECRET`, example: 'whsec_...', description: `${displayName(doc.integrations.payments.provider)} webhook secret` });
    }
    if (doc.integrations?.email?.provider) {
        vars.push({ name: `${doc.integrations.email.provider.toUpperCase().replace(/-/g, '_')}_API_KEY`, example: 'SG...', description: `${displayName(doc.integrations.email.provider)} API key` });
    }
    if (doc.data.cache?.type && doc.data.cache.type !== 'none') {
        vars.push({ name: 'REDIS_URL', example: 'redis://localhost:6379', description: 'Cache connection' });
    }
    return vars;
}
function getDatabaseUrlExample(dbType) {
    switch (dbType) {
        case 'postgres': return 'postgresql://user:password@host:5432/dbname';
        case 'mysql': return 'mysql://user:password@host:3306/dbname';
        case 'mongodb': return 'mongodb+srv://user:password@cluster.mongodb.net/dbname';
        case 'sqlserver': return 'sqlserver://host:1433;database=dbname;user=user;password=pass';
        default: return 'your-database-url';
    }
}
function getManagedDbInstructions(dbType, cloud) {
    const dbName = displayName(dbType);
    switch (cloud) {
        case 'aws':
            return `1. Create an RDS ${dbName} instance in the AWS Console\n2. Note the endpoint, port, username, and password\n3. Ensure the security group allows access from your application\n4. Set \`DATABASE_URL\` with the connection string`;
        case 'gcp':
            return `1. Create a Cloud SQL ${dbName} instance in GCP Console\n2. Enable the Cloud SQL Admin API\n3. Configure authorized networks or use Cloud SQL Proxy\n4. Set \`DATABASE_URL\` with the connection string`;
        case 'azure':
            return `1. Create an Azure Database for ${dbName} in the Azure Portal\n2. Configure firewall rules to allow your application\n3. Note the server name and credentials\n4. Set \`DATABASE_URL\` with the connection string`;
        case 'vercel':
            return `1. Add Vercel Postgres or connect an external ${dbName} provider\n2. Use Vercel's dashboard to create the database\n3. The \`DATABASE_URL\` will be automatically configured as an environment variable`;
        case 'railway':
            return `1. Add a ${dbName} plugin in your Railway project\n2. The \`DATABASE_URL\` will be automatically injected\n3. No additional configuration needed`;
        default:
            return `1. Provision a managed ${dbName} instance from your cloud provider\n2. Set \`DATABASE_URL\` with the connection string`;
    }
}
function getCreateDbCommand(dbType) {
    switch (dbType) {
        case 'postgres': return 'createdb myapp';
        case 'mysql': return "mysql -e 'CREATE DATABASE myapp'";
        case 'mongodb': return 'mongosh --eval "use myapp"';
        default: return 'create database myapp';
    }
}
function getMigrationCommands(orm) {
    switch (orm) {
        case 'prisma':
            return 'npx prisma migrate deploy\nnpx prisma generate';
        case 'typeorm':
            return 'npx typeorm migration:run';
        case 'sequelize':
            return 'npx sequelize-cli db:migrate';
        case 'sqlalchemy':
            return 'alembic upgrade head';
        case 'ef-core':
            return 'dotnet ef database update';
        case 'gorm':
            return '# GORM auto-migrates on startup';
        default:
            return '# Run your migration tool';
    }
}
function getBuildCommands(framework, type) {
    switch (framework) {
        case 'nodejs':
            return 'npm ci\nnpm run build';
        case 'nextjs':
            return 'npm ci\nnpm run build';
        case 'react':
        case 'vue':
        case 'angular':
        case 'svelte':
            return 'npm ci\nnpm run build';
        case 'python-fastapi':
            return 'pip install -r requirements.txt';
        case 'go':
            return 'go build -o bin/server ./cmd/server';
        case 'dotnet-8':
            return 'dotnet restore\ndotnet publish -c Release';
        case 'java-spring':
            return 'mvn clean package -DskipTests';
        case 'ruby-rails':
            return 'bundle install\nRAILS_ENV=production rails assets:precompile';
        case 'php-laravel':
            return 'composer install --optimize-autoloader --no-dev\nphp artisan config:cache\nphp artisan route:cache';
        default:
            return 'npm ci\nnpm run build';
    }
}
function getDeployInstructions(doc) {
    const cloud = doc.deployment.cloud;
    const lines = [];
    switch (cloud) {
        case 'vercel':
            lines.push('### Vercel');
            lines.push('');
            lines.push('```bash');
            lines.push('# Install Vercel CLI');
            lines.push('npm i -g vercel');
            lines.push('');
            lines.push('# Deploy to preview');
            lines.push('vercel');
            lines.push('');
            lines.push('# Deploy to production');
            lines.push('vercel --prod');
            lines.push('```');
            lines.push('');
            lines.push('Or connect your GitHub repo in the Vercel dashboard for automatic deployments on push.');
            break;
        case 'railway':
            lines.push('### Railway');
            lines.push('');
            lines.push('```bash');
            lines.push('# Install Railway CLI');
            lines.push('npm i -g @railway/cli');
            lines.push('');
            lines.push('# Login and link project');
            lines.push('railway login');
            lines.push('railway link');
            lines.push('');
            lines.push('# Deploy');
            lines.push('railway up');
            lines.push('```');
            break;
        case 'aws':
            lines.push('### AWS');
            lines.push('');
            lines.push('```bash');
            lines.push('# Configure credentials');
            lines.push('aws configure');
            lines.push('');
            lines.push('# Deploy with your IaC tool');
            if (doc.deployment.infrastructure?.iac === 'terraform') {
                lines.push('cd infrastructure');
                lines.push('terraform init');
                lines.push('terraform plan');
                lines.push('terraform apply');
            }
            else if (doc.deployment.infrastructure?.iac === 'cdk') {
                lines.push('cd infrastructure');
                lines.push('npx cdk bootstrap');
                lines.push('npx cdk deploy --all');
            }
            else if (doc.deployment.infrastructure?.iac === 'cloudformation') {
                lines.push('cd infrastructure');
                lines.push('aws cloudformation deploy \\');
                lines.push('  --template-file template.yaml \\');
                lines.push('  --stack-name ' + slugify(doc.solution.name) + ' \\');
                lines.push('  --capabilities CAPABILITY_IAM');
            }
            else if (doc.deployment.infrastructure?.iac === 'pulumi') {
                lines.push('cd infrastructure');
                lines.push('pulumi up');
            }
            else {
                lines.push('# Build and push Docker images');
                lines.push('aws ecr get-login-password --region $AWS_REGION | \\');
                lines.push('  docker login --username AWS --password-stdin $ECR_REGISTRY');
                lines.push('docker build -t $ECR_REGISTRY/' + slugify(doc.solution.name) + ':latest .');
                lines.push('docker push $ECR_REGISTRY/' + slugify(doc.solution.name) + ':latest');
                lines.push('');
                lines.push('# Deploy to ECS');
                lines.push('aws ecs update-service \\');
                lines.push('  --cluster ' + slugify(doc.solution.name) + ' \\');
                lines.push('  --service ' + slugify(doc.solution.name) + '-api \\');
                lines.push('  --force-new-deployment');
            }
            lines.push('```');
            break;
        case 'gcp':
            lines.push('### Google Cloud');
            lines.push('');
            lines.push('```bash');
            lines.push('gcloud auth login');
            lines.push('gcloud config set project YOUR_PROJECT_ID');
            lines.push('');
            lines.push('# Deploy to Cloud Run');
            lines.push('gcloud run deploy SERVICE_NAME \\');
            lines.push('  --source . \\');
            lines.push('  --region us-central1 \\');
            lines.push('  --allow-unauthenticated');
            lines.push('```');
            break;
        case 'azure':
            lines.push('### Azure');
            lines.push('');
            lines.push('```bash');
            lines.push('az login');
            lines.push('');
            lines.push('# Deploy to Azure Container Apps / App Service');
            lines.push('az webapp up --name YOUR_APP_NAME --resource-group YOUR_RG');
            lines.push('```');
            break;
        case 'fly-io':
            lines.push('### Fly.io');
            lines.push('');
            lines.push('```bash');
            lines.push('fly auth login');
            lines.push('fly launch');
            lines.push('fly deploy');
            lines.push('```');
            break;
        case 'render':
            lines.push('### Render');
            lines.push('');
            lines.push('1. Connect your GitHub repository in the Render dashboard');
            lines.push('2. Configure environment variables');
            lines.push('3. Render auto-deploys on push to main');
            break;
        case 'cloudflare':
            lines.push('### Cloudflare');
            lines.push('');
            lines.push('```bash');
            lines.push('npx wrangler login');
            lines.push('npx wrangler deploy');
            lines.push('```');
            break;
        default:
            lines.push(`### ${cloudLabel(cloud)}`);
            lines.push('');
            lines.push(`Refer to the ${cloudLabel(cloud)} documentation for deployment instructions.`);
    }
    return lines.join('\n');
}
function getRollbackInstructions(cloud) {
    const lines = [];
    lines.push('### Quick Rollback');
    lines.push('');
    switch (cloud) {
        case 'vercel':
            lines.push('1. Go to Vercel dashboard → Deployments');
            lines.push('2. Find the previous working deployment');
            lines.push('3. Click "..." → "Promote to Production"');
            break;
        case 'railway':
            lines.push('1. Go to Railway dashboard → Deployments');
            lines.push('2. Click "Rollback" on the previous deployment');
            break;
        case 'aws':
            lines.push('1. Identify the previous deployment version');
            lines.push('2. Re-deploy the previous version: `aws ecs update-service --force-new-deployment`');
            lines.push('3. Or revert terraform: `terraform apply -target=module.service`');
            break;
        default:
            lines.push('1. Identify the last known good deployment');
            lines.push('2. Revert the git commit: `git revert HEAD && git push`');
            lines.push('3. Or re-deploy the previous version from your CI/CD');
    }
    lines.push('');
    lines.push('### Database Rollback');
    lines.push('');
    lines.push('If the deployment included a database migration:');
    lines.push('');
    lines.push('1. Check if the migration is backward-compatible');
    lines.push('2. If not, run the down migration before rolling back the application');
    lines.push('3. Verify data integrity after rollback');
    return lines.join('\n');
}
// ─── Helpers ───
function countProjects(doc) {
    return (doc.architecture.projects.frontend || []).length
        + (doc.architecture.projects.backend || []).length
        + (doc.architecture.projects.mobile || []).length;
}
function displayName(s) {
    const labels = {
        postgres: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', sqlserver: 'SQL Server',
        auth0: 'Auth0', cognito: 'Cognito', firebase: 'Firebase', clerk: 'Clerk', supabase: 'Supabase',
        stripe: 'Stripe', paypal: 'PayPal', sendgrid: 'SendGrid', ses: 'AWS SES',
        datadog: 'Datadog', sentry: 'Sentry', newrelic: 'New Relic',
        prisma: 'Prisma', typeorm: 'TypeORM',
    };
    return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function frameworkLabel(fw) {
    const labels = {
        nextjs: 'Next.js', react: 'React', vue: 'Vue.js', angular: 'Angular', svelte: 'Svelte',
        nodejs: 'Node.js', 'dotnet-8': '.NET 8', 'python-fastapi': 'FastAPI', go: 'Go',
        'java-spring': 'Spring Boot', 'ruby-rails': 'Rails', 'php-laravel': 'Laravel',
    };
    return labels[fw] || fw;
}
function cloudLabel(cloud) {
    const labels = {
        aws: 'AWS', gcp: 'Google Cloud', azure: 'Azure', vercel: 'Vercel',
        railway: 'Railway', render: 'Render', 'fly-io': 'Fly.io', cloudflare: 'Cloudflare',
    };
    return labels[cloud] || cloud;
}
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
