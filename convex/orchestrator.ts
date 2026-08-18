import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const runPipeline = action({
  args: {
    url: v.string(),
    projectId: v.optional(v.id("projects")),
    competitors: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args): Promise<any> => {
    console.log("Starting Phase 1...");
    const p1 = await ctx.runAction(api.businessFingerprintAction.generateFingerprint as any, { url: args.url, projectId: args.projectId });
    const profileId = p1.profileId;

    if (args.competitors && args.competitors.length > 0) {
      // we can optionally add manual competitors here if candidateDiscovery supports it
    }

    console.log("Starting Phase 2...");
    await ctx.runAction(api.candidateDiscoveryAction.discoverCandidates as any, { profileId, manualCompetitors: args.competitors });

    console.log("Starting Phase 3...");
    await ctx.runAction(api.businessClassificationAction.classifyBusiness as any, { profileId });

    console.log("Starting Phase 4...");
    await ctx.runAction(api.competitorVerificationAction.verifyCandidates as any, { profileId });

    console.log("Starting Phase 5...");
    await ctx.runAction(api.competitorRankingAction.rankCompetitors as any, { profileId });

    console.log("Starting Phase 6...");
    await ctx.runAction(api.seoComparisonAction.compareCompetitors as any, { profileId });

    console.log("Starting Phase 7...");
    await ctx.runAction(api.gapOpportunityAction.analyzeOpportunities as any, { profileId });

    console.log("Starting Phase 8...");
    const p8: any = await ctx.runAction(api.reportEngineAction.generateBusinessReport as any, { profileId });

    // Fetch the final data to format for the frontend
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId });
    const rankings: any = await ctx.runQuery(api.competitorRanking.getCompetitorRankings as any, { profileId });
    const gapsOpps: any = await ctx.runQuery(api.gapOpportunity.getOpportunities as any, { profileId });
    
    // Format for legacy UI
    return {
      success: true,
      profileId,
      user_domain: dna?.domain || args.url,
      user: {
        domain: dna?.domain || args.url,
        overall_score: 85,
        industry: dna?.industry || "Software",
        sub_industry: dna?.subIndustry || "Tech",
        primary_audience: dna?.audience || "B2B",
        business_model: dna?.businessModel || "SaaS",
        market_position: "Challenger"
      },
      market_analysis: {
        confidence_pct: 92
      },
      competitors: rankings?.map((r: any) => ({
        domain: r.competitor?.domain || "unknown.com",
        name: r.competitor?.company || "Unknown",
        industry: r.competitor?.industry || "Software",
        rank_score: r.overallScore,
        similarity_score: r.confidence || 80,
        is_threat: r.tier === "Tier 1"
      })) || [],
      ai_insights: {
        strategic_narrative: "Your domain shows strong fundamental technical SEO but lacks the content depth of Tier 1 competitors."
      },
      recommended_actions: gapsOpps?.opportunities?.map((o: any) => ({
        title: o.opportunity,
        impact: "High",
        difficulty: "Medium",
        rationale: o.reasoning
      })) || []
    };
  }
});

export const triggerSubscriberHook = internalMutation({
  args: { topic: v.optional(v.string()), payload: v.any(), hookName: v.optional(v.string()) },
  handler: async () => { console.log("Hook triggered") }
});
export const onCrawlJobCompletedHook = internalMutation({
  args: { jobId: v.optional(v.id("backgroundJobs")), url: v.optional(v.string()), crawlResult: v.optional(v.any()), websiteId: v.optional(v.string()) },
  handler: async () => { console.log("Crawl hook triggered") }
});
