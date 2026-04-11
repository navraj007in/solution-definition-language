import { getPlatformPricing } from './platforms';
/**
 * Project cost growth over time based on user growth and platform pricing.
 * Returns monthly snapshots showing estimated costs at each scale milestone.
 */
export function projectCostGrowth(input) {
    const { platformId, currentUsers, growthRate, months, serviceCount, databaseCount } = input;
    const platform = getPlatformPricing(platformId);
    const projections = [];
    for (let m = 0; m <= months; m += Math.max(1, Math.floor(months / 6))) {
        const users = Math.round(currentUsers * Math.pow(1 + growthRate, m));
        const rps = Math.max(1, Math.round(users * 0.01)); // rough: 1% of users = concurrent RPS
        const scale = usersToScale(users);
        let computeCost = 0;
        let databaseCost = 0;
        let bandwidthCost = estimateBandwidthCost(users);
        if (platform) {
            const computeTier = platform.compute.find(t => t.scale === scale)
                || platform.compute[platform.compute.length - 1];
            computeCost = (computeTier?.monthlyCost ?? 15) * serviceCount;
            const dbTier = platform.database.find(t => t.scale === scale)
                || platform.database[platform.database.length - 1];
            databaseCost = (dbTier?.monthlyCost ?? 15) * databaseCount;
        }
        else {
            computeCost = defaultComputeCost(scale) * serviceCount;
            databaseCost = defaultDbCost(scale) * databaseCount;
        }
        projections.push({
            users,
            rps,
            computeCost,
            databaseCost,
            bandwidthCost,
            totalCost: computeCost + databaseCost + bandwidthCost,
        });
    }
    return projections;
}
function usersToScale(users) {
    if (users <= 1000)
        return 'small';
    if (users <= 50000)
        return 'medium';
    return 'large';
}
function defaultComputeCost(scale) {
    return scale === 'small' ? 10 : scale === 'medium' ? 40 : 150;
}
function defaultDbCost(scale) {
    return scale === 'small' ? 15 : scale === 'medium' ? 50 : 200;
}
function estimateBandwidthCost(users) {
    // Rough estimate: ~10 MB/user/month, $0.09/GB
    const gbPerMonth = (users * 10) / 1024;
    if (gbPerMonth <= 100)
        return 0; // most platforms include 100 GB
    return Math.round((gbPerMonth - 100) * 0.09);
}
