import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const createComparison = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seo_comparisons", {
      profileId: args.profileId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateComparisonStatus = internalMutation({
  args: {
    comparisonId: v.id("seo_comparisons"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.comparisonId, { status: args.status });
  },
});

export const saveComparisonResult = internalMutation({
  args: {
    comparisonId: v.id("seo_comparisons"),
    competitorId: v.id("verified_competitors"),
    isWinner: v.boolean(),
    overallScore: v.number(),
    gapScore: v.number(),
    businessImpact: v.string(),
    metrics: v.object({
      technicalScore: v.number(),
      performanceScore: v.number(),
      contentScore: v.number(),
      eeatScore: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("comparison_results", {
      comparisonId: args.comparisonId,
      competitorId: args.competitorId,
      isWinner: args.isWinner,
      overallScore: args.overallScore,
      gapScore: args.gapScore,
      businessImpact: args.businessImpact,
    });

    await ctx.db.insert("comparison_metrics", {
      comparisonId: args.comparisonId,
      competitorId: args.competitorId,
      ...args.metrics,
    });
  },
});

export const saveComparisonReport = internalMutation({
  args: {
    comparisonId: v.id("seo_comparisons"),
    reportText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("comparison_reports", {
      comparisonId: args.comparisonId,
      reportText: args.reportText,
      createdAt: Date.now(),
    });
  },
});

export const getLatestComparison = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const comparisons = await ctx.db
      .query("seo_comparisons")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .collect();
      
    if (comparisons.length === 0) return null;
    const latest = comparisons[0];

    const results = await ctx.db
      .query("comparison_results")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", latest._id))
      .collect();

    const metrics = await ctx.db
      .query("comparison_metrics")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", latest._id))
      .collect();

    const reports = await ctx.db
      .query("comparison_reports")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", latest._id))
      .collect();

    // Attach competitor domain info
    const enrichedResults = await Promise.all(results.map(async r => {
      const comp = await ctx.db.get(r.competitorId);
      const m = metrics.find(mx => mx.competitorId === r.competitorId);
      return { ...r, competitor: comp, metrics: m };
    }));

    return {
      comparison: latest,
      results: enrichedResults,
      report: reports[0],
    };
  },
});
