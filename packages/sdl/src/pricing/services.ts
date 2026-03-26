import type { ServicePricing } from './types';

/**
 * Third-party service pricing baselines (approximate USD/month, early 2026).
 * Covers auth, email, payments, monitoring, CDN, CI/CD, and search providers.
 */
export const SERVICE_PRICING: ServicePricing[] = [
  // Auth
  { id: 'auth0', name: 'Auth0', category: 'auth', freeLimit: '7,500 MAU', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '7,500 MAU' },
    { name: 'Essentials', monthlyCost: 23, limit: '1,000+ MAU' },
    { name: 'Professional', monthlyCost: 240, limit: 'Unlimited' },
  ]},
  { id: 'cognito', name: 'AWS Cognito', category: 'auth', freeLimit: '50,000 MAU', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '50,000 MAU' },
    { name: 'Pay-per-use', monthlyCost: 5, limit: '$0.0055/MAU after free' },
  ]},
  { id: 'clerk', name: 'Clerk', category: 'auth', freeLimit: '10,000 MAU', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '10,000 MAU' },
    { name: 'Pro', monthlyCost: 25, limit: '$0.02/MAU after 10K' },
  ]},
  { id: 'firebase', name: 'Firebase Auth', category: 'auth', freeLimit: '50,000 MAU', tiers: [
    { name: 'Spark', monthlyCost: 0, limit: '50,000 MAU' },
    { name: 'Blaze', monthlyCost: 0, limit: 'Pay-as-you-go' },
  ]},
  { id: 'supabase', name: 'Supabase Auth', category: 'auth', freeLimit: '50,000 MAU', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '50,000 MAU' },
    { name: 'Pro', monthlyCost: 25, limit: '100,000 MAU' },
  ]},

  // Email
  { id: 'sendgrid', name: 'SendGrid', category: 'email', freeLimit: '100 emails/day', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '100/day' },
    { name: 'Essentials', monthlyCost: 20, limit: '50K/mo' },
    { name: 'Pro', monthlyCost: 90, limit: '100K/mo' },
  ]},
  { id: 'ses', name: 'AWS SES', category: 'email', freeLimit: '62,000/mo (from EC2)', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '62K/mo from EC2' },
    { name: 'Pay-per-use', monthlyCost: 1, limit: '$0.10/1K emails' },
  ]},
  { id: 'resend', name: 'Resend', category: 'email', freeLimit: '100 emails/day', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '100/day, 3K/mo' },
    { name: 'Pro', monthlyCost: 20, limit: '50K/mo' },
  ]},
  { id: 'postmark', name: 'Postmark', category: 'email', freeLimit: '100 emails/mo', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '100/mo' },
    { name: 'Starter', monthlyCost: 15, limit: '10K/mo' },
  ]},

  // Payments
  { id: 'stripe', name: 'Stripe', category: 'payments', tiers: [
    { name: 'Standard', monthlyCost: 0, limit: '2.9% + $0.30/transaction' },
  ]},
  { id: 'paypal', name: 'PayPal', category: 'payments', tiers: [
    { name: 'Standard', monthlyCost: 0, limit: '2.99% + $0.49/transaction' },
  ]},

  // Monitoring
  { id: 'sentry', name: 'Sentry', category: 'monitoring', freeLimit: '5K errors/mo', tiers: [
    { name: 'Developer', monthlyCost: 0, limit: '5K errors/mo' },
    { name: 'Team', monthlyCost: 26, limit: '50K errors/mo' },
    { name: 'Business', monthlyCost: 80, limit: '100K errors/mo' },
  ]},
  { id: 'datadog', name: 'Datadog', category: 'monitoring', freeLimit: '5 hosts', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '5 hosts' },
    { name: 'Pro', monthlyCost: 15, limit: 'Per host' },
    { name: 'Enterprise', monthlyCost: 23, limit: 'Per host' },
  ]},
  { id: 'newrelic', name: 'New Relic', category: 'monitoring', freeLimit: '100 GB/mo', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '100 GB/mo ingest' },
    { name: 'Standard', monthlyCost: 99, limit: 'Per full user/mo' },
  ]},

  // CI/CD
  { id: 'github-actions', name: 'GitHub Actions', category: 'cicd', freeLimit: '2,000 min/mo', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '2,000 min/mo (public unlimited)' },
    { name: 'Team', monthlyCost: 4, limit: '3,000 min/mo' },
  ]},
  { id: 'gitlab-ci', name: 'GitLab CI', category: 'cicd', freeLimit: '400 min/mo', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '400 min/mo' },
    { name: 'Premium', monthlyCost: 29, limit: '10,000 min/mo' },
  ]},

  // CDN
  { id: 'cloudflare-cdn', name: 'Cloudflare CDN', category: 'cdn', freeLimit: 'Unlimited bandwidth', tiers: [
    { name: 'Free', monthlyCost: 0, limit: 'Unlimited CDN bandwidth' },
    { name: 'Pro', monthlyCost: 20, limit: 'WAF, image optimization' },
  ]},
  { id: 'cloudfront', name: 'CloudFront', category: 'cdn', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '1 TB/mo (12 months)' },
    { name: 'Pay-per-use', monthlyCost: 10, limit: '$0.085/GB first 10 TB' },
  ]},

  // Search
  { id: 'algolia', name: 'Algolia', category: 'search', freeLimit: '10K searches/mo', tiers: [
    { name: 'Free', monthlyCost: 0, limit: '10K searches/mo, 10K records' },
    { name: 'Grow', monthlyCost: 29, limit: '10K searches + $0.50/1K extra' },
  ]},
  { id: 'typesense', name: 'Typesense Cloud', category: 'search', tiers: [
    { name: 'Small', monthlyCost: 30, limit: '0.5 vCPU, 1 GB' },
    { name: 'Medium', monthlyCost: 60, limit: '1 vCPU, 2 GB' },
  ]},
];

/**
 * Look up a service by ID.
 */
export function getServicePricing(serviceId: string): ServicePricing | undefined {
  return SERVICE_PRICING.find(s => s.id === serviceId);
}

/**
 * Get the estimated monthly cost for a service given expected usage scale.
 */
export function getServiceCost(serviceId: string, scale: 'small' | 'medium' | 'large'): number {
  const service = getServicePricing(serviceId);
  if (!service) return 10;
  if (scale === 'small' && service.freeLimit) return 0;
  const tierIndex = scale === 'small' ? 0 : scale === 'medium' ? 1 : Math.min(2, service.tiers.length - 1);
  return service.tiers[tierIndex]?.monthlyCost ?? 0;
}
