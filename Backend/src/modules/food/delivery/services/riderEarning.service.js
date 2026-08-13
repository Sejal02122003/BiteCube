import { FoodDeliveryCommissionRule } from '../../admin/models/deliveryCommissionRule.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';

const COMMISSION_CACHE_MS = 10 * 1000;
let commissionRulesCache = null;
let commissionRulesLoadedAt = 0;

async function getActiveCommissionRules() {
    const now = Date.now();
    if (commissionRulesCache && now - commissionRulesLoadedAt < COMMISSION_CACHE_MS) {
        return commissionRulesCache;
    }

    const rules = await FoodDeliveryCommissionRule.find({ status: { $ne: false } }).lean();
    commissionRulesCache = rules || [];
    commissionRulesLoadedAt = now;
    return commissionRulesCache;
}

export async function calculateRiderEarning(distanceKm) {
    const distance = Number(distanceKm);
    let baseEarning = 0;

    if (Number.isFinite(distance) && distance > 0) {
        const rules = await getActiveCommissionRules();
        const sortedRules = [...rules].sort(
            (a, b) => Number(a.minDistance || 0) - Number(b.minDistance || 0)
        );
        const baseRule = sortedRules.find((rule) => Number(rule.minDistance || 0) === 0);

        if (baseRule) {
            baseEarning = Number(baseRule.basePayout || 0);
            for (const rule of sortedRules) {
                const perKm = Number(rule.commissionPerKm || 0);
                if (!Number.isFinite(perKm) || perKm <= 0) continue;

                const minDistance = Number(rule.minDistance || 0);
                const maxDistance = rule.maxDistance == null ? null : Number(rule.maxDistance);
                if (distance <= minDistance) continue;

                const upperDistance = maxDistance == null ? distance : Math.min(distance, maxDistance);
                const distanceInSlab = Math.max(0, upperDistance - minDistance);
                baseEarning += distanceInSlab * perKm;
            }
        }
    }

    if (!Number.isFinite(baseEarning) || baseEarning <= 0) baseEarning = 0;
    else baseEarning = Math.round(baseEarning);

    const feeSettings = await FoodFeeSettings.findOne({ isActive: true }).lean();
    const configuredBonus = Number(feeSettings?.deliveryBonusAmount || 0);
    const bonusAmount = Number.isFinite(configuredBonus) && configuredBonus > 0
        ? configuredBonus
        : 0;

    return {
        distanceKm: Number.isFinite(distance) && distance > 0 ? distance : null,
        baseEarning,
        bonusAmount,
        totalEarning: baseEarning + bonusAmount
    };
}
