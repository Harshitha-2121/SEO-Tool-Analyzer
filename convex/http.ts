import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

http.route({
  path: "/business/fingerprint",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/business/fingerprint",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url, projectId } = body;

      if (!url || !projectId) {
        return new Response(JSON.stringify({ error: "Missing url or projectId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const res = await ctx.runAction(api.businessFingerprintAction.generateFingerprint as any, {
        url,
        projectId: projectId as any,
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

const handleGetBusinessResource = async (ctx: any, request: Request, resourceType: string) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  // /business/{id}/{resource}
  const profileId = pathParts[2];
  
  if (!profileId) {
    return new Response(JSON.stringify({ error: "Missing profileId" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    let result;
    if (resourceType === "base") {
      result = await ctx.runQuery(api.businessFingerprint.getFingerprint, { profileId: profileId as any });
    } else if (resourceType === "dna") {
      result = await ctx.runQuery(api.businessFingerprint.getFingerprintDna, { profileId: profileId as any });
    } else {
      const tableName = `business_${resourceType}`;
      result = await ctx.runQuery(api.businessFingerprint.getFingerprintItems, { profileId: profileId as any, table: tableName });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

http.route({
  pathPrefix: "/business/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resource = pathParts[3] || "base"; // "dna", "entities", "topics", "products", "services"
    return handleGetBusinessResource(ctx, request, resource);
  }),
});

// ==========================================
// PHASE 2: CANDIDATE DISCOVERY
// ==========================================

http.route({
  path: "/competitors/discover",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/competitors/discover",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const res = await ctx.runAction(api.candidateDiscoveryAction.discoverCandidates as any, {
        profileId: profileId as any,
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // /competitors/candidates/{id} or /competitors/history/{id}
    const resource = pathParts[2];
    const profileId = pathParts[3];

    if (!profileId) {
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      let result;
      if (resource === "candidates") {
        result = await ctx.runQuery(api.candidateDiscovery.getCandidates as any, { profileId: profileId as any });
      } else if (resource === "history") {
        result = await ctx.runQuery(api.candidateDiscovery.getCandidateHistory as any, { profileId: profileId as any });
      } else {
        throw new Error("Invalid resource");
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

// ==========================================
// PHASE 3: BUSINESS CLASSIFICATION
// ==========================================

http.route({
  path: "/business/classify",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/business/classify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const res = await ctx.runAction(api.businessClassificationAction.classifyBusiness as any, {
        profileId: profileId as any,
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

http.route({
  pathPrefix: "/business/classification/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) {
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      const result = await ctx.runQuery(api.businessClassification.getClassification as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

// ==========================================
// PHASE 4: COMPETITOR VERIFICATION
// ==========================================

http.route({
  path: "/competitors/verify",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/competitors/verify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const res = await ctx.runAction(api.competitorVerificationAction.verifyCandidates as any, {
        profileId: profileId as any,
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/verified/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) {
      return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    try {
      const result = await ctx.runQuery(api.competitorVerification.getVerifiedCompetitors as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/rejected/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) {
      return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    try {
      const result = await ctx.runQuery(api.competitorVerification.getRejectedCandidates as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/confidence/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const competitorId = pathParts[3];

    if (!competitorId) {
      return new Response(JSON.stringify({ error: "Missing competitorId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    try {
      const result = await ctx.runQuery(api.competitorVerification.getVerificationConfidence as any, { competitorId: competitorId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// PHASE 5: COMPETITOR RANKING
// ==========================================

http.route({
  path: "/competitors/rank",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/competitors/rank",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const res = await ctx.runAction(api.competitorRankingAction.rankCompetitors as any, { profileId: profileId as any });
      return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/rankings/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.competitorRanking.getCompetitorRankings as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/top/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.competitorRanking.getTopCompetitors as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/competitors/tiers/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3];

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.competitorRanking.getCompetitorTiers as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// PHASE 6: AUTOMATIC SEO COMPARISON
// ==========================================

http.route({
  path: "/competitors/compare",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/competitors/compare",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const res = await ctx.runAction(api.seoComparisonAction.compareCompetitors as any, { profileId: profileId as any });
      return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/comparison/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[2]; // /comparison/{profileId}

    // Ignore report and history sub-routes here
    if (pathParts[2] === "report" || pathParts[2] === "history") {
      return new Response(null, { status: 404 });
    }

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.seoComparison.getLatestComparison as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// PHASE 7: GAP & OPPORTUNITY ENGINE
// ==========================================

http.route({
  path: "/opportunities/analyze",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/opportunities/analyze",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const res = await ctx.runAction(api.gapOpportunityAction.analyzeOpportunities as any, { profileId: profileId as any });
      return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/opportunities/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[2]; 

    if (pathParts[2] === "analyze") return new Response(null, { status: 404 });

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.gapOpportunity.getOpportunities as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/roadmap/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[2]; 

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.gapOpportunity.getRoadmap as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/recommendations/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[2]; 

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.gapOpportunity.getRecommendations as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// PHASE 8: BUSINESS INTELLIGENCE REPORT ENGINE
// ==========================================

http.route({
  path: "/report/business",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/report/business",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { profileId } = body;
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const res = await ctx.runAction(api.reportEngineAction.generateBusinessReport as any, { profileId: profileId as any });
      return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/report/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[2]; 

    if (pathParts[2] === "business" || pathParts[2] === "export" || pathParts[2] === "history" || pathParts[2] === "roadmap") {
      return new Response(null, { status: 404 });
    }

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.reportEngine.getLatestReport as any, { profileId: profileId as any });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  pathPrefix: "/report/export/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const profileId = pathParts[3]; 

    if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    try {
      const result = await ctx.runQuery(api.reportEngine.getLatestReport as any, { profileId: profileId as any });
      if (!result) return new Response(JSON.stringify({ error: "No report found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      
      // Simulate Export Markdown Payload
      const mdPayload = `# Executive Competitor Intelligence Report
Generated: ${new Date().toISOString()}

## Executive Summary
${result.executiveSummary}

## Data Payload
\`\`\`json
${JSON.stringify(result.report.reportData, null, 2)}
\`\`\`
`;
      
      return new Response(JSON.stringify({ markdown: mdPayload }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  path: "/api/competitor-intelligence",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/competitor-intelligence",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { user_url, competitors, projectId } = body;
      // Pass undefined if no projectId is sent
      const pid = projectId ? projectId : undefined;
      const res = await ctx.runAction(api.orchestrator.runPipeline as any, { url: user_url, projectId: pid, competitors: competitors || [] });
      return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// CRAWLER (Scanner)
// ==========================================

http.route({
  path: "/api/site-crawl",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/site-crawl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url } = body;
      
      if (!url) {
        return new Response(JSON.stringify({ success: false, error: "Missing url" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // Execute Ollagraph Mock Crawler (Crawler Node)
      const crawled = await ctx.runAction(internal.crawlerNode.crawlUrl as any, { url });
      
      const internalLinks = crawled.links?.filter((l: any) => !l.external).length || 0;
      const externalLinks = crawled.links?.filter((l: any) => l.external).length || 0;
      const missingAlt = crawled.images?.filter((i: any) => !i.alt).length || 0;

      const result = {
        success: true,
        sitemaps_found: 1,
        total_pages: 1,
        pages: [{ url: crawled.url, status_code: crawled.status, load_time_ms: crawled.performance?.latencyMs || 0 }],
        total_internal_links: internalLinks,
        total_external_links: externalLinks,
        orphan_pages: 0,
        ssl: crawled.security?.isHttps || false,
        has_title: !!crawled.title,
        has_description: !!crawled.description,
        has_canonical: !!crawled.canonical,
        has_schema: crawled.schemas && crawled.schemas.length > 0,
        total_images: crawled.images?.length || 0,
        missing_alt_count: missingAlt,
        load_time_ms: crawled.performance?.latencyMs || 0,
        auditId: "mock-audit-id"
      };

      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

// ==========================================
// AUTHENTICATION
// ==========================================

http.route({
  path: "/api/auth/login",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { email, password } = body;
      const res = await ctx.runMutation(api.auth.login as any, { email, password });
      return new Response(JSON.stringify({ success: true, ...res, user: { email: res.email, name: res.name, role: res.role } }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  path: "/api/auth/register",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { email, password, name } = body;
      const res = await ctx.runMutation(api.auth.register as any, { email, password, name });
      return new Response(JSON.stringify({ success: true, ...res, user: { email: res.email, name } }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

http.route({
  path: "/api/auth/forgot-password",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/auth/forgot-password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ success: true, reset_url: "http://localhost:8081/login.html?reset=mock-token-123" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }),
});

http.route({
  path: "/api/auth/reset-password",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/auth/reset-password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }),
});

http.route({
  path: "/api/auth/google",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Mock Google Login by directly registering/logging in a test google user
    try {
      let res;
      try {
        res = await ctx.runMutation(api.auth.login as any, { email: "google@crawlx.ai", password: "Google123!Password" });
      } catch (err) {
        res = await ctx.runMutation(api.auth.register as any, { email: "google@crawlx.ai", password: "Google123!Password", name: "Google User" });
      }
      const token = res.token;
      const email = encodeURIComponent("google@crawlx.ai");
      const name = encodeURIComponent("Google User");
      // Redirect to frontend callback
      return new Response(null, {
        status: 302,
        headers: {
          Location: `http://localhost:8081/auth-callback.html?token=${token}&email=${email}&name=${name}`
        }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }),
});

export default http;
