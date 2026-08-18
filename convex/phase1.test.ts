/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Phase 1: End-to-End Infrastructure Integration Test", async () => {
  const t = convexTest(schema, modules);

  // ===========================================================================
  // 1. AUTHENTICATION & SCOPE TESTING
  // ===========================================================================
  const regResult = await t.mutation(api.auth.register, {
    email: "architect@antigravity.ai",
    password: "Password123!",
    name: "Architect",
  });

  expect(regResult).toBeDefined();
  expect(regResult.email).toBe("architect@antigravity.ai");
  expect(regResult.orgId).toBeDefined();
  expect(regResult.projectId).toBeDefined();
  expect(regResult.token).toBeDefined();

  const meResult = await t.query(api.auth.getMe, { token: regResult.token });
  expect(meResult).toBeDefined();
  expect(meResult?.role).toBe("owner");

  // ===========================================================================
  // 2. DYNAMIC PROVIDER DISCOVERY & REGISTRY
  // ===========================================================================
  const discResult = await t.mutation(internal.providerManager.autoDiscoverProviders, {});
  expect(discResult.success).toBe(true);

  const providersList = await t.query(api.providerManager.getProviderStatusList, {});
  expect(providersList.length).toBe(2); // ollagraph and openai mock providers

  const ollagraph = providersList.find((p: any) => p.name === "ollagraph");
  expect(ollagraph).toBeDefined();
  expect(ollagraph?.healthStatus).toBe("healthy");
  expect(ollagraph?.capabilities).toContain("website_crawl");

  // ===========================================================================
  // 3. PROVIDER ROUTING & EXECUTION ENGINE
  // ===========================================================================
  // Trigger a crawl execution via the Action (simulated fetch inside the adapter)
  const crawlResult = await t.action(api.providerManager.executeCapability, {
    capabilityName: "website_crawl",
    args: { url: "https://example.com" },
  });

  expect(crawlResult).toBeDefined();
  expect(crawlResult.url).toBe("https://example.com");
  expect(crawlResult.performanceScore).toBeGreaterThanOrEqual(30);

  // Execute AI reasoning request
  const aiResult = await t.action(api.providerManager.executeCapability, {
    capabilityName: "ai_reasoning",
    args: { prompt: "Explain technical SEO canonical guidelines." },
  });

  expect(aiResult).toBeDefined();
  expect(aiResult.success).toBe(true);
  expect(aiResult.text).toContain("canonical");

  // ===========================================================================
  // 4. KNOWLEDGE GRAPH NODES & RELATIONSHIPS
  // ===========================================================================
  const nodeAId = await t.mutation(internal.knowledgeGraph.upsertNode, {
    type: "website",
    key: "https://example.com",
    properties: { domain: "example.com" },
  });

  const nodeBId = await t.mutation(internal.knowledgeGraph.upsertNode, {
    type: "page",
    key: "https://example.com/blog",
    properties: { title: "Blog Page" },
  });

  expect(nodeAId).toBeDefined();
  expect(nodeBId).toBeDefined();

  const edgeId = await t.mutation(internal.knowledgeGraph.upsertEdge, {
    fromId: nodeAId,
    toId: nodeBId,
    type: "website_to_page",
  });
  expect(edgeId).toBeDefined();

  // Build AI context starting from root domain
  const context: any = await t.query(api.knowledgeGraph.buildAIContext, {
    websiteUrl: "https://example.com",
  });

  expect(context).toBeDefined();
  expect(context.website).toBeDefined();
  expect(context.pages.length).toBeGreaterThanOrEqual(1);

  // ===========================================================================
  // 5. CACHING STRATEGY
  // ===========================================================================
  await t.mutation(api.cache.setEntry, {
    key: "test_key",
    value: { data: "cached_data" },
    type: "seo",
    ttlSeconds: 60,
  });

  const cachedVal = await t.query(api.cache.getEntry, { key: "test_key" });
  expect(cachedVal).toEqual({ data: "cached_data" });

  await t.mutation(api.cache.invalidateEntry, { key: "test_key" });
  const invalidatedVal = await t.query(api.cache.getEntry, { key: "test_key" });
  expect(invalidatedVal).toBeNull();

  // ===========================================================================
  // 6. EVENT BUS LOGGING & SCHEDULING
  // ===========================================================================
  const eventId = await t.mutation(internal.eventBus.publishEvent, {
    eventType: "crawl_completed",
    payload: { url: "https://example.com" },
    publisher: "test_suite",
  });
  expect(eventId).toBeDefined();

  const logs = await t.query(api.eventBus.getEventLogsList, { limit: 10 });
  expect(logs.length).toBeGreaterThanOrEqual(1);
  expect(logs[0].eventType).toBe("crawl_completed");

  // ===========================================================================
  // 7. BACKGROUND JOBS QUEUEING
  // ===========================================================================
  const jobId = await t.mutation(internal.backgroundJobs.enqueueJob, {
    type: "website_crawl",
    args: { url: "https://example.com" },
    priority: "high",
  });
  expect(jobId).toBeDefined();

  const jobsList = await t.query(api.backgroundJobs.getJobsList, { status: "queued" });
  expect(jobsList.length).toBeGreaterThanOrEqual(1);
}, 60000);
