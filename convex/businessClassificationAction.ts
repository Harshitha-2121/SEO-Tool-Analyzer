import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const classifyBusiness = action({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args): Promise<{success: boolean, classId: any}> => {
    // 1. Fetch Business DNA and Candidates
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });
    if (!dna) throw new Error("Business DNA not found");

    const candidates: any[] = await ctx.runQuery(api.candidateDiscovery.getCandidates as any, { profileId: args.profileId });

    // 2. Prepare Prompt
    const prompt = `Classify this business based on its DNA and competitors.
Company: ${dna.company}
DNA Industry: ${dna.industry}
DNA Audience: ${dna.audience}
Competitors: ${candidates.slice(0, 5).map(c => c.company + " (" + c.industry + ")").join(", ")}

Return JSON exactly like this:
{
  "confidence": 85,
  "evidence": "Analysis of DNA and competitors",
  "industry": { "primaryIndustry": "...", "secondaryIndustry": "...", "subIndustry": "...", "microIndustry": "...", "industryCode": "...", "confidence": 90, "evidence": "..." },
  "market": { "scope": "Global", "confidence": 90, "evidence": "..." },
  "brand": { "position": "Premium", "confidence": 90, "evidence": "..." },
  "technologies": [{ "name": "React", "category": "Frontend Framework", "confidence": 90, "evidence": "..." }],
  "audiences": [{ "segment": "B2B", "confidence": 90, "evidence": "..." }]
}`;

    // 3. Request Classification via AI Provider
    const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
      capabilityName: "ai_reasoning",
      args: { prompt },
    });

    if (!aiResult || !aiResult.text) {
      throw new Error("Failed to generate Business Classification via AI.");
    }

    // 4. Parse JSON
    let classData;
    try {
      const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
      classData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse classification JSON", aiResult.text);
      // Fallback object to satisfy the schema if parsing fails
      classData = {
        confidence: 50,
        evidence: "Fallback heuristic used",
        industry: { primaryIndustry: dna.industry || "Unknown", secondaryIndustry: "Unknown", subIndustry: "Unknown", microIndustry: "Unknown", industryCode: "Unknown", confidence: 50, evidence: "Fallback" },
        market: { scope: "Global", confidence: 50, evidence: "Fallback" },
        brand: { position: "Mid Market", confidence: 50, evidence: "Fallback" },
        technologies: [],
        audiences: [{ segment: dna.audience || "Unknown", confidence: 50, evidence: "Fallback" }]
      };
    }

    // Default missing arrays/objects
    const ensureObj = (obj: any, def: any) => (typeof obj === 'object' && obj !== null) ? obj : def;
    const ensureArray = (arr: any) => Array.isArray(arr) ? arr : [];

    classData.industry = ensureObj(classData.industry, { primaryIndustry: "Unknown", secondaryIndustry: "Unknown", subIndustry: "Unknown", microIndustry: "Unknown", industryCode: "Unknown", confidence: 0, evidence: "" });
    classData.market = ensureObj(classData.market, { scope: "Unknown", confidence: 0, evidence: "" });
    classData.brand = ensureObj(classData.brand, { position: "Unknown", confidence: 0, evidence: "" });
    classData.technologies = ensureArray(classData.technologies);
    classData.audiences = ensureArray(classData.audiences);

    // 5. Save Classification
    const classId = await ctx.runMutation(internal.businessClassification.saveClassificationMutation as any, {
      profileId: args.profileId,
      confidence: classData.confidence || 0,
      evidence: classData.evidence || "",
      industry: classData.industry,
      market: classData.market,
      brand: classData.brand,
      technologies: classData.technologies,
      audiences: classData.audiences,
    });

    // 6. Update Knowledge Graph (Assuming a general upsert function)
    await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
      profileId: args.profileId,
      url: dna.url || "unknown",
      dna: classData // Passing classification data to graph
    });

    return { success: true, classId: classId as any };
  },
});
