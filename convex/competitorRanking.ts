import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getRankingWeights = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    let weights = await ctx.db
      .query("ranking_weights")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .unique();

    if (!weights) {
      // Default weights if none are configured
      weights = {
        _id: "default" as any,
        _creationTime: Date.now(),
        profileId: args.profileId,
        industryWeight: 0.3,
        productWeight: 0.3,
        audienceWeight: 0.2,
        semanticWeight: 0.1,
        brandWeight: 0.1,
        updatedAt: Date.now(),
      };
    }
    return weights;
  },
});

export const saveRankingWeightsMutation = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    industryWeight: v.number(),
    productWeight: v.number(),
    audienceWeight: v.number(),
    semanticWeight: v.number(),
    brandWeight: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ranking_weights")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        industryWeight: args.industryWeight,
        productWeight: args.productWeight,
        audienceWeight: args.audienceWeight,
        semanticWeight: args.semanticWeight,
        brandWeight: args.brandWeight,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("ranking_weights", {
        profileId: args.profileId,
        industryWeight: args.industryWeight,
        productWeight: args.productWeight,
        audienceWeight: args.audienceWeight,
        semanticWeight: args.semanticWeight,
        brandWeight: args.brandWeight,
        updatedAt: Date.now(),
      });
    }
  },
});

export const saveCompetitorRanking = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    competitorId: v.id("verified_competitors"),
    overallScore: v.number(),
    priority: v.string(),
    tier: v.string(),
    confidence: v.number(),
    reason: v.string(),
    evidence: v.string(),
    businessSummary: v.string(),
    scores: v.object({
      industrySimilarity: v.number(),
      productSimilarity: v.number(),
      audienceSimilarity: v.number(),
      semanticSimilarity: v.number(),
      brandPositionSimilarity: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Delete existing ranking for this competitor if it exists to allow re-ranking
    const existing = await ctx.db
      .query("competitor_rankings")
      .withIndex("by_competitor", (q) => q.eq("competitorId", args.competitorId))
      .unique();

    let rankingId: Id<"competitor_rankings">;
    
    if (existing) {
      rankingId = existing._id;
      await ctx.db.patch(rankingId, {
        overallScore: args.overallScore,
        priority: args.priority,
        tier: args.tier,
        confidence: args.confidence,
        reason: args.reason,
        evidence: args.evidence,
        businessSummary: args.businessSummary,
      });

      const existingScores = await ctx.db
        .query("ranking_scores")
        .withIndex("by_ranking", (q) => q.eq("rankingId", rankingId))
        .unique();
        
      if (existingScores) {
        await ctx.db.patch(existingScores._id, args.scores);
      } else {
        await ctx.db.insert("ranking_scores", { rankingId, ...args.scores });
      }

    } else {
      rankingId = await ctx.db.insert("competitor_rankings", {
        profileId: args.profileId,
        competitorId: args.competitorId,
        overallScore: args.overallScore,
        priority: args.priority,
        tier: args.tier,
        confidence: args.confidence,
        reason: args.reason,
        evidence: args.evidence,
        businessSummary: args.businessSummary,
        createdAt: Date.now(),
      });

      await ctx.db.insert("ranking_scores", {
        rankingId,
        ...args.scores,
      });
    }

    await ctx.db.insert("ranking_history", {
      profileId: args.profileId,
      action: "COMPETITOR_RANKED",
      details: { competitorId: args.competitorId, rankingId, tier: args.tier },
      createdAt: Date.now(),
    });

    return rankingId;
  },
});

export const getCompetitorRankings = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const rankings = await ctx.db
      .query("competitor_rankings")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
      
    // Join with verified competitors to get domain and company name
    const result = await Promise.all(rankings.map(async (r) => {
      const comp = await ctx.db.get(r.competitorId);
      const scores = await ctx.db.query("ranking_scores").withIndex("by_ranking", q => q.eq("rankingId", r._id)).unique();
      return {
        ...r,
        competitor: comp,
        scores,
      };
    }));
    
    // Sort descending by overall score
    return result.sort((a, b) => b.overallScore - a.overallScore);
  },
});

export const getTopCompetitors = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const rankings = await ctx.db
      .query("competitor_rankings")
      .withIndex("by_profile_tier", (q) => q.eq("profileId", args.profileId).eq("tier", "Tier 1"))
      .collect();
      
    const result = await Promise.all(rankings.map(async (r) => {
      const comp = await ctx.db.get(r.competitorId);
      return { ...r, competitor: comp };
    }));
    return result.sort((a, b) => b.overallScore - a.overallScore);
  },
});

export const getCompetitorTiers = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const rankings = await ctx.db
      .query("competitor_rankings")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
      
    const tiers = { "Tier 1": [] as any[], "Tier 2": [] as any[], "Tier 3": [] as any[] };
    
    for (const r of rankings) {
      const comp = await ctx.db.get(r.competitorId);
      const t = r.tier as keyof typeof tiers;
      if (tiers[t]) {
        tiers[t].push({ ...r, competitor: comp });
      }
    }
    
    tiers["Tier 1"].sort((a, b) => b.overallScore - a.overallScore);
    tiers["Tier 2"].sort((a, b) => b.overallScore - a.overallScore);
    tiers["Tier 3"].sort((a, b) => b.overallScore - a.overallScore);
    
    return tiers;
  },
});
