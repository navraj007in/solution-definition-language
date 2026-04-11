import { PLATFORM_PRICING } from './platforms';
import { SERVICE_PRICING } from './services';
/**
 * Generate a concise pricing summary suitable for embedding in AI prompts.
 * Used by the deployment planner to give the AI accurate pricing context.
 */
export function buildPricingSummaryForPrompt() {
    const lines = [];
    lines.push('## Pricing Baselines (approximate USD/month, early 2026)\n');
    for (const p of PLATFORM_PRICING) {
        const tiers = p.compute.map(t => `${t.tier} $${t.monthlyCost}`).join(', ');
        const freePart = p.freeTier ? ` Free: ${p.freeTier.compute || 'limited'}` : '';
        lines.push(`**${p.name}**: ${tiers}.${freePart}`);
    }
    lines.push('');
    lines.push('### Third-party Services\n');
    const categories = [...new Set(SERVICE_PRICING.map(s => s.category))];
    for (const cat of categories) {
        const services = SERVICE_PRICING.filter(s => s.category === cat);
        const summaries = services.map(s => {
            const topTier = s.tiers[s.tiers.length - 1];
            return `${s.name}: ${s.freeLimit ? `free up to ${s.freeLimit}` : `from $${s.tiers[0].monthlyCost}`}${topTier.monthlyCost > 0 ? `, paid $${topTier.monthlyCost}/mo` : ''}`;
        });
        lines.push(`**${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ${summaries.join('; ')}`);
    }
    return lines.join('\n');
}
