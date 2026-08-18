import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const saveVerifiedCompetitor = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    company: v.string(),
    domain: v.string(),
    confidence: v.number(),
    reason: v.string(),
    industryScore: v.number(),
    productScore: v.number(),
    audienceScore: v.number(),
    semanticScore: v.number(),
    overallScore: v.number(),
    evidence: v.string(),
  },
  handler: async (ctx, args) => {
    const competitorId = await ctx.db.insert("verified_competitors", {
      profileId: args.profileId,
      company: args.company,
      domain: args.domain,
      confidence: args.confidence,
      reason: args.reason,
      createdAt: Date.now(),
    });

    await ctx.db.insert("verification_scores", {
      competitorId,
      industryScore: args.industryScore,
      productScore: args.productScore,
      audienceScore: args.audienceScore,
      semanticScore: args.semanticScore,
      overallScore: args.overallScore,
    });

    await ctx.db.insert("verification_evidence", {
      competitorId,
      source: "AI_Verification",
      snippet: args.evidence,
      createdAt: Date.now(),
    });

    await ctx.db.insert("verification_history", {
      profileId: args.profileId,
      action: "COMPETITOR_VERIFIED",
      details: { domain: args.domain, competitorId },
      createdAt: Date.now(),
    });

    return competitorId;
  },
});

export const saveRejectedCandidate = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    company: v.string(),
    domain: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const rejectedId = await ctx.db.insert("rejected_candidates", {
      profileId: args.profileId,
      company: args.company,
      domain: args.domain,
      reason: args.reason,
      createdAt: Date.now(),
    });

    await ctx.db.insert("verification_history", {
      profileId: args.profileId,
      action: "CANDIDATE_REJECTED",
      details: { domain: args.domain, rejectedId },
      createdAt: Date.now(),
    });

    return rejectedId;
  },
});

export const getVerifiedCompetitors = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verified_competitors")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
  },
});

export const getRejectedCandidates = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rejected_candidates")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
  },
});

export const getVerificationConfidence = query({
  args: { competitorId: v.id("verified_competitors") },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query("verification_scores")
      .withIndex("by_competitor", (q) => q.eq("competitorId", args.competitorId))
      .unique();
      
    const evidence = await ctx.db
      .query("verification_evidence")
      .withIndex("by_competitor", (q) => q.eq("competitorId", args.competitorId))
      .collect();
      
    return { scores, evidence };
  },
});
