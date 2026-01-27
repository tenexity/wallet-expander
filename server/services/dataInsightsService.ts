import type { Account, AccountMetrics, AccountCategoryGap, ProductCategory, SegmentProfile } from "@shared/schema";
import { SCORING } from "../utils/constants";

export interface AccountWithMetrics {
  account: Account;
  metrics: AccountMetrics | undefined;
}

export interface CategoryDataPoint {
  accountName: string;
  accountId: number;
  categoryPct: number;
  revenue: number;
  isClassA: boolean;
}

export interface ProfileCategory {
  categoryName: string;
  expectedPct: number;
  importance: number;
  isRequired: boolean;
  notes: string;
}

export function calculateClassACustomers(
  accountsWithMetrics: AccountWithMetrics[],
  minRevenue: number
): AccountWithMetrics[] {
  return accountsWithMetrics.filter(({ metrics }) => {
    const revenue = metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0;
    return revenue >= minRevenue;
  });
}

export function calculateTotalRevenue(classACustomers: AccountWithMetrics[]): number {
  return classACustomers.reduce((sum, { metrics }) => {
    return sum + (metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0);
  }, 0);
}

export function calculateAvgCategoryCount(classACustomers: AccountWithMetrics[]): number {
  if (classACustomers.length === 0) return 0;
  return Math.round(
    classACustomers.reduce((sum, { metrics }) => {
      return sum + (metrics?.categoryCount || 0);
    }, 0) / classACustomers.length
  );
}

export function calculateSegmentBreakdown(
  allAccounts: Account[],
  metricsMap: Map<number, AccountMetrics>
): Array<{ segment: string; count: number; avgRevenue: number }> {
  const allSegments = allAccounts.reduce((acc, a) => {
    if (a.segment) acc.add(a.segment);
    return acc;
  }, new Set<string>());

  return Array.from(allSegments).map(seg => {
    const accounts = allAccounts.filter(a => a.segment === seg);
    const revenues = accounts.map(acc => {
      const m = metricsMap.get(acc.id);
      return m?.last12mRevenue ? parseFloat(m.last12mRevenue) : 0;
    });
    const avgRevenue = revenues.length > 0
      ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
      : 0;
    return {
      segment: seg,
      count: accounts.length,
      avgRevenue: Math.round(avgRevenue),
    };
  });
}

export function calculateAlignmentMetrics(
  segmentAccounts: Account[],
  gapsMap: Map<number, AccountCategoryGap[]>,
  productCatMap: Map<number, ProductCategory>
): {
  alignmentScore: number;
  accountsNearICP: number;
  revenueAtRisk: number;
  topGaps: Array<{ category: string; gapPct: number }>;
} {
  const flatGaps = segmentAccounts.flatMap(acc => gapsMap.get(acc.id) || []);

  const gapsByCategory: Record<string, number[]> = {};
  flatGaps.forEach(gap => {
    const cat = productCatMap.get(gap.categoryId);
    const catName = cat?.name || "Unknown";
    if (!gapsByCategory[catName]) gapsByCategory[catName] = [];
    gapsByCategory[catName].push(gap.gapPct ? parseFloat(gap.gapPct) : 0);
  });

  const topGaps = Object.entries(gapsByCategory)
    .map(([category, gaps]) => ({
      category,
      gapPct: gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0,
    }))
    .sort((a, b) => b.gapPct - a.gapPct)
    .slice(0, 3);

  const avgGap = flatGaps.length > 0
    ? flatGaps.reduce((sum, g) => sum + (g.gapPct ? parseFloat(g.gapPct) : 0), 0) / flatGaps.length
    : SCORING.DEFAULT_GAP_PERCENTAGE;
  const alignmentScore = Math.round(100 - avgGap);

  const accountAlignments = segmentAccounts.map(acc => {
    const gaps = gapsMap.get(acc.id) || [];
    if (gaps.length === 0) return { account: acc, isNearICP: false };
    const avgAccountGap = gaps.reduce((sum, g) => sum + (g.gapPct ? parseFloat(g.gapPct) : 0), 0) / gaps.length;
    return { account: acc, isNearICP: avgAccountGap <= SCORING.NEAR_ICP_THRESHOLD };
  });
  const accountsNearICP = accountAlignments.filter(a => a.isNearICP).length;

  const totalEstimatedOpportunity = flatGaps.reduce((sum, g) =>
    sum + (g.estimatedOpportunity ? parseFloat(g.estimatedOpportunity) : 0), 0);
  const revenueAtRisk = Math.round(totalEstimatedOpportunity);

  return { alignmentScore, accountsNearICP, revenueAtRisk, topGaps };
}

export function buildCategoryDataPointsMap(
  classACustomers: AccountWithMetrics[],
  gapsMap: Map<number, AccountCategoryGap[]>,
  productCatMap: Map<number, ProductCategory>
): Record<string, CategoryDataPoint[]> {
  const categoryDataPointsMap: Record<string, CategoryDataPoint[]> = {};

  for (const { account, metrics } of classACustomers) {
    const accountGaps = gapsMap.get(account.id) || [];
    const revenue = metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0;

    for (const gap of accountGaps) {
      const catInfo = productCatMap.get(gap.categoryId);
      const catName = catInfo?.name || "Unknown";
      if (!categoryDataPointsMap[catName]) {
        categoryDataPointsMap[catName] = [];
      }
      categoryDataPointsMap[catName].push({
        accountName: account.name,
        accountId: account.id,
        categoryPct: gap.actualPct ? parseFloat(gap.actualPct) : 0,
        revenue: revenue,
        isClassA: true,
      });
    }
  }

  return categoryDataPointsMap;
}

export function calculateTerritoryRanking(
  segmentAccounts: Account[],
  metricsMap: Map<number, AccountMetrics>
): Array<{ tm: string; avgAlignment: number; accountCount: number }> {
  const tmSet = segmentAccounts.reduce((acc, a) => {
    if (a.assignedTm) acc.add(a.assignedTm);
    return acc;
  }, new Set<string>());

  const tmList = Array.from(tmSet);
  const territoryRanking = tmList.slice(0, 4).map(tm => {
    const tmAccounts = segmentAccounts.filter(a => a.assignedTm === tm);
    const tmMetricsValues = tmAccounts.map(acc => {
      const m = metricsMap.get(acc.id);
      return m?.categoryPenetration ? parseFloat(m.categoryPenetration) : 50;
    });
    const avgAlignment = tmMetricsValues.length > 0
      ? Math.round(tmMetricsValues.reduce((a, b) => a + b, 0) / tmMetricsValues.length)
      : 50;
    return {
      tm,
      avgAlignment,
      accountCount: tmAccounts.length,
    };
  });

  territoryRanking.sort((a, b) => b.avgAlignment - a.avgAlignment);
  return territoryRanking;
}
