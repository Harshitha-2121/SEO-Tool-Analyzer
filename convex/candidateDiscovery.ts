import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const saveCandidateMutation = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    domain: v.string(),
    company: v.string(),
    industry: v.string(),
    category: v.string(),
    rankScore: v.number(),
    status: v.string(),
    provider: v.string(),
    evidence: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Basic deduplication: check if domain exists for this profile
    const existing = await ctx.db
      .query("candidate_companies")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .filter((q) => q.eq(q.field("domain"), args.domain))
      .unique();

    let candidateId;
    if (existing) {
      candidateId = existing._id;
      // Update score if new score is higher
      if (args.rankScore > existing.rankScore) {
        await ctx.db.patch(existing._id, { rankScore: args.rankScore });
      }
    } else {
      candidateId = await ctx.db.insert("candidate_companies", {
        profileId: args.profileId,
        domain: args.domain,
        company: args.company,
        industry: args.industry,
        category: args.category,
        rankScore: args.rankScore,
        status: args.status,
        createdAt: Date.now(),
      });
    }

    // Always log the source
    await ctx.db.insert("candidate_sources", {
      candidateId,
      provider: args.provider,
      evidence: args.evidence,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return candidateId;
  },
});

export const logQueryMutation = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    query: v.string(),
    intent: v.string(),
    provider: v.string(),
    candidatesFound: v.number(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("candidate_queries", {
      profileId: args.profileId,
      query: args.query,
      intent: args.intent,
      provider: args.provider,
      candidatesFound: args.candidatesFound,
      responseTime: args.responseTime,
      createdAt: Date.now(),
    });
  },
});

export const updateCandidateKnowledgeGraph = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    candidateDomain: v.string(),
    candidateName: v.string(),
    evidence: v.string(),
  },
  handler: async (ctx, args) => {
    // We cannot import knowledgeGraph directly like this without TS errors if it isn't an internal action/mutation, 
    // but knowledgeGraph.ts exports `upsertNodeMutation` etc. We should just call them.
    await ctx.db.insert("business_history", {
      projectId: undefined,
      action: "DISCOVERED_CANDIDATE",
      details: { candidateDomain: args.candidateDomain, candidateName: args.candidateName, evidence: args.evidence },
      createdAt: Date.now()
    });
  },
});

export const getCandidates = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("candidate_companies")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    const results = [];
    for (const c of candidates) {
      const sources = await ctx.db
        .query("candidate_sources")
        .withIndex("by_candidate", (q) => q.eq("candidateId", c._id))
        .collect();
      results.push({ ...c, sources });
    }
    
    return results.sort((a, b) => b.rankScore - a.rankScore);
  },
});

export const getCandidateHistory = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidate_queries")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .collect();
  },
});
