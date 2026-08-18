import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    billingPlan: v.string(), // "free" | "growth" | "enterprise"
    createdAt: v.number(),
  }),

  projects: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    settings: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  websites: defineTable({
    projectId: v.id("projects"),
    url: v.string(),
    status: v.string(), // "active" | "inactive"
    settings: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_url", ["projectId", "url"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    tokenIdentifier: v.string(),
    passwordHash: v.optional(v.string()),
    salt: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    orgId: v.optional(v.id("organizations")),
    role: v.optional(v.string()), // "owner" | "admin" | "manager" | "editor" | "viewer"
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_org", ["orgId"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  seoAudits: defineTable({
    userId: v.id("users"),
    url: v.string(),
    status: v.string(), // "pending" | "running" | "completed" | "failed"
    results: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  providers: defineTable({
    name: v.string(), // e.string "ollagraph", "openai"
    status: v.string(), // "active" | "inactive"
    priority: v.number(),
    authType: v.string(), // "apiKey" | "bearer" | "oauth" | "none"
    authDetails: v.optional(v.any()),
    limits: v.optional(v.any()),
    creditsUsed: v.number(),
    healthStatus: v.string(), // "healthy" | "unhealthy"
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"]),

  capabilities: defineTable({
    name: v.string(), // e.g. "website_crawl", "content_extraction", "ai_reasoning"
    providerId: v.id("providers"),
    status: v.string(), // "active" | "inactive"
    limits: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_name", ["name"]),

  features: defineTable({
    feature: v.string(),
    requiredCapability: v.string(),
    enabled: v.boolean(),
    dependencies: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_feature", ["feature"]),

  knowledgeGraphNodes: defineTable({
    type: v.string(), // "website" | "page" | "entity" | "topic" | "keyword" | "competitor" | "issue" | "opportunity" | "recommendation"
    key: v.string(), // unique key: URL, entity name, topic name, etc.
    properties: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_key", ["key"])
    .index("by_key_and_type", ["key", "type"]),

  knowledgeGraphEdges: defineTable({
    fromId: v.id("knowledgeGraphNodes"),
    toId: v.id("knowledgeGraphNodes"),
    type: v.string(), // "website_to_page", "page_to_topic", "page_to_entity", etc.
    properties: v.any(),
    createdAt: v.number(),
  })
    .index("by_from", ["fromId"])
    .index("by_to", ["toId"])
    .index("by_type", ["type"])
    .index("by_from_and_type", ["fromId", "type"])
    .index("by_from_and_to_and_type", ["fromId", "toId", "type"]),

  backgroundJobs: defineTable({
    type: v.string(), // "website_crawl", "seo_audit", "ai_roadmap", etc.
    status: v.string(), // "created" | "queued" | "running" | "completed" | "failed"
    priority: v.string(), // "critical" | "high" | "medium" | "low" | "background"
    args: v.any(),
    progress: v.number(), // 0 to 100
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    runCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"]),

  eventBusLogs: defineTable({
    eventType: v.string(), // e.g. "crawl_completed", "seo_issue_detected"
    payload: v.any(),
    publisher: v.string(),
    status: v.string(), // "published" | "processed" | "failed"
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_eventType", ["eventType"]),

  cacheEntries: defineTable({
    key: v.string(),
    value: v.any(),
    type: v.string(), // namespace/type
    expiresAt: v.number(),
  })
    .index("by_key", ["key"]),

  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    details: v.any(),
    ip: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  business_profiles: defineTable({
    projectId: v.optional(v.id("projects")),
    company: v.string(),
    industry: v.string(),
    subIndustry: v.string(),
    audience: v.string(),
    businessModel: v.string(),
    market: v.string(),
    brandPosition: v.string(),
    confidence: v.number(),
    evidence: v.string(),
    dnaRaw: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"]),

  business_categories: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_products: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_services: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_topics: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_entities: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_locations: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_languages: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_keywords: defineTable({
    profileId: v.id("business_profiles"),
    name: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_profile", ["profileId"]),

  business_history: defineTable({
    projectId: v.optional(v.id("projects")),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"]),

  // --- PHASE 2: CANDIDATE DISCOVERY ENGINE ---

  candidate_companies: defineTable({
    profileId: v.id("business_profiles"),
    domain: v.string(),
    company: v.string(),
    industry: v.string(),
    category: v.string(),
    rankScore: v.number(),
    status: v.string(), // e.g. "discovered", "verified", "rejected"
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_domain", ["domain"]),

  candidate_sources: defineTable({
    candidateId: v.id("candidate_companies"),
    provider: v.string(),
    evidence: v.string(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_candidate", ["candidateId"]),

  candidate_queries: defineTable({
    profileId: v.id("business_profiles"),
    query: v.string(),
    intent: v.string(),
    provider: v.string(),
    candidatesFound: v.number(),
    responseTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  candidate_history: defineTable({
    profileId: v.id("business_profiles"),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 3: BUSINESS CLASSIFICATION ENGINE ---

  business_classifications: defineTable({
    profileId: v.id("business_profiles"),
    confidence: v.number(),
    evidence: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  industry_profiles: defineTable({
    classificationId: v.id("business_classifications"),
    primaryIndustry: v.string(),
    secondaryIndustry: v.string(),
    subIndustry: v.string(),
    microIndustry: v.string(),
    industryCode: v.string(),
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_classification", ["classificationId"]),

  market_profiles: defineTable({
    classificationId: v.id("business_classifications"),
    scope: v.string(), // Local, Regional, National, International, Global
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_classification", ["classificationId"]),

  technology_profiles: defineTable({
    classificationId: v.id("business_classifications"),
    name: v.string(),
    category: v.string(), // CMS, Frontend Framework, etc.
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_classification", ["classificationId"]),

  brand_profiles: defineTable({
    classificationId: v.id("business_classifications"),
    position: v.string(), // Budget, Premium, Luxury, etc.
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_classification", ["classificationId"]),

  audience_profiles: defineTable({
    classificationId: v.id("business_classifications"),
    segment: v.string(), // B2B, B2C, Enterprise, etc.
    confidence: v.number(),
    evidence: v.string(),
  })
    .index("by_classification", ["classificationId"]),

  classification_history: defineTable({
    profileId: v.id("business_profiles"),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 4: COMPETITOR VERIFICATION ENGINE ---

  verified_competitors: defineTable({
    profileId: v.id("business_profiles"),
    company: v.string(),
    domain: v.string(),
    confidence: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  verification_history: defineTable({
    profileId: v.id("business_profiles"),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  verification_scores: defineTable({
    competitorId: v.id("verified_competitors"),
    industryScore: v.number(),
    productScore: v.number(),
    audienceScore: v.number(),
    semanticScore: v.number(),
    overallScore: v.number(),
  })
    .index("by_competitor", ["competitorId"]),

  verification_evidence: defineTable({
    competitorId: v.id("verified_competitors"),
    source: v.string(),
    snippet: v.string(),
    createdAt: v.number(),
  })
    .index("by_competitor", ["competitorId"]),

  rejected_candidates: defineTable({
    profileId: v.id("business_profiles"),
    company: v.string(),
    domain: v.string(),
    reason: v.string(), // "Directory", "Wikipedia", "Low Score"
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 5: COMPETITOR RANKING ENGINE ---

  competitor_rankings: defineTable({
    profileId: v.id("business_profiles"),
    competitorId: v.id("verified_competitors"),
    overallScore: v.number(),
    priority: v.string(), // "High", "Medium", "Low"
    tier: v.string(), // "Tier 1", "Tier 2", "Tier 3"
    confidence: v.number(),
    reason: v.string(),
    evidence: v.string(),
    businessSummary: v.string(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_competitor", ["competitorId"])
    .index("by_profile_tier", ["profileId", "tier"]),

  ranking_history: defineTable({
    profileId: v.id("business_profiles"),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  ranking_scores: defineTable({
    rankingId: v.id("competitor_rankings"),
    industrySimilarity: v.number(),
    productSimilarity: v.number(),
    audienceSimilarity: v.number(),
    semanticSimilarity: v.number(),
    brandPositionSimilarity: v.number(),
  })
    .index("by_ranking", ["rankingId"]),

  ranking_weights: defineTable({
    profileId: v.id("business_profiles"),
    industryWeight: v.number(),
    productWeight: v.number(),
    audienceWeight: v.number(),
    semanticWeight: v.number(),
    brandWeight: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 6: AUTOMATIC SEO COMPARISON ENGINE ---

  seo_comparisons: defineTable({
    profileId: v.id("business_profiles"),
    status: v.string(), // "pending", "completed", "failed"
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  comparison_results: defineTable({
    comparisonId: v.id("seo_comparisons"),
    competitorId: v.id("verified_competitors"),
    isWinner: v.boolean(),
    overallScore: v.number(),
    gapScore: v.number(),
    businessImpact: v.string(),
  })
    .index("by_comparison", ["comparisonId"]),

  comparison_metrics: defineTable({
    comparisonId: v.id("seo_comparisons"),
    competitorId: v.id("verified_competitors"),
    technicalScore: v.number(),
    performanceScore: v.number(),
    contentScore: v.number(),
    eeatScore: v.number(),
  })
    .index("by_comparison", ["comparisonId"]),

  comparison_reports: defineTable({
    comparisonId: v.id("seo_comparisons"),
    reportText: v.string(),
    createdAt: v.number(),
  })
    .index("by_comparison", ["comparisonId"]),

  comparison_history: defineTable({
    profileId: v.id("business_profiles"),
    action: v.string(),
    details: v.any(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 7: GAP & OPPORTUNITY ENGINE ---

  seo_gaps: defineTable({
    profileId: v.id("business_profiles"),
    type: v.string(), // "Technical", "Content", "EEAT", "Performance"
    description: v.string(),
    missingElements: v.array(v.string()), // e.g., ["Schema", "Keywords", "Entities"]
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  seo_opportunities: defineTable({
    profileId: v.id("business_profiles"),
    category: v.string(), // "Quick Win", "Content Opportunity", etc.
    description: v.string(),
    businessImpact: v.string(), // "High", "Medium", "Low"
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  priority_scores: defineTable({
    profileId: v.id("business_profiles"),
    opportunityId: v.id("seo_opportunities"),
    seoImpact: v.number(),
    difficulty: v.number(),
    priority: v.number(), // Computed priority
    estimatedTime: v.string(), // "1 Week", "1 Month"
  })
    .index("by_opportunity", ["opportunityId"]),

  recommendations: defineTable({
    profileId: v.id("business_profiles"),
    opportunityId: v.id("seo_opportunities"),
    action: v.string(),
    evidence: v.string(),
    expectedROI: v.string(),
  })
    .index("by_profile", ["profileId"])
    .index("by_opportunity", ["opportunityId"]),

  roadmaps: defineTable({
    profileId: v.id("business_profiles"),
    timeline: v.string(), // "Immediate", "30-Day", "60-Day", "90-Day", "6-Month", "12-Month"
    actionItems: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  // --- PHASE 8: BUSINESS INTELLIGENCE REPORT ENGINE ---

  business_reports: defineTable({
    profileId: v.id("business_profiles"),
    status: v.string(), // "pending", "completed", "failed"
    reportData: v.optional(v.any()), // massive json blob capturing all prior phases
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  executive_summaries: defineTable({
    reportId: v.id("business_reports"),
    summaryText: v.string(),
    createdAt: v.number(),
  })
    .index("by_report", ["reportId"]),

  report_exports: defineTable({
    reportId: v.id("business_reports"),
    format: v.string(), // "PDF", "JSON", "Markdown"
    exportedAt: v.number(),
  })
    .index("by_report", ["reportId"]),

  report_history: defineTable({
    profileId: v.id("business_profiles"),
    reportId: v.id("business_reports"),
    action: v.string(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),

  recommendation_history: defineTable({
    profileId: v.id("business_profiles"),
    actionTaken: v.string(),
    createdAt: v.number(),
  })
    .index("by_profile", ["profileId"]),
});







