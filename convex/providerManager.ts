import { internalQuery, internalMutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// PROVIDER ADAPTER INTERFACE
// =============================================================================
export interface ProviderAdapter {
  execute(ctx: any, capabilityName: string, args: any): Promise<any>;
  checkHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs: number }>;
}

// =============================================================================
// MOCK OLLAGRAPH ADAPTER (Crawl & Extractor Engine)
// Routes to crawlerNode action for real parsing and TLS properties check
// =============================================================================
class MockOllagraphAdapter implements ProviderAdapter {
  async execute(ctx: any, capabilityName: string, args: any): Promise<any> {
    const url = args.url;
    if (!url) throw new Error("URL is required");

    if (capabilityName === "website_crawl") {
      // Execute real Node crawler action
      return await ctx.runAction(internal.crawlerNode.crawlUrl, { url });
    }

    if (capabilityName === "content_extraction") {
      const crawled = await ctx.runAction(internal.crawlerNode.crawlUrl, { url });
      return {
        url,
        extractedText: `${crawled.title}\n${crawled.description}\n` + crawled.headings.map((h: any) => h.text).join("\n"),
        wordCount: crawled.headings.length * 12 + 10,
      };
    }

    throw new Error(`Ollagraph does not support capability: ${capabilityName}`);
  }

  async checkHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs: number }> {
    return { status: "healthy", latencyMs: 5 };
  }
}

// =============================================================================
// MOCK AI ADAPTER (Inference Engine)
// Utilizes local Ollama model (tinyllama) if available, falls back to structured responses
// =============================================================================
class MockAIAdapter implements ProviderAdapter {
  private ollamaUrl = "http://127.0.0.1:11434/api/generate";

  async getBestOllamaModel(): Promise<string> {
    try {
      const response = await fetch("http://127.0.0.1:11434/api/tags", {
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        const data: any = await response.json();
        const models = data.models || [];
        const names = models.map((m: any) => m.name);
        if (names.length > 0) {
          const llama3 = names.find((name: string) => name.toLowerCase().includes("llama3"));
          if (llama3) return llama3;
          return names[0];
        }
      }
    } catch {
      // Ollama not running or query failed
    }
    return "tinyllama:latest";
  }

  async execute(_ctx: any, capabilityName: string, args: any): Promise<any> {
    const prompt = args.prompt || "";
    if (!prompt) throw new Error("Prompt is required for AI reasoning");

    if (capabilityName === "ai_reasoning") {
      try {
        const model = await this.getBestOllamaModel();
        const response = await fetch(this.ollamaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            options: { temperature: 0.2 }
          }),
          signal: AbortSignal.timeout(2000)
        });

        if (response.ok) {
          const resJson = await response.json();
          return {
            text: resJson.response,
            success: true,
            provider: "local_ollama"
          };
        }
      } catch {
        // Fallback to static AI SEO heuristic rules
      }

      // Static fallback rules
      return {
        text: `Analysis summary for prompt: "${prompt.slice(0, 50)}..."
Heuristics Analysis: 
1. The site is optimized with structured data and logical canonical paths.
2. Heading order follows standard hierarchical rules.
3. Suggest adding more informational topics to capture broader keyword queries.`,
        success: true,
        provider: "mock_heuristics"
      };
    }

    if (capabilityName === "seo_scoring") {
      return {
        overall: 82,
        technical: 88,
        content: 78,
        authority: 80,
      };
    }

    if (capabilityName === "opportunity_discovery") {
      return {
        competitors: ["https://competitor-a.com", "https://competitor-b.com"],
        gaps: ["FAQ schema missing on blog", "Low keyword overlap in search intent"],
      };
    }

    throw new Error(`AI Provider does not support capability: ${capabilityName}`);
  }

  async checkHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs: number }> {
    return { status: "healthy", latencyMs: 15 };
  }
}

