import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const verifyCandidates = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean, verified: number, rejected: number}> => {
    // 1. Fetch DNA, Classification, and Candidates
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });
    if (!dna) throw new Error("Business DNA not found");

    const classification: any = await ctx.runQuery(api.businessClassification.getClassification as any, { profileId: args.profileId });
    if (!classification) throw new Error("Business Classification not found");

    const candidates: any[] = await ctx.runQuery(api.candidateDiscovery.getCandidates as any, { profileId: args.profileId });

    let verifiedCount = 0;
    let rejectedCount = 0;

    // 2. Iterate through candidates
    for (const candidate of candidates) {
      const domain = candidate.domain.toLowerCase();
      
      // Auto-rejection rules
      if (domain.includes("wikipedia.org") || domain.includes("yelp.com") || domain.includes("directory") || domain.includes("yellowpages")) {
        await ctx.runMutation(internal.competitorVerification.saveRejectedCandidate as any, {
          profileId: args.profileId,
          company: candidate.company,
          domain: candidate.domain,
          reason: "Auto-rejected directory/wiki site",
        });
        rejectedCount++;
        continue;
      }
      
      if (domain === dna.url || domain.includes(dna.url) || (dna.url && dna.url.includes(domain))) {
        await ctx.runMutation(internal.competitorVerification.saveRejectedCandidate as any, {
          profileId: args.profileId,
          company: candidate.company,
          domain: candidate.domain,
          reason: "Internal link / Self-domain",
        });
        rejectedCount++;
        continue;
      }

      // Auto-verify manually added competitors
      if (candidate.category === "manual") {
        await ctx.runMutation(internal.competitorVerification.saveVerifiedCompetitor as any, {
          profileId: args.profileId,
          company: candidate.company,
          domain: candidate.domain,
          confidence: 100,
          reason: "Manually inputted competitor",
          industryScore: 100,
          productScore: 100,
          audienceScore: 100,
          semanticScore: 100,
          overallScore: 100,
          evidence: "User specified",
        });
        
        await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
          profileId: args.profileId,
          url: candidate.domain,
          dna: { company: candidate.company, industry: "Competitor" } 
        });

        verifiedCount++;
        continue;
      }

      // Prepare Prompt for Provider Manager
      const prompt = `You are a strict B2B/B2C competitor verification engine.
Source Company: ${dna.company} (${dna.url})
Source Industry: ${classification.industry?.primaryIndustry}
Source Audience: ${classification.audiences?.map((a:any) => a.segment).join(", ")}

Candidate Company: ${candidate.company} (${candidate.domain})
Candidate Source Context: ${candidate.sources?.[0]?.evidence || "N/A"}

Determine if Candidate is a TRUE competitor to the Source. 
Return JSON exactly like this:
{
  "isCompetitor": true,
  "confidence": 85,
  "reason": "Direct overlap in products and target audience",
  "evidence": "Candidate ranks for same transactional keywords",
  "scores": {
    "industryScore": 90,
    "productScore": 80,
    "audienceScore": 85,
    "semanticScore": 80,
    "overallScore": 84
  }
}`;

      try {
        const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "ai_reasoning",
          args: { prompt },
        });

        if (!aiResult || !aiResult.text) continue;

        const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
        const result = JSON.parse(jsonStr);

        if (result.isCompetitor && result.confidence >= 50) {
          await ctx.runMutation(internal.competitorVerification.saveVerifiedCompetitor as any, {
            profileId: args.profileId,
            company: candidate.company,
            domain: candidate.domain,
            confidence: result.confidence || 0,
            reason: result.reason || "AI Verified",
            industryScore: result.scores?.industryScore || 0,
            productScore: result.scores?.productScore || 0,
            audienceScore: result.scores?.audienceScore || 0,
            semanticScore: result.scores?.semanticScore || 0,
            overallScore: result.scores?.overallScore || 0,
            evidence: result.evidence || "",
          });
          
          // Update Graph
          await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
            profileId: args.profileId,
            url: dna.url || "unknown",
            dna: { type: "VERIFIED_COMPETITOR_OF", domain: candidate.domain }
          });
          
          verifiedCount++;
        } else {
          await ctx.runMutation(internal.competitorVerification.saveRejectedCandidate as any, {
            profileId: args.profileId,
            company: candidate.company,
            domain: candidate.domain,
            reason: result.reason || "Low similarity / Non-competitor",
          });
          rejectedCount++;
        }

      } catch (e) {
        console.error("AI Verification failed for", candidate.domain, e);
        // Fallback reject on failure
        await ctx.runMutation(internal.competitorVerification.saveRejectedCandidate as any, {
          profileId: args.profileId,
          company: candidate.company,
          domain: candidate.domain,
          reason: "Verification processing error",
        });
        rejectedCount++;
      }
    }

    return { success: true, verified: verifiedCount, rejected: rejectedCount } as any;
  },
});
