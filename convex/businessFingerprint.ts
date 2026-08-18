import { action, mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// BUSINESS FINGERPRINT ENGINE
// =============================================================================

export const saveFingerprintMutation = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    dna: v.any(),
  },
  handler: async (ctx, args) => {
    const { dna } = args;
    
    const profileId = await ctx.db.insert("business_profiles", {
      projectId: args.projectId,
      company: dna.company || "Unknown",
      industry: dna.industry || "Unknown",
      subIndustry: dna.subIndustry || "Unknown",
      audience: dna.audience || "Unknown",
      businessModel: dna.businessModel || "Unknown",
      market: dna.market || "Unknown",
      brandPosition: dna.brandPosition || "Unknown",
      confidence: dna.confidence || 0,
      evidence: dna.evidence || "",
      dnaRaw: dna,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const insertMany = async (table: string, items: any[]) => {
      for (const item of items) {
        await ctx.db.insert(table as any, {
          profileId,
          name: item.name || "Unknown",
          confidence: item.confidence || 0,
          evidence: item.evidence || "",
        });
      }
    };

    await insertMany("business_categories", dna.categories);
    await insertMany("business_products", dna.products);
    await insertMany("business_services", dna.services);
    await insertMany("business_topics", dna.topics);
    await insertMany("business_entities", dna.entities);
    await insertMany("business_locations", dna.locations);
    await insertMany("business_languages", dna.languages);
    await insertMany("business_keywords", dna.keywords);

    await ctx.db.insert("business_history", {
      projectId: args.projectId,
      action: "generated_fingerprint",
      details: { profileId },
      createdAt: Date.now(),
    });

    return profileId;
  },
});

export const updateKnowledgeGraph = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
    url: v.string(),
    dna: v.any(),
  },
  handler: async (ctx, args) => {
    // Example knowledge graph updates
    const companyName = args.dna.company || "Unknown";
    
    // Upsert company node
    let companyNode = await ctx.db.query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", q => q.eq("key", companyName).eq("type", "company"))
      .first();
      
    let companyNodeId;
    if (!companyNode) {
      companyNodeId = await ctx.db.insert("knowledgeGraphNodes", {
        type: "company",
        key: companyName,
        properties: { url: args.url, industry: args.dna.industry },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      companyNodeId = companyNode._id;
    }

    const addNodeAndEdge = async (type: string, name: string, edgeType: string) => {
      if (!name || name === "Unknown") return;
      let node = await ctx.db.query("knowledgeGraphNodes")
        .withIndex("by_key_and_type", q => q.eq("key", name).eq("type", type))
        .first();
        
      let nodeId;
      if (!node) {
        nodeId = await ctx.db.insert("knowledgeGraphNodes", {
          type,
          key: name,
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        nodeId = node._id;
      }
      
      await ctx.db.insert("knowledgeGraphEdges", {
        fromId: companyNodeId,
        toId: nodeId,
        type: edgeType,
        properties: { confidence: 100 },
        createdAt: Date.now()
      });
    };

    const industryStr = typeof args.dna.industry === "string" 
      ? args.dna.industry 
      : (args.dna.industry?.primaryIndustry || "Unknown");
    await addNodeAndEdge("industry", industryStr, "company_in_industry");
    
    if (args.dna.products) for (const p of args.dna.products) await addNodeAndEdge("product", p.name, "company_sells_product");
    if (args.dna.services) for (const s of args.dna.services) await addNodeAndEdge("service", s.name, "company_offers_service");
    if (args.dna.topics) for (const t of args.dna.topics) await addNodeAndEdge("topic", t.name, "company_discusses_topic");
    if (args.dna.entities) for (const e of args.dna.entities) await addNodeAndEdge("entity", e.name, "company_related_to_entity");
  }
});

// =============================================================================
// QUERIES FOR API EXPOSURE
// =============================================================================

export const getFingerprint = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  }
});

export const getFingerprintDna = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    return profile?.dnaRaw || null;
  }
});

export const getFingerprintItems = query({
  args: { profileId: v.id("business_profiles"), table: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query(args.table as any)
      .withIndex("by_profile", q => q.eq("profileId", args.profileId))
      .collect();
  }
});