// =============================================================================
// MOCK SERP ADAPTER (Search Engine Engine)
// Simulates a Google Search API or similar service
// =============================================================================
class MockSerpAdapter implements ProviderAdapter {
  async execute(_ctx: any, capabilityName: string, args: any): Promise<any> {
    const query = args.query || "";
    if (!query) throw new Error("Query is required for SERP search");

    if (capabilityName === "serp_search") {
      // Simulate typical SERP results for competitor discovery
      const lowerQuery = query.toLowerCase();
      
      const mockResults = [
        { title: "Competitor A - Top Solution", link: "https://competitor-a.com", snippet: "The best solution for your industry." },
        { title: "Alternative B", link: "https://competitor-b.com/features", snippet: "Check out Alternative B for advanced features." },
        { title: "Industry Directory", link: "https://directory.example.com/top-10", snippet: "Top 10 companies in this space." },
        { title: "Competitor C Pricing", link: "https://competitor-c.com/pricing", snippet: "Affordable pricing for everyone." },
        { title: "Generic Wiki Page", link: "https://en.wikipedia.org/wiki/Industry", snippet: "Overview of the industry." }
      ];
      
      // Basic deterministic variation based on query length
      const resultsToReturn = mockResults.slice(0, 3 + (query.length % 3));

      return {
        results: resultsToReturn,
        success: true,
        provider: "mock_serp"
      };
    }

    throw new Error(`SERP Provider does not support capability: ${capabilityName}`);
  }

  async checkHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs: number }> {
    return { status: "healthy", latencyMs: 25 };
  }
}

// Registry instances of adapters mapping to provider names
const adapters: Record<string, ProviderAdapter> = {
  ollagraph: new MockOllagraphAdapter(),
  openai: new MockAIAdapter(),
  serp: new MockSerpAdapter(),
};

// =============================================================================
// DATABASE INTERFACES (Convex Mutations & Queries)
// =============================================================================

// Mutation to register or update active provider registry
export const registerProvider = internalMutation({
  args: {
    name: v.string(),
    status: v.string(),
    priority: v.number(),
    authType: v.string(),
    authDetails: v.any(),
    limits: v.any(),
    healthStatus: v.string(),
    latencyMs: v.number(),
    capabilitiesList: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("providers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    let providerId: Id<"providers">;
    if (existing) {
      providerId = existing._id;
      await ctx.db.patch(existing._id, {
        status: args.status,
        priority: args.priority,
        authType: args.authType,
        authDetails: args.authDetails,
        limits: args.limits,
        healthStatus: args.healthStatus,
        latencyMs: args.latencyMs,
      });
    } else {
      providerId = await ctx.db.insert("providers", {
        name: args.name,
        status: args.status,
        priority: args.priority,
        authType: args.authType,
        authDetails: args.authDetails,
        limits: args.limits,
        creditsUsed: 0,
        healthStatus: args.healthStatus,
        latencyMs: args.latencyMs,
        createdAt: Date.now(),
      });
    }

    // Update capabilities
    const existingCaps = await ctx.db
      .query("capabilities")
      .withIndex("by_provider", (q) => q.eq("providerId", providerId))
      .collect();

    for (const cap of existingCaps) {
      await ctx.db.delete(cap._id);
    }

    for (const capName of args.capabilitiesList) {
      await ctx.db.insert("capabilities", {
        name: capName,
        providerId: providerId,
        status: "active",
        createdAt: Date.now(),
      });
    }

    return providerId;
  },
});

// Query to get status of all registered providers
export const getProviderStatusList = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("providers").collect();
    const result = [];
    for (const provider of list) {
      const caps = await ctx.db
        .query("capabilities")
        .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
        .collect();
      result.push({
        ...provider,
        capabilities: caps.map((c) => c.name),
      });
    }
    return result;
  },
});

