import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const generateBusinessReport = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean, reportId: string}> => {
    // 1. Gather ALL data from Phase 1-7
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });
    if (!dna) throw new Error("Missing Business DNA");

    const classifications: any = await ctx.runQuery(api.businessClassification.getClassification as any, { profileId: args.profileId });
    const verified: any = await ctx.runQuery(api.competitorVerification.getVerifiedCompetitors as any, { profileId: args.profileId });
    const rankings: any = await ctx.runQuery(api.competitorRanking.getCompetitorRankings as any, { profileId: args.profileId });
    const comparison: any = await ctx.runQuery(api.seoComparison.getLatestComparison as any, { profileId: args.profileId });
    const gapsOpps: any = await ctx.runQuery(api.gapOpportunity.getOpportunities as any, { profileId: args.profileId });
    const roadmaps: any = await ctx.runQuery(api.gapOpportunity.getRoadmap as any, { profileId: args.profileId });

    // 2. Initialize Report record
    const reportId = await ctx.runMutation(internal.reportEngine.createReport as any, { profileId: args.profileId });

    // 3. Compile massive aggregated payload
    const aggregatedPayload = {
      timestamp: new Date().toISOString(),
      target: dna,
      businessClassification: classifications,
      competitorsVerifiedCount: verified.length,
      competitorRankings: rankings,
      seoComparisonMatrix: comparison,
      gaps: gapsOpps?.gaps,
      opportunities: gapsOpps?.opportunities,
      roadmap: roadmaps
    };

    // 4. Generate AI Executive Summary
    const prompt = `You are a Chief Marketing Officer. Synthesize the following enterprise competitor intelligence data into a highly strategic Executive Summary for the board of directors.
Target Company: ${dna.company} (${dna.url})
Verified Competitors Count: ${verified.length}
Primary Tier 1 Competitors: ${rankings?.filter((r: any)=>r.tier==="Tier 1").map((r: any)=>r.competitor?.company).join(", ")}
Identified Gaps: ${gapsOpps?.gaps?.map((g: any)=>g.type).join(", ")}

Write a professional 2-3 paragraph Executive Summary highlighting the main competitive risks, the key SEO weaknesses, and the strategic opportunities identified. Do not make anything up. Use only the provided context.`;

    let summaryText = "Executive summary generation failed.";
    try {
      const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
        capabilityName: "ai_reasoning",
        args: { prompt },
      });
      if (aiResult && aiResult.text) {
        summaryText = aiResult.text;
      }
    } catch (e) {
      console.error("AI Report generation failed", e);
    }

    // 5. Save the final report and update Knowledge Graph
    await ctx.runMutation(internal.reportEngine.saveReportData as any, {
      reportId,
      profileId: args.profileId,
      reportData: aggregatedPayload,
      summaryText
    });

    await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
      profileId: args.profileId,
      url: dna.url || "unknown",
      dna: { type: "EXECUTIVE_REPORT_GENERATED", summary: summaryText.substring(0, 50) + "..." }
    });

    return { success: true, reportId: reportId as string };
  },
});
