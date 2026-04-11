/**
 * Cloud platform pricing baselines (approximate USD/month, early 2026).
 * Shared between cost-estimate generator and deployment planner prompts.
 */
export const PLATFORM_PRICING = [
    {
        id: 'vercel',
        name: 'Vercel',
        category: 'paas',
        compute: [
            { tier: 'Hobby', monthlyCost: 0, scale: 'small', notes: 'Free plan. Serverless functions included.' },
            { tier: 'Pro', monthlyCost: 20, scale: 'medium', notes: '$20/seat. Edge functions, analytics.' },
            { tier: 'Enterprise', monthlyCost: 500, scale: 'large', notes: 'Custom pricing. SLA, SSO, audit logs.' },
        ],
        database: [
            { tier: 'Postgres (Hobby)', monthlyCost: 0, scale: 'small', notes: 'Vercel Postgres free tier.' },
            { tier: 'Postgres (Pro)', monthlyCost: 20, scale: 'medium', notes: 'Vercel Postgres Pro.' },
        ],
        freeTier: { compute: 'Hobby plan free', bandwidth: '100 GB/mo', requests: '100K serverless invocations/mo' },
        regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    },
    {
        id: 'railway',
        name: 'Railway',
        category: 'paas',
        compute: [
            { tier: 'Hobby', monthlyCost: 5, scale: 'small', notes: '$5/mo credit. Usage-based.' },
            { tier: 'Pro', monthlyCost: 20, scale: 'medium', notes: '$20/mo per service. Team features.' },
            { tier: 'Enterprise', monthlyCost: 100, scale: 'large', notes: 'Custom. Dedicated resources.' },
        ],
        database: [
            { tier: 'Postgres', monthlyCost: 5, scale: 'small', notes: 'Shared instance, usage-based.' },
            { tier: 'Postgres (Pro)', monthlyCost: 20, scale: 'medium', notes: 'Dedicated Postgres.' },
        ],
        freeTier: { compute: '$5 monthly credit', notes: 'Trial plan with 500 hours execution' },
        regions: ['us-west-1', 'us-east-4', 'europe-west4'],
    },
    {
        id: 'render',
        name: 'Render',
        category: 'paas',
        compute: [
            { tier: 'Free', monthlyCost: 0, scale: 'small', notes: 'Free instance. Spins down after inactivity.' },
            { tier: 'Starter', monthlyCost: 7, scale: 'small', notes: 'Always-on. 512 MB RAM.' },
            { tier: 'Standard', monthlyCost: 25, scale: 'medium', notes: '2 GB RAM. Auto-scaling.' },
            { tier: 'Pro', monthlyCost: 85, scale: 'large', notes: '4 GB RAM. Dedicated CPU.' },
        ],
        database: [
            { tier: 'Free', monthlyCost: 0, scale: 'small', notes: 'PostgreSQL free, 1 GB, 90 day limit.' },
            { tier: 'Starter', monthlyCost: 7, scale: 'small', notes: '1 GB SSD PostgreSQL.' },
            { tier: 'Standard', monthlyCost: 20, scale: 'medium', notes: '16 GB SSD PostgreSQL.' },
        ],
        freeTier: { compute: 'Free web service (sleeps)', database: 'Free Postgres (90 days)' },
        regions: ['us-oregon', 'eu-frankfurt', 'ap-singapore'],
    },
    {
        id: 'fly-io',
        name: 'Fly.io',
        category: 'paas',
        compute: [
            { tier: 'Shared 1x', monthlyCost: 2, scale: 'small', notes: 'Shared CPU, 256 MB.' },
            { tier: 'Shared 2x', monthlyCost: 5, scale: 'small', notes: 'Shared CPU, 512 MB.' },
            { tier: 'Performance 1x', monthlyCost: 30, scale: 'medium', notes: 'Dedicated CPU, 2 GB.' },
            { tier: 'Performance 4x', monthlyCost: 120, scale: 'large', notes: '4 dedicated CPUs, 8 GB.' },
        ],
        database: [
            { tier: 'Postgres (Dev)', monthlyCost: 0, scale: 'small', notes: 'Single-node, 1 GB.' },
            { tier: 'Postgres (Production)', monthlyCost: 30, scale: 'medium', notes: 'HA with replicas.' },
        ],
        freeTier: { compute: '3 shared VMs free', database: '1 GB Postgres free' },
        regions: ['iad', 'cdg', 'nrt', 'syd', 'gru', 'jnb'],
    },
    {
        id: 'aws',
        name: 'AWS',
        category: 'iaas',
        compute: [
            { tier: 't3.micro', monthlyCost: 8, scale: 'small', notes: '2 vCPU, 1 GB. Free tier eligible.' },
            { tier: 't3.small', monthlyCost: 17, scale: 'medium', notes: '2 vCPU, 2 GB.' },
            { tier: 't3.medium', monthlyCost: 33, scale: 'medium', notes: '2 vCPU, 4 GB.' },
            { tier: 'Fargate (0.25 vCPU)', monthlyCost: 30, scale: 'medium', notes: 'Serverless containers.' },
            { tier: 'Fargate (1 vCPU)', monthlyCost: 60, scale: 'large', notes: 'Serverless containers.' },
        ],
        database: [
            { tier: 'RDS db.t3.micro', monthlyCost: 15, scale: 'small', notes: 'Postgres/MySQL. Free tier eligible.' },
            { tier: 'RDS db.t3.small', monthlyCost: 30, scale: 'medium', notes: '2 GB RAM.' },
            { tier: 'RDS db.r6g.large', monthlyCost: 200, scale: 'large', notes: 'Production. 16 GB RAM.' },
            { tier: 'Aurora Serverless v2', monthlyCost: 45, scale: 'medium', notes: 'Auto-scaling. $0.12/ACU-hour.' },
        ],
        cache: [
            { tier: 'ElastiCache t3.micro', monthlyCost: 12, scale: 'small', notes: 'Redis/Memcached.' },
            { tier: 'ElastiCache r6g.large', monthlyCost: 130, scale: 'large', notes: 'Production Redis.' },
        ],
        freeTier: { compute: 't2.micro 750 hrs/mo (12 months)', database: 'RDS db.t2.micro 750 hrs (12 months)' },
        compliance: ['HIPAA', 'SOC2', 'PCI-DSS', 'GDPR', 'ISO27001', 'FedRAMP'],
        regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
    },
    {
        id: 'gcp',
        name: 'Google Cloud',
        category: 'iaas',
        compute: [
            { tier: 'Cloud Run', monthlyCost: 0, scale: 'small', notes: 'Free tier: 2M requests/mo.' },
            { tier: 'Cloud Run (medium)', monthlyCost: 30, scale: 'medium', notes: 'Pay-per-use. $0.00002400/vCPU-second.' },
            { tier: 'GKE Autopilot', monthlyCost: 75, scale: 'large', notes: 'Managed Kubernetes. Per-pod billing.' },
        ],
        database: [
            { tier: 'Cloud SQL micro', monthlyCost: 10, scale: 'small', notes: 'Shared-core. Postgres/MySQL.' },
            { tier: 'Cloud SQL small', monthlyCost: 50, scale: 'medium', notes: '1 vCPU, 3.75 GB.' },
            { tier: 'Cloud SQL standard', monthlyCost: 150, scale: 'large', notes: '4 vCPU, 15 GB.' },
        ],
        freeTier: { compute: 'Cloud Run 2M requests/mo', database: 'Firestore 1 GiB' },
        compliance: ['HIPAA', 'SOC2', 'PCI-DSS', 'GDPR', 'ISO27001'],
        regions: ['us-central1', 'us-east1', 'europe-west1', 'asia-east1', 'australia-southeast1'],
    },
    {
        id: 'azure',
        name: 'Azure',
        category: 'iaas',
        compute: [
            { tier: 'B1', monthlyCost: 13, scale: 'small', notes: 'App Service B1. 1 core, 1.75 GB.' },
            { tier: 'B2', monthlyCost: 26, scale: 'medium', notes: 'App Service B2. 2 cores, 3.5 GB.' },
            { tier: 'S1', monthlyCost: 73, scale: 'large', notes: 'App Service S1. Auto-scale, staging slots.' },
        ],
        database: [
            { tier: 'Azure SQL Basic', monthlyCost: 5, scale: 'small', notes: '2 GB. 5 DTU.' },
            { tier: 'Azure SQL Standard', monthlyCost: 30, scale: 'medium', notes: '250 GB. 20 DTU.' },
            { tier: 'Azure SQL Premium', monthlyCost: 465, scale: 'large', notes: '500 GB. 125 DTU.' },
        ],
        freeTier: { compute: '10 web apps, 1 GB each (free tier)', database: 'Azure SQL 250 GB (12 months)' },
        compliance: ['HIPAA', 'SOC2', 'PCI-DSS', 'GDPR', 'ISO27001', 'FedRAMP'],
        regions: ['eastus', 'westus2', 'westeurope', 'southeastasia', 'australiaeast'],
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        category: 'edge',
        compute: [
            { tier: 'Workers Free', monthlyCost: 0, scale: 'small', notes: '100K requests/day.' },
            { tier: 'Workers Paid', monthlyCost: 5, scale: 'medium', notes: '10M requests/mo included.' },
        ],
        database: [
            { tier: 'D1 Free', monthlyCost: 0, scale: 'small', notes: '5M reads/day, 100K writes/day.' },
            { tier: 'D1 Paid', monthlyCost: 5, scale: 'medium', notes: '25B reads/mo, 50M writes/mo.' },
        ],
        storage: [
            { tier: 'R2 Free', monthlyCost: 0, scale: 'small', notes: '10 GB storage, 10M reads.' },
            { tier: 'R2 Paid', monthlyCost: 15, scale: 'medium', notes: '$0.015/GB/mo.' },
        ],
        freeTier: { compute: '100K Workers requests/day', database: 'D1 5M reads/day', bandwidth: 'Unlimited CDN' },
        regions: ['global-edge'],
    },
    {
        id: 'netlify',
        name: 'Netlify',
        category: 'paas',
        compute: [
            { tier: 'Starter', monthlyCost: 0, scale: 'small', notes: 'Free. 125K serverless function calls.' },
            { tier: 'Pro', monthlyCost: 19, scale: 'medium', notes: '$19/member. 125K-2M function calls.' },
        ],
        database: [],
        freeTier: { compute: '125K function invocations/mo', bandwidth: '100 GB/mo' },
        regions: ['us-east-1', 'eu-west-1'],
    },
    {
        id: 'digitalocean',
        name: 'DigitalOcean',
        category: 'iaas',
        compute: [
            { tier: 'Basic ($6)', monthlyCost: 6, scale: 'small', notes: '1 vCPU, 1 GB, 25 GB SSD.' },
            { tier: 'Basic ($12)', monthlyCost: 12, scale: 'small', notes: '1 vCPU, 2 GB, 50 GB SSD.' },
            { tier: 'General ($63)', monthlyCost: 63, scale: 'medium', notes: '2 vCPU, 8 GB, 160 GB SSD.' },
            { tier: 'App Platform', monthlyCost: 5, scale: 'small', notes: 'Managed PaaS. $5/component.' },
        ],
        database: [
            { tier: 'Managed DB ($15)', monthlyCost: 15, scale: 'small', notes: 'Postgres/MySQL. 1 GB RAM.' },
            { tier: 'Managed DB ($50)', monthlyCost: 50, scale: 'medium', notes: 'Postgres/MySQL. 4 GB RAM.' },
        ],
        freeTier: { compute: '$200 credit for 60 days' },
        regions: ['nyc1', 'sfo3', 'ams3', 'sgp1', 'lon1'],
    },
];
/**
 * Look up a platform by ID.
 */
export function getPlatformPricing(platformId) {
    return PLATFORM_PRICING.find(p => p.id === platformId);
}
/**
 * Get the compute cost for a platform at a given scale.
 */
export function getComputeCost(platformId, scale) {
    const platform = getPlatformPricing(platformId);
    if (!platform)
        return 15;
    const tier = platform.compute.find(t => t.scale === scale);
    return tier?.monthlyCost ?? 15;
}
/**
 * Get the database cost for a platform at a given scale.
 */
export function getDatabaseCost(platformId, scale) {
    const platform = getPlatformPricing(platformId);
    if (!platform)
        return 15;
    const tier = platform.database.find(t => t.scale === scale);
    return tier?.monthlyCost ?? 15;
}
