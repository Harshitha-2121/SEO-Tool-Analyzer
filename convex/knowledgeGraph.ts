import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Public wrappers for external API calls
export const publicUpsertNode = mutation({
  args: {
    type: v.string(),
    key: v.string(),
    properties: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", args.key).eq("type", args.type))
      .unique();

    if (existing) {
      const mergedProps = {
        ...existing.properties,
        ...args.properties,
      };
      await ctx.db.patch(existing._id, {
        properties: mergedProps,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("knowledgeGraphNodes", {
        type: args.type,
        key: args.key,
        properties: args.properties,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const publicUpsertEdge = mutation({
  args: {
    fromId: v.id("knowledgeGraphNodes"),
    toId: v.id("knowledgeGraphNodes"),
    type: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_from_and_to_and_type", (q) =>
        q.eq("fromId", args.fromId).eq("toId", args.toId).eq("type", args.type)
      )
      .unique();

    if (existing) {
      if (args.properties) {
        await ctx.db.patch(existing._id, {
          properties: {
            ...existing.properties,
            ...args.properties,
          },
        });
      }
      return existing._id;
    } else {
      return await ctx.db.insert("knowledgeGraphEdges", {
        fromId: args.fromId,
        toId: args.toId,
        type: args.type,
        properties: args.properties || {},
        createdAt: Date.now(),
      });
    }
  },
});


// =============================================================================
// KNOWLEDGE GRAPH CORE MUTATIONS & QUERIES
// =============================================================================

// Safely insert or merge a node to avoid duplication
export const upsertNode = internalMutation({
  args: {
    type: v.string(), // "website" | "page" | "entity" | "topic" | "keyword" | "competitor" | "issue" | "opportunity" | "recommendation"
    key: v.string(), // unique identifier: URL, entity name, issue code, etc.
    properties: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", args.key).eq("type", args.type))
      .unique();

    if (existing) {
      const mergedProps = {
        ...existing.properties,
        ...args.properties,
      };
      await ctx.db.patch(existing._id, {
        properties: mergedProps,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("knowledgeGraphNodes", {
        type: args.type,
        key: args.key,
        properties: args.properties,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Safely create or update a relationship edge
export const upsertEdge = internalMutation({
  args: {
    fromId: v.id("knowledgeGraphNodes"),
    toId: v.id("knowledgeGraphNodes"),
    type: v.string(), // e.g. "page_to_topic", "page_to_issue"
    properties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_from_and_to_and_type", (q) =>
        q.eq("fromId", args.fromId).eq("toId", args.toId).eq("type", args.type)
      )
      .unique();

    if (existing) {
      if (args.properties) {
        await ctx.db.patch(existing._id, {
          properties: {
            ...existing.properties,
            ...args.properties,
          },
        });
      }
      return existing._id;
    } else {
      return await ctx.db.insert("knowledgeGraphEdges", {
        fromId: args.fromId,
        toId: args.toId,
        type: args.type,
        properties: args.properties || {},
        createdAt: Date.now(),
      });
    }
  },
});

// Retrieve a single node by type and key
export const getNode = query({
  args: {
    type: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", args.key).eq("type", args.type))
      .unique();
  },
});

// List outgoing edges and their targets for a specific node
export const getOutgoingRelationships = query({
  args: {
    nodeId: v.id("knowledgeGraphNodes"),
  },
  handler: async (ctx, args) => {
    const edges = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_from", (q) => q.eq("fromId", args.nodeId))
      .collect();

    const results = [];
    for (const edge of edges) {
      const target = await ctx.db.get(edge.toId);
      if (target) {
        results.push({
          relationship: edge.type,
          edgeProperties: edge.properties,
          node: target,
        });
      }
    }
    return results;
  },
});

// List incoming edges and their sources for a specific node
export const getIncomingRelationships = query({
  args: {
    nodeId: v.id("knowledgeGraphNodes"),
  },
  handler: async (ctx, args) => {
    const edges = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_to", (q) => q.eq("toId", args.nodeId))
      .collect();

    const results = [];
    for (const edge of edges) {
      const source = await ctx.db.get(edge.fromId);
      if (source) {
        results.push({
          relationship: edge.type,
          edgeProperties: edge.properties,
          node: source,
        });
      }
    }
    return results;
  },
});

// =============================================================================
// AI CONTEXT BUILDER
// Resolves the Knowledge Graph entities starting from a website root domain
// to build the detailed context payload for LLM analysis.
// =============================================================================
export const buildAIContext = query({
  args: {
    websiteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get root website node
    const websiteNode = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", args.websiteUrl).eq("type", "website"))
      .unique();

    if (!websiteNode) {
      return { error: `Root website node not found in Knowledge Graph: ${args.websiteUrl}` };
    }

    // 2. Fetch pages linked to this website
    const pages = [];
    const pageEdges = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_from_and_type", (q) => q.eq("fromId", websiteNode._id).eq("type", "website_to_page"))
      .collect();

    const entities: any[] = [];
    const topics: any[] = [];
    const issues: any[] = [];
    const recommendations: any[] = [];

    for (const edge of pageEdges) {
      const pageNode = await ctx.db.get(edge.toId);
      if (pageNode) {
        pages.push(pageNode);

        // Fetch entities associated with the page
        const itemEdges = await ctx.db
          .query("knowledgeGraphEdges")
          .withIndex("by_from", (q) => q.eq("fromId", pageNode._id))
          .collect();

        for (const itemEdge of itemEdges) {
          const target = await ctx.db.get(itemEdge.toId);
          if (target) {
            if (target.type === "entity") {
              entities.push(target);
            } else if (target.type === "topic") {
              topics.push(target);
            } else if (target.type === "issue") {
              issues.push(target);

              // Get recommendations linked to this issue
              const recEdges = await ctx.db
                .query("knowledgeGraphEdges")
                .withIndex("by_from_and_type", (q) => q.eq("fromId", target._id).eq("type", "issue_to_recommendation"))
                .collect();
              
              for (const recEdge of recEdges) {
                const recNode = await ctx.db.get(recEdge.toId);
                if (recNode) recommendations.push(recNode);
              }
            }
          }
        }
      }
    }

    // De-duplicate list items by key/id
    const uniqueEntities = Array.from(new Map(entities.map((item) => [item.key, item])).values());
    const uniqueTopics = Array.from(new Map(topics.map((item) => [item.key, item])).values());
    const uniqueIssues = Array.from(new Map(issues.map((item) => [item.key, item])).values());
    const uniqueRecommendations = Array.from(new Map(recommendations.map((item) => [item.key, item])).values());

    return {
      website: websiteNode,
      pages,
      entities: uniqueEntities,
      topics: uniqueTopics,
      issues: uniqueIssues,
      recommendations: uniqueRecommendations,
    };
  },
});
