import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const generateFingerprint = action({
  args: {
    url: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<{success: boolean, profileId: any, dna: any}> => {
    // 1. Website Crawl / Content Extraction via Provider Manager
    const crawlResult = await ctx.runAction(api.providerManager.executeCapability, {
      capabilityName: "content_extraction",
      args: { url: args.url },
    });

    if (!crawlResult || !crawlResult.extractedText) {
      throw new Error("Failed to extract content from the target website.");
    }

    // 2. AI Normalization via Provider Manager
    const prompt = `Analyze the following website content and extract the Business Fingerprint.
You must return a JSON object with the following schema:
{
  "company": "Company Name or Unknown",
  "industry": "Primary Industry or Unknown",
  "subIndustry": "Sub Industry or Unknown",
  "audience": "Target Audience or Unknown",
  "businessModel": "B2B, B2C, SaaS, E-commerce, etc. or Unknown",
  "market": "Market or Unknown",
  "brandPosition": "Brand Position or Unknown",
  "confidence": 85, // 0-100
  "evidence": "Brief explanation of how this was determined",
  "categories": [{ "name": "Category", "confidence": 90, "evidence": "..." }],
  "products": [{ "name": "Product", "confidence": 90, "evidence": "..." }],
  "services": [{ "name": "Service", "confidence": 90, "evidence": "..." }],
  "topics": [{ "name": "Topic", "confidence": 90, "evidence": "..." }],
  "entities": [{ "name": "Entity", "confidence": 90, "evidence": "..." }],
  "locations": [{ "name": "Location", "confidence": 90, "evidence": "..." }],
  "languages": [{ "name": "Language", "confidence": 90, "evidence": "..." }],
  "keywords": [{ "name": "Keyword", "confidence": 90, "evidence": "..." }]
}
Never hallucinate. If unavailable, return 'Unknown' or an empty array.
Website Content:
${crawlResult.extractedText.slice(0, 10000)}
`;

    const aiResult = await ctx.runAction(api.providerManager.executeCapability, {
      capabilityName: "ai_reasoning",
      args: { prompt },
    });

    if (!aiResult || !aiResult.text) {
      throw new Error("Failed to generate Business DNA via AI.");
    }

    // 3. Parse JSON from AI response
    let dnaData;
    try {
      const jsonStr = aiResult.text.match(/\{[\s\S]*\}/)?.[0] || "{}";
      dnaData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse DNA JSON", aiResult.text);
      throw new Error("AI returned malformed Business DNA.");
    }

    // Default missing arrays
    const ensureArray = (arr: any) => Array.isArray(arr) ? arr : [];
    dnaData.categories = ensureArray(dnaData.categories);
    dnaData.products = ensureArray(dnaData.products);
    dnaData.services = ensureArray(dnaData.services);
    dnaData.topics = ensureArray(dnaData.topics);
    dnaData.entities = ensureArray(dnaData.entities);
    dnaData.locations = ensureArray(dnaData.locations);
    dnaData.languages = ensureArray(dnaData.languages);
    dnaData.keywords = ensureArray(dnaData.keywords);

    // 4. Store in Database
    const profileId = await ctx.runMutation(internal.businessFingerprint.saveFingerprintMutation as any, {
      projectId: args.projectId,
      dna: dnaData,
    });

    // 5. Update Knowledge Graph
    await ctx.runMutation(internal.businessFingerprint.updateKnowledgeGraph as any, {
      profileId,
      url: args.url,
      dna: dnaData,
    });

    return { success: true, profileId, dna: dnaData } as any;
  },
});
