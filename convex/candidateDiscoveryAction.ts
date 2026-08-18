import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const discoverCandidates = action({
  args: {
    profileId: v.id("business_profiles"),
    manualCompetitors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // 1. Fetch Business DNA
    const profile: any = await ctx.runQuery(api.businessFingerprint.getFingerprint as any, { profileId: args.profileId });
    if (!profile) throw new Error("Business profile not found");
    const dna: any = await ctx.runQuery(api.businessFingerprint.getFingerprintDna as any, { profileId: args.profileId });

    const baseDomain = profile.domain || "unknown.com";

    // 2. Generate Queries based on DNA
    const queries: { text: string; intent: string }[] = [];
    
    const ind = profile.industry || "";
    if (ind && ind !== "Unknown") queries.push({ text: `top ${ind} companies`, intent: "industry_leaders" });
    
    if (dna.products && dna.products.length > 0) {
      queries.push({ text: `alternatives to ${dna.products[0].name}`, intent: "product_alternatives" });
    }
    
    if (dna.categories && dna.categories.length > 0) {
      queries.push({ text: `best ${dna.categories[0].name} software`, intent: "category_search" });
    }

    if (queries.length === 0) {
      queries.push({ text: `companies like ${profile.company}`, intent: "similar_companies" });
    }

    const discoveredDomains = new Set<string>();
    discoveredDomains.add(baseDomain.replace(/^https?:\/\//, '').replace(/^www\./, ''));

    if (args.manualCompetitors) {
      for (const mc of args.manualCompetitors) {
        const domain = mc.replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (discoveredDomains.has(domain)) continue;
        discoveredDomains.add(domain);
        await ctx.runMutation(internal.candidateDiscovery.saveCandidateMutation as any, {
          profileId: args.profileId,
          domain: domain,
          company: domain.split('.')[0],
          industry: profile.industry || "Unknown",
          category: "manual",
          rankScore: 100,
          status: "discovered",
          provider: "manual",
          evidence: "Manually inputted competitor",
          reason: "User specified",
        });
      }
    }

    // 3. Multi-Source Discovery
    for (const q of queries) {
      const startTime = Date.now();
      let candidatesFound = 0;
      
      try {
        const serpResult = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "serp_search",
          args: { query: q.text },
        });

        if (serpResult && serpResult.results) {
          for (const res of serpResult.results) {
            try {
              const urlObj = new URL(res.link);
              let domain = urlObj.hostname.replace(/^www\./, '');
              
              // Basic deduplication
              if (discoveredDomains.has(domain) || domain.includes("wikipedia.org") || domain.includes("directory.")) {
                continue;
              }
              
              discoveredDomains.add(domain);
              candidatesFound++;

              // Rank score heuristic
              let rankScore = 50;
              if (res.title.toLowerCase().includes(ind.toLowerCase())) rankScore += 20;

              await ctx.runMutation(internal.candidateDiscovery.saveCandidateMutation as any, {
                profileId: args.profileId,
                domain: domain,
                company: res.title.split('-')[0].trim(),
                industry: profile.industry || "Unknown",
                category: q.intent,
                rankScore,
                status: "discovered",
                provider: "mock_serp",
                evidence: res.snippet,
                reason: `Found via query: ${q.text}`,
              });

              await ctx.runMutation(internal.candidateDiscovery.updateCandidateKnowledgeGraph as any, {
                profileId: args.profileId,
                candidateDomain: domain,
                candidateName: res.title,
                evidence: res.snippet,
              });
            } catch(e) {
              // skip invalid URL
            }
          }
        }
      } catch (err) {
        console.error(`Provider failed for query ${q.text}`, err);
        // Continue with other queries (Error Handling rule)
      }

      await ctx.runMutation(internal.candidateDiscovery.logQueryMutation as any, {
        profileId: args.profileId,
        query: q.text,
        intent: q.intent,
        provider: "mock_serp",
        candidatesFound,
        responseTime: Date.now() - startTime,
      });
    }

    return { success: true, message: "Discovery complete" };
  },
});
