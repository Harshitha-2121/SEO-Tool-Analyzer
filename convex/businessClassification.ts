import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const saveClassificationMutation = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    confidence: v.number(),
    evidence: v.string(),
    industry: v.object({
      primaryIndustry: v.string(),
      secondaryIndustry: v.string(),
      subIndustry: v.string(),
      microIndustry: v.string(),
      industryCode: v.string(),
      confidence: v.number(),
      evidence: v.string(),
    }),
    market: v.object({
      scope: v.string(),
      confidence: v.number(),
      evidence: v.string(),
    }),
    brand: v.object({
      position: v.string(),
      confidence: v.number(),
      evidence: v.string(),
    }),
    technologies: v.array(v.object({
      name: v.string(),
      category: v.string(),
      confidence: v.number(),
      evidence: v.string(),
    })),
    audiences: v.array(v.object({
      segment: v.string(),
      confidence: v.number(),
      evidence: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Delete existing classification if exists
    const existing = await ctx.db
      .query("business_classifications")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .unique();

    let classId: Id<"business_classifications">;
    if (existing) {
      classId = existing._id;
      await ctx.db.patch(classId, {
        confidence: args.confidence,
        evidence: args.evidence,
        updatedAt: Date.now(),
      });
      // Delete old sub-profiles
      const collections = ["industry_profiles", "market_profiles", "technology_profiles", "brand_profiles", "audience_profiles"] as const;
      for (const col of collections) {
        const items = await ctx.db.query(col).withIndex("by_classification", q => q.eq("classificationId", classId)).collect();
        for (const item of items) {
          await ctx.db.delete(item._id);
        }
      }
    } else {
      classId = await ctx.db.insert("business_classifications", {
        profileId: args.profileId,
        confidence: args.confidence,
        evidence: args.evidence,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Insert new sub-profiles
    await ctx.db.insert("industry_profiles", {
      classificationId: classId,
      ...args.industry,
    });

    await ctx.db.insert("market_profiles", {
      classificationId: classId,
      ...args.market,
    });

    await ctx.db.insert("brand_profiles", {
      classificationId: classId,
      ...args.brand,
    });

    for (const tech of args.technologies) {
      await ctx.db.insert("technology_profiles", {
        classificationId: classId,
        ...tech,
      });
    }

    for (const aud of args.audiences) {
      await ctx.db.insert("audience_profiles", {
        classificationId: classId,
        ...aud,
      });
    }

    await ctx.db.insert("classification_history", {
      profileId: args.profileId,
      action: "CLASSIFICATION_GENERATED",
      details: { classId },
      createdAt: Date.now(),
    });

    return classId;
  },
});

export const getClassification = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const classification = await ctx.db
      .query("business_classifications")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .unique();

    if (!classification) return null;

    const classId = classification._id;

    const industry = await ctx.db.query("industry_profiles").withIndex("by_classification", q => q.eq("classificationId", classId)).unique();
    const market = await ctx.db.query("market_profiles").withIndex("by_classification", q => q.eq("classificationId", classId)).unique();
    const brand = await ctx.db.query("brand_profiles").withIndex("by_classification", q => q.eq("classificationId", classId)).unique();
    const technologies = await ctx.db.query("technology_profiles").withIndex("by_classification", q => q.eq("classificationId", classId)).collect();
    const audiences = await ctx.db.query("audience_profiles").withIndex("by_classification", q => q.eq("classificationId", classId)).collect();

    return {
      ...classification,
      industry,
      market,
      brand,
      technologies,
      audiences,
    };
  },
});
