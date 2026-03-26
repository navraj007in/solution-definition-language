/**
 * Shared pricing data types used by cost-estimate generator and deployment planner.
 */

export interface PlatformPricing {
  id: string;
  name: string;
  category: 'paas' | 'iaas' | 'serverless' | 'edge';
  compute: TierPricing[];
  database: TierPricing[];
  cache?: TierPricing[];
  storage?: TierPricing[];
  freeTier?: FreeTierInfo;
  compliance?: string[];
  regions: string[];
}

export interface TierPricing {
  tier: string;
  monthlyCost: number;
  scale: 'small' | 'medium' | 'large';
  notes: string;
}

export interface FreeTierInfo {
  compute?: string;
  database?: string;
  bandwidth?: string;
  requests?: string;
  notes?: string;
}

export interface ScaleProjection {
  users: number;
  rps: number;
  computeCost: number;
  databaseCost: number;
  bandwidthCost: number;
  totalCost: number;
}

export interface ServicePricing {
  id: string;
  name: string;
  category: 'auth' | 'email' | 'payments' | 'monitoring' | 'cdn' | 'cicd' | 'search';
  freeLimit?: string;
  tiers: { name: string; monthlyCost: number; limit: string }[];
}
