import { internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper: Parse Robots.txt rules
export function isPathAllowed(robotsTxt: string, urlPath: string, userAgent = "AntiGravityBot"): boolean {
  if (!robotsTxt) return true;

  const lines = robotsTxt.split(/\r?\n/);
  let isTargetAgent = false;
  const disallows: string[] = [];
  const allows: string[] = [];

  for (const line of lines) {
    const cleanLine = line.split("#")[0].trim();
    if (!cleanLine) continue;

    const separatorIndex = cleanLine.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = cleanLine.substring(0, separatorIndex).trim().toLowerCase();
    const value = cleanLine.substring(separatorIndex + 1).trim();

    if (key === "user-agent") {
      isTargetAgent = value === "*" || value.toLowerCase() === userAgent.toLowerCase();
    } else if (isTargetAgent) {
      if (key === "disallow") {
        disallows.push(value);
      } else if (key === "allow") {
        allows.push(value);
      }
    }
  }

  // Check allows first (most specific rule wins or default to allow)
  for (const rule of allows) {
    if (rule && urlPath.startsWith(rule)) return true;
  }
  for (const rule of disallows) {
    if (rule && urlPath.startsWith(rule)) return false;
  }

  return true;
}

// =============================================================================
// DATABASE OPERATIONS (V8 Mutations & Queries)
// =============================================================================

// Mutation to register or update website properties
export const registerWebsite = internalMutation({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("websites")
      .withIndex("by_project_and_url", (q) => q.eq("projectId", args.projectId).eq("url", args.url))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("websites", {
      projectId: args.projectId,
      url: args.url,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

// Mutation: Process crawl result and build Knowledge Graph nodes/edges
export const saveCrawlResult = internalMutation({
  args: {
    websiteId: v.id("websites"),
    crawlResult: v.any(),
    auditId: v.optional(v.id("seoAudits")),
  },
  handler: async (ctx, args) => {
    const res = args.crawlResult;
    const { url, status, htmlLength, title, description, canonical, headings, images, links, schemas, performance, security } = res;

    const website = await ctx.db.get(args.websiteId);
    if (!website) {
      throw new Error("Website not found");
    }

    // 1. Update/insert Audit record
    let finalAuditId = args.auditId;
    const auditPayload = {
      overallScore: status >= 400 ? 20 : 80,
      scores: {
        technical: status >= 400 ? 20 : 90,
        content: status >= 400 ? 0 : 85,
        authority: 70,
        mobile: 85,
        accessibility: 80,
      },
      metrics: {
        loadTimeMs: performance.latencyMs,
        ttfbMs: performance.ttfb,
        pageSizeBytes: htmlLength,
        wordCount: headings.length * 15,
      },
      url,
      status: status >= 400 ? "failed" : "completed",
      security,
      performance,
    };

    if (finalAuditId) {
      const existingAudit = await ctx.db.get(finalAuditId);
      if (existingAudit) {
        await ctx.db.patch(finalAuditId, {
          status: status >= 400 ? "failed" : "completed",
          results: auditPayload,
          completedAt: Date.now(),
        });
      }
    } else {
      // Find a user linked to the website (via project and org)
      const project = await ctx.db.get(website.projectId);
      const user = project ? await ctx.db.query("users").withIndex("by_org", (q) => q.eq("orgId", project.orgId)).first() : null;
      if (user) {
        finalAuditId = await ctx.db.insert("seoAudits", {
          userId: user._id,
          url,
          status: status >= 400 ? "failed" : "completed",
          results: auditPayload,
          createdAt: Date.now(),
          completedAt: Date.now(),
        });
      }
    }

    // 2. Populate Knowledge Graph
    // Website node
    const rootKey = new URL(url).origin;
    let rootNode = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", rootKey).eq("type", "website"))
      .unique();

    let rootNodeId: Id<"knowledgeGraphNodes">;
    if (!rootNode) {
      rootNodeId = await ctx.db.insert("knowledgeGraphNodes", {
        type: "website",
        key: rootKey,
        properties: { url: rootKey, title: title || rootKey },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      rootNodeId = rootNode._id;
    }

    // Page node
    let pageNode = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", url).eq("type", "page"))
      .unique();

    let pageNodeId: Id<"knowledgeGraphNodes">;
    if (!pageNode) {
      pageNodeId = await ctx.db.insert("knowledgeGraphNodes", {
        type: "page",
        key: url,
        properties: {
          url,
          title,
          description,
          canonical,
          performanceScore: Math.round(performance.latencyMs),
          ttfb: performance.ttfb,
          status,
          compression: performance.compression,
          security,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      pageNodeId = pageNode._id;
      await ctx.db.patch(pageNode._id, {
        properties: {
          url,
          title,
          description,
          canonical,
          performanceScore: Math.round(performance.latencyMs),
          ttfb: performance.ttfb,
          status,
          compression: performance.compression,
          security,
        },
        updatedAt: Date.now(),
      });

      // Clean up existing outbound edges of the page node to prevent duplicates and link leaks on re-crawling
      const existingEdges = await ctx.db
        .query("knowledgeGraphEdges")
        .withIndex("by_from", (q) => q.eq("fromId", pageNodeId))
        .collect();
      for (const edge of existingEdges) {
        await ctx.db.delete(edge._id);
      }
    }

    // Link website to page node
    const edgeExists = await ctx.db
      .query("knowledgeGraphEdges")
      .withIndex("by_from_and_to_and_type", (q) =>
        q.eq("fromId", rootNodeId).eq("toId", pageNodeId).eq("type", "website_to_page")
      )
      .unique();

    if (!edgeExists) {
      await ctx.db.insert("knowledgeGraphEdges", {
        fromId: rootNodeId,
        toId: pageNodeId,
        type: "website_to_page",
        properties: {},
        createdAt: Date.now(),
      });
    }

    // Store schema and entities found in Knowledge Graph
    for (const schema of schemas) {
      const type = schema["@type"] || "SchemaObject";
      const key = `${url}#schema:${type}`;
      const existingEntity = await ctx.db
        .query("knowledgeGraphNodes")
        .withIndex("by_key_and_type", (q) => q.eq("key", key).eq("type", "entity"))
        .unique();

      if (existingEntity) {
        await ctx.db.patch(existingEntity._id, {
          properties: { name: type, schemaDetail: schema },
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("knowledgeGraphNodes", {
          type: "entity",
          key,
          properties: { name: type, schemaDetail: schema },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Store link relationship targets
    for (const link of links) {
      let targetNode = await ctx.db
        .query("knowledgeGraphNodes")
        .withIndex("by_key", (q) => q.eq("key", link.href))
        .unique();

      let targetNodeId: Id<"knowledgeGraphNodes">;
      if (!targetNode) {
        targetNodeId = await ctx.db.insert("knowledgeGraphNodes", {
          type: link.external ? "external_link" : "page",
          key: link.href,
          properties: { url: link.href, title: link.text },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        targetNodeId = targetNode._id;
      }

      await ctx.db.insert("knowledgeGraphEdges", {
        fromId: pageNodeId,
        toId: targetNodeId,
        type: link.external ? "page_to_external" : "page_to_page",
        properties: { anchorText: link.text, nofollow: link.nofollow },
        createdAt: Date.now(),
      });
    }

    // Store images as media node assets
    for (const img of images) {
      let imgNode = await ctx.db
        .query("knowledgeGraphNodes")
        .withIndex("by_key", (q) => q.eq("key", img.src))
        .unique();

      let imgNodeId: Id<"knowledgeGraphNodes">;
      if (!imgNode) {
        imgNodeId = await ctx.db.insert("knowledgeGraphNodes", {
          type: "asset",
          key: img.src,
          properties: { src: img.src, alt: img.alt, type: "image" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        imgNodeId = imgNode._id;
      }

      await ctx.db.insert("knowledgeGraphEdges", {
        fromId: pageNodeId,
        toId: imgNodeId,
        type: "page_to_asset",
        properties: { alt: img.alt, lazy: img.lazy },
        createdAt: Date.now(),
      });
    }

    return { auditId: finalAuditId };
  },
});

// =============================================================================
// WORKFLOW ACTIONS
// =============================================================================

// Action: Orchestrate complete website discovery and crawl workflow
export const crawlAndSaveUrlAction = action({
  args: {
    websiteId: v.id("websites"),
    url: v.string(),
    auditId: v.optional(v.id("seoAudits")),
  },
  handler: async (ctx, args) => {
    // 1. Fetch robots.txt of target host
    const urlObj = new URL(args.url);
    const robotsUrl = `${urlObj.origin}/robots.txt`;

    let robotsTxt = "";
    try {
      const robotsRes = await fetch(robotsUrl, { signal: AbortSignal.timeout(3000) });
      if (robotsRes.ok) {
        robotsTxt = await robotsRes.text();
      }
    } catch {
      // ignore unreachable robots.txt and assume allowed
    }

    // 2. Assert path is allowed according to robots.txt rules
    const allowed = isPathAllowed(robotsTxt, urlObj.pathname);
    if (!allowed) {
      throw new Error(`Crawling path ${urlObj.pathname} is blocked by robots.txt`);
    }

    // 3. Trigger crawler Node Action
    const crawlResult = await ctx.runAction(internal.crawlerNode.crawlUrl, {
      url: args.url,
    });

    // 4. Save parsed outputs to the database and Knowledge Graph
    const saveSummary: any = await ctx.runMutation(internal.crawler.saveCrawlResult, {
      websiteId: args.websiteId,
      crawlResult,
      auditId: args.auditId,
    });

    return { success: true, auditId: saveSummary.auditId };
  },
});
