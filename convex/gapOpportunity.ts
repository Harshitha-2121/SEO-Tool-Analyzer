import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveGap = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    type: v.string(),
    description: v.string(),
    missingElements: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seo_gaps", {
      profileId: args.profileId,
      type: args.type,
      description: args.description,
      missingElements: args.missingElements,
      createdAt: Date.now(),
    });
  },
});

export const saveOpportunity = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    category: v.string(),
    description: v.string(),
    businessImpact: v.string(),
    seoImpact: v.number(),
    difficulty: v.number(),
    priority: v.number(),
    estimatedTime: v.string(),
    action: v.string(),
    evidence: v.string(),
    expectedROI: v.string(),
  },
  handler: async (ctx, args) => {
    const oppId = await ctx.db.insert("seo_opportunities", {
      profileId: args.profileId,
      category: args.category,
      description: args.description,
      businessImpact: args.businessImpact,
      createdAt: Date.now(),
    });

    await ctx.db.insert("priority_scores", {
      profileId: args.profileId,
      opportunityId: oppId,
      seoImpact: args.seoImpact,
      difficulty: args.difficulty,
      priority: args.priority,
      estimatedTime: args.estimatedTime,
    });

    await ctx.db.insert("recommendations", {
      profileId: args.profileId,
      opportunityId: oppId,
      action: args.action,
      evidence: args.evidence,
      expectedROI: args.expectedROI,
    });

    return oppId;
  },
});

export const saveRoadmap = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    timeline: v.string(),
    actionItems: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete existing roadmap for this timeline to replace it
    const existing = await ctx.db
      .query("roadmaps")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
      
    const existingTimeline = existing.find(r => r.timeline === args.timeline);
    if (existingTimeline) {
      await ctx.db.delete(existingTimeline._id);
    }

    return await ctx.db.insert("roadmaps", {
      profileId: args.profileId,
      timeline: args.timeline,
      actionItems: args.actionItems,
      createdAt: Date.now(),
    });
  },
});

export const getOpportunities = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const gaps = await ctx.db
      .query("seo_gaps")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    const opps = await ctx.db
      .query("seo_opportunities")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    const opportunities = await Promise.all(opps.map(async (o) => {
      const scores = await ctx.db
        .query("priority_scores")
        .withIndex("by_opportunity", (q) => q.eq("opportunityId", o._id))
        .unique();
      const rec = await ctx.db
        .query("recommendations")
        .withIndex("by_opportunity", (q) => q.eq("opportunityId", o._id))
        .unique();
      return { ...o, scores, recommendation: rec };
    }));

    return { gaps, opportunities: opportunities.sort((a,b) => (b.scores?.priority || 0) - (a.scores?.priority || 0)) };
  },
});

export const getRecommendations = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recommendations")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
  },
});

export const getRoadmap = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const roadmaps = await ctx.db
      .query("roadmaps")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
      
    // Sort logically
    const order = ["Immediate", "30-Day", "60-Day", "90-Day", "6-Month", "12-Month"];
    return roadmaps.sort((a, b) => order.indexOf(a.timeline) - order.indexOf(b.timeline));
  },
});
