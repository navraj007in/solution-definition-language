/**
 * Generates a cost estimate from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Estimates monthly costs for:
 *   - Compute (backend hosting)
 *   - Frontend hosting
 *   - Database
 *   - Auth provider
 *   - Cache
 *   - Integrations (payments, email, monitoring)
 *   - CI/CD
 */
export function generateCostEstimate(doc) {
    const items = estimateCosts(doc);
    const totalMonthly = items.reduce((sum, i) => sum + i.monthlyCost, 0);
    const markdown = renderCostMarkdown(doc, items, totalMonthly);
    return {
        artifactType: 'cost-estimate',
        files: [
            {
                path: 'artifacts/cost/cost-estimate.md',
                content: markdown,
            },
        ],
        metadata: {
            solutionName: doc.solution.name,
            cloud: doc.deployment.cloud,
            totalMonthly,
            itemCount: items.length,
            items: items.map((i) => ({ category: i.category, service: i.service, monthlyCost: i.monthlyCost })),
        },
    };
}
// ─── Cost Estimator ───
function estimateCosts(doc) {
    const items = [];
    const cloud = doc.deployment.cloud;
    const scale = getScale(doc);
    // Compute (backend)
    const backends = doc.architecture.projects.backend || [];
    for (const be of backends) {
        items.push(estimateCompute(cloud, be.name, be.framework, scale));
    }
    // Frontend hosting
    const frontends = doc.architecture.projects.frontend || [];
    for (const fe of frontends) {
        items.push(estimateFrontendHosting(cloud, fe.name, fe.framework, scale));
    }
    // Database
    items.push(estimateDatabase(doc.data.primaryDatabase.type, doc.data.primaryDatabase.hosting, cloud, scale));
    // Secondary databases
    if (doc.data.secondaryDatabases) {
        for (const sdb of doc.data.secondaryDatabases) {
            items.push(estimateDatabase(sdb.type, sdb.hosting, cloud, scale));
        }
    }
    // Cache
    if (doc.data.cache && doc.data.cache.type !== 'none') {
        items.push(estimateCache(doc.data.cache.type || 'redis', cloud, scale));
    }
    // Auth
    if (doc.auth?.provider) {
        items.push(estimateAuth(doc.auth.provider, scale));
    }
    // Integrations
    if (doc.integrations?.payments?.provider) {
        items.push(estimatePayments(doc.integrations.payments.provider));
    }
    if (doc.integrations?.email?.provider) {
        items.push(estimateEmail(doc.integrations.email.provider, scale));
    }
    if (doc.integrations?.monitoring?.provider) {
        items.push(estimateMonitoring(doc.integrations.monitoring.provider, scale));
    }
    if (doc.integrations?.cdn?.provider) {
        items.push(estimateCdn(doc.integrations.cdn.provider, scale));
    }
    // CI/CD
    if (doc.deployment.ciCd?.provider) {
        items.push(estimateCiCd(doc.deployment.ciCd.provider));
    }
    // Domain / SSL
    items.push({
        category: 'Networking',
        service: 'Domain + SSL',
        tier: 'Standard',
        monthlyCost: 1,
        notes: 'Domain ~$12/year. SSL typically free (Let\'s Encrypt).',
    });
    return items;
}
// ─── Per-Category Estimators ───
function estimateCompute(cloud, name, framework, scale) {
    const costs = {
        vercel: { tier: 'Pro', cost: 20, notes: 'Vercel Pro plan. Serverless functions included.' },
        railway: { tier: 'Pro', cost: scale === 'small' ? 5 : 20, notes: 'Usage-based. $5/mo hobby, $20/mo pro.' },
        render: { tier: 'Starter', cost: scale === 'small' ? 7 : 25, notes: 'Starter instance. Auto-sleep on free.' },
        'fly-io': { tier: 'Shared', cost: scale === 'small' ? 5 : 15, notes: 'Shared CPU. Pay per usage.' },
        aws: { tier: scale === 'small' ? 't3.micro' : 't3.small', cost: scale === 'small' ? 8 : 17, notes: 'EC2 or ECS Fargate.' },
        gcp: { tier: 'Cloud Run', cost: scale === 'small' ? 5 : 15, notes: 'Pay per request. Generous free tier.' },
        azure: { tier: 'B1', cost: scale === 'small' ? 13 : 25, notes: 'App Service B1 plan.' },
        cloudflare: { tier: 'Workers', cost: 5, notes: 'Workers Paid plan. 10M requests/mo.' },
    };
    const info = costs[cloud] || { tier: 'Standard', cost: 15, notes: 'Estimated compute cost.' };
    return {
        category: 'Compute',
        service: `${name} (${frameworkLabel(framework)})`,
        tier: info.tier,
        monthlyCost: info.cost,
        notes: info.notes,
    };
}
function estimateFrontendHosting(cloud, name, framework, scale) {
    // Most frontends are free or very cheap on static hosting
    if (cloud === 'vercel' || cloud === 'cloudflare') {
        return {
            category: 'Hosting',
            service: `${name} (${frameworkLabel(framework)})`,
            tier: 'Included',
            monthlyCost: 0,
            notes: `Included in ${cloudLabel(cloud)} plan.`,
            freeIncluded: 'Yes',
        };
    }
    return {
        category: 'Hosting',
        service: `${name} (${frameworkLabel(framework)})`,
        tier: 'Static',
        monthlyCost: scale === 'small' ? 0 : 5,
        notes: 'Static site hosting. Often free for small traffic.',
        freeIncluded: scale === 'small' ? 'Yes' : 'No',
    };
}
function estimateDatabase(dbType, hosting, cloud, scale) {
    const dbName = displayName(dbType);
    if (hosting === 'serverless') {
        return {
            category: 'Database',
            service: `${dbName} (Serverless)`,
            tier: 'Serverless',
            monthlyCost: scale === 'small' ? 0 : 10,
            notes: 'Pay per query. Free tier available.',
            freeIncluded: scale === 'small' ? 'Yes' : 'No',
        };
    }
    const managedCosts = {
        postgres: { small: 15, medium: 50, large: 200 },
        mysql: { small: 15, medium: 50, large: 200 },
        mongodb: { small: 0, medium: 57, large: 200 },
        sqlserver: { small: 30, medium: 100, large: 400 },
        dynamodb: { small: 0, medium: 25, large: 100 },
        cockroachdb: { small: 0, medium: 60, large: 200 },
        planetscale: { small: 0, medium: 29, large: 99 },
    };
    const costs = managedCosts[dbType] || { small: 15, medium: 50, large: 200 };
    const cost = costs[scale] || costs.small;
    return {
        category: 'Database',
        service: `${dbName} (${hosting})`,
        tier: scale === 'small' ? 'Starter / Free' : scale === 'medium' ? 'Standard' : 'Production',
        monthlyCost: cost,
        notes: `${hosting === 'managed' ? 'Managed instance.' : 'Self-hosted.'} ${cost === 0 ? 'Free tier available.' : ''}`.trim(),
        freeIncluded: cost === 0 ? 'Yes' : undefined,
    };
}
function estimateCache(cacheType, cloud, scale) {
    const costs = { small: 0, medium: 15, large: 50 };
    return {
        category: 'Cache',
        service: displayName(cacheType),
        tier: scale === 'small' ? 'Free / Hobby' : 'Standard',
        monthlyCost: costs[scale] || 0,
        notes: scale === 'small' ? 'Free tier (e.g., Upstash, Railway addon).' : 'Managed Redis instance.',
        freeIncluded: scale === 'small' ? 'Yes' : undefined,
    };
}
function estimateAuth(provider, scale) {
    const costs = {
        auth0: { free: 7500, cost: scale === 'small' ? 0 : 23, notes: '7,500 MAU free. $23/mo for 1,000+ MAU (Essentials).' },
        cognito: { free: 50000, cost: scale === 'small' ? 0 : 5, notes: '50,000 MAU free. $0.0055/MAU after.' },
        clerk: { free: 10000, cost: scale === 'small' ? 0 : 25, notes: '10,000 MAU free. $25/mo Pro plan.' },
        firebase: { free: 50000, cost: 0, notes: 'Spark plan: generous free tier for auth.' },
        supabase: { free: 50000, cost: scale === 'small' ? 0 : 25, notes: 'Free tier available. $25/mo Pro.' },
        'entra-id': { free: 50000, cost: scale === 'small' ? 0 : 0, notes: 'Included with Azure AD license.' },
        'entra-id-b2c': { free: 50000, cost: scale === 'small' ? 0 : 0, notes: '50,000 authentications/mo free.' },
    };
    const info = costs[provider] || { free: 0, cost: 10, notes: 'Estimated auth provider cost.' };
    return {
        category: 'Auth',
        service: displayName(provider),
        tier: info.cost === 0 ? 'Free' : 'Paid',
        monthlyCost: info.cost,
        notes: info.notes,
        freeIncluded: info.cost === 0 ? `${info.free.toLocaleString()} MAU` : undefined,
    };
}
function estimatePayments(provider) {
    return {
        category: 'Payments',
        service: displayName(provider),
        tier: 'Transaction-based',
        monthlyCost: 0,
        notes: 'No monthly fee. ~2.9% + $0.30 per transaction.',
    };
}
function estimateEmail(provider, scale) {
    const costs = {
        sendgrid: { cost: scale === 'small' ? 0 : 20, notes: '100 emails/day free. $19.95/mo for 50K.' },
        ses: { cost: scale === 'small' ? 0 : 1, notes: '$0.10 per 1,000 emails. Very cheap.' },
        postmark: { cost: scale === 'small' ? 0 : 15, notes: '100 emails/mo free. $15/mo for 10K.' },
        resend: { cost: scale === 'small' ? 0 : 20, notes: '100 emails/day free. $20/mo for more.' },
        mailgun: { cost: scale === 'small' ? 0 : 15, notes: '100 emails/day free. $15/mo Flex.' },
        smtp: { cost: 0, notes: 'Self-hosted SMTP. No direct cost.' },
    };
    const info = costs[provider] || { cost: 5, notes: 'Estimated email cost.' };
    return {
        category: 'Email',
        service: displayName(provider),
        tier: info.cost === 0 ? 'Free' : 'Paid',
        monthlyCost: info.cost,
        notes: info.notes,
        freeIncluded: info.cost === 0 ? 'Yes' : undefined,
    };
}
function estimateMonitoring(provider, scale) {
    const costs = {
        sentry: { cost: scale === 'small' ? 0 : 26, notes: '5K errors/mo free. $26/mo Team plan.' },
        datadog: { cost: scale === 'small' ? 0 : 15, notes: 'Free tier for 5 hosts. $15/host/mo Pro.' },
        newrelic: { cost: scale === 'small' ? 0 : 0, notes: '100 GB/mo free. Generous free tier.' },
        cloudwatch: { cost: scale === 'small' ? 0 : 5, notes: 'Basic monitoring free. Custom metrics extra.' },
        'azure-monitor': { cost: scale === 'small' ? 0 : 5, notes: 'Basic included with Azure. Log Analytics extra.' },
    };
    const info = costs[provider] || { cost: 10, notes: 'Estimated monitoring cost.' };
    return {
        category: 'Monitoring',
        service: displayName(provider),
        tier: info.cost === 0 ? 'Free' : 'Paid',
        monthlyCost: info.cost,
        notes: info.notes,
        freeIncluded: info.cost === 0 ? 'Yes' : undefined,
    };
}
function estimateCdn(provider, scale) {
    return {
        category: 'CDN',
        service: displayName(provider),
        tier: scale === 'small' ? 'Free' : 'Pro',
        monthlyCost: scale === 'small' ? 0 : 20,
        notes: 'Most CDNs have generous free tiers for small traffic.',
        freeIncluded: scale === 'small' ? 'Yes' : undefined,
    };
}
function estimateCiCd(provider) {
    const costs = {
        'github-actions': { cost: 0, notes: '2,000 min/mo free for public repos. $4/mo for private (Team).' },
        'gitlab-ci': { cost: 0, notes: '400 min/mo free. $29/user/mo Premium.' },
        'azure-devops': { cost: 0, notes: '1,800 min/mo free. $40/user/mo Basic.' },
        circleci: { cost: 0, notes: '6,000 build min/mo free. $15/mo Performance.' },
        jenkins: { cost: 0, notes: 'Self-hosted. Cost is in compute for the CI server.' },
    };
    const info = costs[provider] || { cost: 0, notes: 'CI/CD cost depends on usage.' };
    return {
        category: 'CI/CD',
        service: ciCdLabel(provider),
        tier: 'Free',
        monthlyCost: info.cost,
        notes: info.notes,
        freeIncluded: 'Yes',
    };
}
// ─── Markdown Renderer ───
function renderCostMarkdown(doc, items, totalMonthly) {
    const lines = [];
    const scale = getScale(doc);
    lines.push(`# ${doc.solution.name} — Cost Estimate`);
    lines.push('');
    lines.push(`> Cloud: ${cloudLabel(doc.deployment.cloud)} | Stage: ${doc.solution.stage} | Scale: ${scale}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| | Monthly |`);
    lines.push(`|---|---|`);
    lines.push(`| **Total Estimated** | **$${totalMonthly}/mo** |`);
    lines.push(`| Annual Estimate | $${totalMonthly * 12}/yr |`);
    lines.push('');
    // Group by category
    const categories = [...new Set(items.map((i) => i.category))];
    lines.push('## Breakdown');
    lines.push('');
    lines.push('| Category | Service | Tier | Monthly | Notes |');
    lines.push('|---|---|---|---|---|');
    for (const cat of categories) {
        const catItems = items.filter((i) => i.category === cat);
        for (const item of catItems) {
            const costStr = item.monthlyCost === 0 ? 'Free' : `$${item.monthlyCost}`;
            lines.push(`| ${item.category} | ${item.service} | ${item.tier} | ${costStr} | ${item.notes} |`);
        }
    }
    lines.push('');
    // Per-category subtotals
    lines.push('## Category Totals');
    lines.push('');
    lines.push('| Category | Monthly |');
    lines.push('|---|---|');
    for (const cat of categories) {
        const catTotal = items.filter((i) => i.category === cat).reduce((s, i) => s + i.monthlyCost, 0);
        lines.push(`| ${cat} | $${catTotal} |`);
    }
    lines.push(`| **Total** | **$${totalMonthly}** |`);
    lines.push('');
    // Scaling notes
    lines.push('## Scaling Notes');
    lines.push('');
    lines.push(`- Current estimate is for **${scale}** scale (${scaleDescription(doc)})`);
    lines.push('- Costs will increase with users, traffic, and data volume');
    lines.push('- Most services offer free tiers suitable for development and early MVP');
    lines.push('- Consider reserved instances / committed use discounts for production');
    lines.push('');
    lines.push('## Disclaimer');
    lines.push('');
    lines.push('> This is a rough estimate based on typical pricing as of early 2025. Actual costs may vary based on usage patterns, region, and provider pricing changes. Always check current pricing on provider websites.');
    return lines.join('\n');
}
function getScale(doc) {
    const users = doc.nonFunctional.scaling.expectedUsersYear1 || 0;
    if (users <= 1000)
        return 'small';
    if (users <= 50000)
        return 'medium';
    return 'large';
}
function scaleDescription(doc) {
    const m1 = doc.nonFunctional.scaling.expectedUsersMonth1;
    const y1 = doc.nonFunctional.scaling.expectedUsersYear1;
    const parts = [];
    if (m1)
        parts.push(`${m1} users month 1`);
    if (y1)
        parts.push(`${y1} users year 1`);
    return parts.length > 0 ? parts.join(', ') : 'not specified';
}
function displayName(s) {
    const labels = {
        postgres: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', sqlserver: 'SQL Server',
        dynamodb: 'DynamoDB', cockroachdb: 'CockroachDB', planetscale: 'PlanetScale',
        auth0: 'Auth0', cognito: 'AWS Cognito', firebase: 'Firebase', clerk: 'Clerk', supabase: 'Supabase',
        stripe: 'Stripe', paypal: 'PayPal', sendgrid: 'SendGrid', ses: 'AWS SES',
        postmark: 'Postmark', resend: 'Resend', mailgun: 'Mailgun',
        datadog: 'Datadog', sentry: 'Sentry', newrelic: 'New Relic',
        cloudwatch: 'CloudWatch', 'azure-monitor': 'Azure Monitor',
        cloudflare: 'Cloudflare', fastly: 'Fastly', cloudfront: 'CloudFront', 'azure-cdn': 'Azure CDN',
        redis: 'Redis', memcached: 'Memcached',
    };
    return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function frameworkLabel(fw) {
    const labels = {
        nextjs: 'Next.js', react: 'React', vue: 'Vue.js', angular: 'Angular', svelte: 'Svelte',
        nodejs: 'Node.js', 'dotnet-8': '.NET 8', 'python-fastapi': 'FastAPI', go: 'Go',
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
function ciCdLabel(provider) {
    const labels = {
        'github-actions': 'GitHub Actions', 'gitlab-ci': 'GitLab CI', 'azure-devops': 'Azure DevOps',
        circleci: 'CircleCI', jenkins: 'Jenkins',
    };
    return labels[provider] || provider;
}
