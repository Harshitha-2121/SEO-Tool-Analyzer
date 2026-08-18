import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const rankCompetitors = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean, rankedCount: number}> => {
    // 1. Fetch Verified Competitors, DNA, and Classification
    const verifiedCompetitors: any[] = await ctx.runQuery(api.competitorVerification.getVerifiedCompetitors as any, { profileId: args.profileId });
    if (!verifiedCompetitors || verifiedCompetitors.length === 0) {
      console.warn("No verified competitors to rank");
      return { success: true, rankedCount: 0 };
    }

    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });
    const classification: any = await ctx.runQuery(api.businessClassification.getClassification as any, { profileId: args.profileId });
    const weights: any = await ctx.runQuery(api.competitorRanking.getRankingWeights as any, { profileId: args.profileId });

    let rankedCount = 0;

    // 2. Iterate and Rank
    for (const comp of verifiedCompetitors) {
      // Fetch the Phase 4 scores for this competitor
      const verificationData: any = await ctx.runQuery(api.competitorVerification.getVerificationConfidence as any, { competitorId: comp._id });
      const baseScores = verificationData?.scores || {};

      // Prepare Prompt for AI to generate qualitative business summary & reasoning
      const prompt = `Analyze this verified competitor and provide a qualitative business summary and confidence reasoning.
Source Company: ${dna?.company}
Source Industry: ${classification?.industry?.primaryIndustry}

Competitor Company: ${comp.company} (${comp.domain})
Verification Reason: ${comp.reason}

Return JSON exactly like this:
{
  "reason": "Clear market overlap in enterprise SaaS",
  "evidence": "Pricing pages directly compare against Source",
  "businessSummary": "A major enterprise competitor targeting the exact same demographic with similar cloud features.",
  "confidence": 95
}`;

      try {
        const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "ai_reasoning",
          args: { prompt },
        });

        let aiData = { reason: "Algorithmic match", evidence: "Scores generated", businessSummary: "Competitor", confidence: 80 };
        if (aiResult && aiResult.text) {
          try {
            const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
            aiData = JSON.parse(jsonStr);
          } catch(e) {}
        }

        // Apply Configurable Weights
        const indScore = baseScores.industryScore || 50;
        const prodScore = baseScores.productScore || 50;
        const audScore = baseScores.audienceScore || 50;
        const semScore = baseScores.semanticScore || 50;
        
        // Use brand score from somewhere or default
        const brandScore = 70;

        const wInd = weights.industryWeight || 0.3;
        const wProd = weights.productWeight || 0.3;
        const wAud = weights.audienceWeight || 0.2;
        const wSem = weights.semanticWeight || 0.1;
        const wBrand = weights.brandWeight || 0.1;

        const overallScore = Math.round(
          (indScore * wInd) + 
          (prodScore * wProd) + 
          (audScore * wAud) + 
          (semScore * wSem) + 
          (brandScore * wBrand)
        );

        let tier = "Tier 3";
        let priority = "Low";
        if (overallScore >= 85) { tier = "Tier 1"; priority = "High"; }
        else if (overallScore >= 70) { tier = "Tier 2"; priority = "Medium"; }

        // Save Ranking
        const rankingId = await ctx.runMutation(internal.competitorRanking.saveCompetitorRanking as any, {
          profileId: args.profileId,
          competitorId: comp._id,
          overallScore,
          priority,
          tier,
          confidence: aiData.confidence || overallScore,
          reason: aiData.reason || "Algorithmically Ranked",
          evidence: aiData.evidence || "Scoring matrix calculated",
          businessSummary: aiData.businessSummary || "Verified market competitor.",
          scores: {
            industrySimilarity: indScore,
            productSimilarity: prodScore,
            audienceSimilarity: audScore,
            semanticSimilarity: semScore,
            brandPositionSimilarity: brandScore,
          }
        });

        // Update Knowledge Graph
        await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
          profileId: args.profileId,
          url: dna?.url || "unknown",
          dna: { type: "RANKED_COMPETITOR", tier, domain: comp.domain }
        });

        rankedCount++;
      } catch (e) {
        console.error("AI Ranking failed for", comp.domain, e);
      }
    }

    return { success: true, rankedCount } as any;
  },
});
