import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const analyzeOpportunities = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean}> => {
    // 1. Fetch Comparison Results to synthesize
    const comparison: any = await ctx.runQuery(api.seoComparison.getLatestComparison as any, { profileId: args.profileId });
    if (!comparison || !comparison.results) {
      console.warn("No SEO Comparison data found. Run Phase 6 first.");
      return { success: true };
    }

    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });

    // Format data for AI Prompt
    const resultsSummary = comparison.results.map((r: any) => 
      `Competitor: ${r.competitor?.domain} | Winner: ${r.isWinner ? 'Competitor' : 'Target'} | Gap Score: ${r.gapScore}`
    ).join("\n");

    const prompt = `You are a strategic SEO Gap & Opportunity Engine.
Target Website: ${dna.url}
Comparison Results:
${resultsSummary}

Generate a strategic action plan based on these verified comparisons. Do not invent fake gaps. Extract the most critical weaknesses.
Return JSON exactly like this:
{
  "gaps": [
    { "type": "Content", "description": "Lacking deep enterprise use-cases compared to competitor.", "missingElements": ["Case Studies", "Schema"] }
  ],
  "opportunities": [
    {
      "category": "Quick Win",
      "description": "Optimize existing category pages with structured data.",
      "businessImpact": "High",
      "seoImpact": 85,
      "difficulty": 20,
      "priority": 90,
      "estimatedTime": "1 Week",
      "action": "Inject Product Schema into all catalog pages.",
      "evidence": "Competitors are winning rich snippets.",
      "expectedROI": "Immediate CTR increase."
    }
  ],
  "roadmaps": [
    { "timeline": "Immediate", "actionItems": ["Fix Schema", "Update Meta tags"] },
    { "timeline": "30-Day", "actionItems": ["Publish 5 new comparison guides"] }
  ]
}`;

    try {
      const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
        capabilityName: "ai_reasoning",
        args: { prompt },
      });

      let aiData = { gaps: [], opportunities: [], roadmaps: [] };
      if (aiResult && aiResult.text) {
        try {
          const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
          aiData = JSON.parse(jsonStr);
        } catch(e) {}
      }

      // 1. Save Gaps
      for (const gap of (aiData.gaps || []) as any[]) {
        await ctx.runMutation(internal.gapOpportunity.saveGap as any, {
          profileId: args.profileId,
          type: gap.type || "Technical",
          description: gap.description || "Identified Gap",
          missingElements: gap.missingElements || [],
        });
      }

      // 2. Save Opportunities
      for (const opp of (aiData.opportunities || []) as any[]) {
        await ctx.runMutation(internal.gapOpportunity.saveOpportunity as any, {
          profileId: args.profileId,
          category: opp.category || "Opportunity",
          description: opp.description || "Do something",
          businessImpact: opp.businessImpact || "Medium",
          seoImpact: opp.seoImpact || 50,
          difficulty: opp.difficulty || 50,
          priority: opp.priority || 50,
          estimatedTime: opp.estimatedTime || "1 Month",
          action: opp.action || "Execute fix",
          evidence: opp.evidence || "Based on comparison data",
          expectedROI: opp.expectedROI || "Unknown",
        });
      }

      // 3. Save Roadmaps
      for (const rm of (aiData.roadmaps || []) as any[]) {
        await ctx.runMutation(internal.gapOpportunity.saveRoadmap as any, {
          profileId: args.profileId,
          timeline: rm.timeline || "30-Day",
          actionItems: rm.actionItems || [],
        });
      }

      // Update Knowledge Graph
      await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
        profileId: args.profileId,
        url: dna.url || "unknown",
        dna: { type: "SEO_ROADMAP_GENERATED", items: (aiData.roadmaps || []).length }
      });

      return { success: true };
    } catch (e) {
      console.error("Gap Analysis failed", e);
      throw new Error("Gap Analysis failed");
    }
  },
});
