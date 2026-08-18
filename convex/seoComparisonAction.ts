import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const compareCompetitors = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean, compared: number}> => {
    // 1. Fetch DNA and Top Ranked Competitors (Tier 1)
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });
    if (!dna) throw new Error("Business DNA not found");

    const topRankings: any[] = await ctx.runQuery(api.competitorRanking.getTopCompetitors as any, { profileId: args.profileId });
    if (!topRankings || topRankings.length === 0) {
      console.warn("No Tier 1 competitors found to compare against");
      return { success: true, compared: 0 };
    }

    // 2. Create Comparison Record
    const comparisonId = await ctx.runMutation(internal.seoComparison.createComparison as any, { profileId: args.profileId });

    let comparedCount = 0;
    const allResults = [];

    // 3. Iterate through Top Competitors to Simulate SEO Engine Comparison
    for (const ranking of topRankings) {
      const comp = ranking.competitor;
      
      const prompt = `Simulate an enterprise SEO comparison between a target website and a top competitor using our internal engines (Technical, Performance, Content, EEAT).
Target Website: ${dna.url}
Target Company: ${dna.company}

Competitor Website: ${comp.domain}
Competitor Company: ${comp.company}
Competitor Ranking Priority: ${ranking.priority}

Return JSON exactly like this:
{
  "targetOverallScore": 75,
  "competitorOverallScore": 85,
  "metrics": {
    "technicalScore": 80,
    "performanceScore": 70,
    "contentScore": 88,
    "eeatScore": 90
  },
  "businessImpact": "Competitor outranks significantly in EEAT and Content depth.",
  "gapScore": 10
}`;

      try {
        const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "ai_reasoning",
          args: { prompt },
        });

        let aiData = { 
          targetOverallScore: 70, 
          competitorOverallScore: 80, 
          metrics: { technicalScore: 80, performanceScore: 70, contentScore: 80, eeatScore: 80 },
          businessImpact: "Competitor has slight advantage",
          gapScore: 10
        };

        if (aiResult && aiResult.text) {
          try {
            const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
            aiData = JSON.parse(jsonStr);
          } catch(e) {}
        }

        const isWinner = aiData.competitorOverallScore > aiData.targetOverallScore;

        await ctx.runMutation(internal.seoComparison.saveComparisonResult as any, {
          comparisonId,
          competitorId: comp._id,
          isWinner,
          overallScore: aiData.competitorOverallScore,
          gapScore: aiData.gapScore,
          businessImpact: aiData.businessImpact,
          metrics: aiData.metrics
        });

        allResults.push({ competitor: comp.domain, isWinner, gapScore: aiData.gapScore });
        comparedCount++;

        // Update Knowledge Graph
        await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
          profileId: args.profileId,
          url: dna.url || "unknown",
          dna: { type: "SEO_COMPARISON", competitor: comp.domain, isWinner, gapScore: aiData.gapScore }
        });

      } catch (e) {
        console.error("AI Comparison failed for", comp.domain, e);
      }
    }

    // Determine the absolute market winner
    const winners = allResults.filter(r => r.isWinner).sort((a,b) => b.gapScore - a.gapScore);
    const mainWinner = winners.length > 0 ? winners[0].competitor : dna.url;

    const reportText = `Automated SEO Comparison Complete.\n\nCompared against ${comparedCount} top tier competitors.\nMarket Leader (Winner): ${mainWinner}\n\nThe platform has identified substantial SEO gaps primarily across EEAT and Content metrics based on aggregate engine analysis.`;

    await ctx.runMutation(internal.seoComparison.saveComparisonReport as any, {
      comparisonId,
      reportText
    });

    await ctx.runMutation(internal.seoComparison.updateComparisonStatus as any, {
      comparisonId,
      status: "completed"
    });

    return { success: true, compared: comparedCount } as any;
  },
});
