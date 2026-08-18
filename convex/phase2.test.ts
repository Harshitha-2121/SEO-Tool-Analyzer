/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Phase 2: Website Crawler Integration Test", async () => {
  const t = convexTest(schema, modules);

  // 1. Setup Tenant Boundaries (User, Org, Project)
  const regResult = await t.mutation(api.auth.register, {
    email: "crawler-test@antigravity.ai",
    password: "Password123!",
    name: "Crawler Test",
  });

  expect(regResult).toBeDefined();

  // 2. Discover capabilities
  await t.mutation(internal.providerManager.autoDiscoverProviders, {});

  // 3. Register Website
  const websiteId = await t.mutation(internal.crawler.registerWebsite, {
    projectId: regResult.projectId,
    url: "https://example.com",
  });

  expect(websiteId).toBeDefined();

  // 4. Start an SEO Audit
  const auditId = await t.mutation(api.seoAudits.start, {
    token: regResult.token,
    url: "https://example.com",
  });

  expect(auditId).toBeDefined();

  // 5. Execute Crawl Workflow (routes through robots.txt parser, crawler node action, and saves results)
  const crawlSummary = await t.action(api.crawler.crawlAndSaveUrlAction, {
    websiteId,
    url: "https://example.com",
    auditId,
  });

  expect(crawlSummary.success).toBe(true);
  expect(crawlSummary.auditId).toBe(auditId);

  // 6. Verify audit outcomes are stored in database
  const auditRecord = await t.query(api.seoAudits.get, {
    token: regResult.token,
    auditId,
  });

  expect(auditRecord).toBeDefined();
  expect(auditRecord?.status).toBe("completed");
  expect(auditRecord?.results).toBeDefined();
  expect(auditRecord?.results.url).toBe("https://example.com");
  expect(auditRecord?.results.overallScore).toBeGreaterThanOrEqual(20);
  expect(auditRecord?.results.metrics.pageSizeBytes).toBeGreaterThan(0);
  expect(auditRecord?.results.security.isHttps).toBe(true);

  // 7. Verify Knowledge Graph nodes have been successfully populated
  const pageNode: any = await t.query(api.knowledgeGraph.buildAIContext, {
    websiteUrl: "https://example.com",
  });

  expect(pageNode).toBeDefined();
  expect(pageNode.error).toBeUndefined();
  expect(pageNode.website).toBeDefined();
  expect(pageNode.website.key).toBe("https://example.com");

  // Ensure internal page link edges got resolved in the Knowledge Graph by querying the database in test runner context
  await t.run(async (ctx) => {
    const nodes = await ctx.db.query("knowledgeGraphNodes").collect();
    const edges = await ctx.db.query("knowledgeGraphEdges").collect();

    const pageNodes = nodes.filter((n: any) => n.type === "page");
    expect(pageNodes.length).toBeGreaterThanOrEqual(1);

    const websiteToPageEdges = edges.filter((e: any) => e.type === "website_to_page");
    expect(websiteToPageEdges.length).toBeGreaterThanOrEqual(1);
  });
}, 60000); // 60s timeout for network fetches