// Query to route a request and select the best provider based on capability
export const routeProvider = internalQuery({
  args: { capabilityName: v.string() },
  handler: async (ctx, args) => {
    // 1. Get all capabilities matching the requested capability name
    const caps = await ctx.db
      .query("capabilities")
      .withIndex("by_name", (q) => q.eq("name", args.capabilityName))
      .collect();

    if (caps.length === 0) return null;

    const availableProviders = [];
    for (const cap of caps) {
      if (cap.status !== "active") continue;
      const provider = await ctx.db.get(cap.providerId);
      if (provider && provider.status === "active" && provider.healthStatus === "healthy") {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) return null;

    // 2. Sort by priority (higher value = higher priority)
    availableProviders.sort((a, b) => b.priority - a.priority);
    return availableProviders[0];
  },
});

// Mutation to record execution details, audit logs, and deduct credits
export const logExecution = internalMutation({
  args: {
    providerName: v.string(),
    capabilityName: v.string(),
    executionTimeMs: v.number(),
    status: v.string(), // "success" | "failed"
    creditsCharged: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_name", (q) => q.eq("name", args.providerName))
      .unique();

    if (provider) {
      await ctx.db.patch(provider._id, {
        creditsUsed: provider.creditsUsed + args.creditsCharged,
        latencyMs: args.executionTimeMs,
        healthStatus: args.status === "success" ? "healthy" : "unhealthy",
      });
    }
  },
});

// Public action to execute a provider capability dynamically
export const executeCapability = action({
  args: {
    capabilityName: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Route query to select best provider
    const provider = await ctx.runQuery(internal.providerManager.routeProvider, {
      capabilityName: args.capabilityName,
    });

    if (!provider) {
      throw new Error(`No active provider found for capability: ${args.capabilityName}`);
    }

    const adapter = adapters[provider.name];
    if (!adapter) {
      throw new Error(`No adapter implementation found for provider: ${provider.name}`);
    }

    // 2. Execute capability
    const startTime = Date.now();
    let status = "success";
    let errorMsg: string | undefined;
    let result: any;

    try {
      result = await adapter.execute(ctx, args.capabilityName, args.args);
    } catch (e: any) {
      status = "failed";
      errorMsg = e.message || String(e);
      throw e;
    } finally {
      const duration = Date.now() - startTime;
      await ctx.runMutation(internal.providerManager.logExecution, {
        providerName: provider.name,
        capabilityName: args.capabilityName,
        executionTimeMs: duration,
        status,
        creditsCharged: 1, // Default 1 credit per execution
        errorMessage: errorMsg,
      });
    }

    return result;
  },
});

// Action to run health checks across all adapters and update the database
export const runHealthCheck = action({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.runQuery(api.providerManager.getProviderStatusList);
    for (const item of list) {
      const adapter = adapters[item.name];
      if (adapter) {
        const check = await adapter.checkHealth();
        await ctx.runMutation(internal.providerManager.logExecution, {
          providerName: item.name,
          capabilityName: "health_check",
          executionTimeMs: check.latencyMs,
          status: check.status === "healthy" ? "success" : "failed",
          creditsCharged: 0,
        });
      }
    }
    return { success: true };
  },
});

// Trigger dynamic capability discovery and auto-register providers
export const autoDiscoverProviders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Register Ollagraph capabilities
    await ctx.db.insert("auditLogs", {
      action: "provider_discovery",
      details: { message: "Running capability discovery scanner..." },
      ip: "127.0.0.1",
      createdAt: Date.now(),
    });

    const ollagraphId = await ctx.db.insert("providers", {
      name: "ollagraph",
      status: "active",
      priority: 10,
      authType: "apiKey",
      authDetails: { key: "placeholder_key" },
      creditsUsed: 0,
      healthStatus: "healthy",
      latencyMs: 120,
      createdAt: Date.now(),
    });

    const ollagraphCapabilities = [
      "website_crawl",
      "content_extraction",
      "ocr",
      "performance_analysis",
      "security_analysis",
      "browser_rendering",
    ];

    for (const name of ollagraphCapabilities) {
      await ctx.db.insert("capabilities", {
        name,
        providerId: ollagraphId,
        status: "active",
        createdAt: Date.now(),
      });
    }

    // 2. Register AI Provider capabilities
    const aiId = await ctx.db.insert("providers", {
      name: "openai",
      status: "active",
      priority: 9,
      authType: "bearer",
      authDetails: { token: "placeholder_token" },
      creditsUsed: 0,
      healthStatus: "healthy",
      latencyMs: 250,
      createdAt: Date.now(),
    });

    const aiCapabilities = [
      "ai_reasoning",
      "entity_extraction",
      "topic_detection",
      "seo_scoring",
      "opportunity_discovery",
    ];

    for (const name of aiCapabilities) {
      await ctx.db.insert("capabilities", {
        name,
        providerId: aiId,
        status: "active",
        createdAt: Date.now(),
      });
    }

    // Register active features mapping to capabilities
    const featuresMap = [
      { feature: "website_auditer", requiredCapability: "website_crawl", enabled: true },
      { feature: "seo_recommender", requiredCapability: "ai_reasoning", enabled: true },
      { feature: "topic_clusterer", requiredCapability: "topic_detection", enabled: true },
      { feature: "competitor_scanner", requiredCapability: "opportunity_discovery", enabled: true },
    ];

    for (const feat of featuresMap) {
      await ctx.db.insert("features", {
        feature: feat.feature,
        requiredCapability: feat.requiredCapability,
        enabled: feat.enabled,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
