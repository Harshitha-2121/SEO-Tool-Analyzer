/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiGateway from "../apiGateway.js";
import type * as auth from "../auth.js";
import type * as backgroundJobs from "../backgroundJobs.js";
import type * as businessClassification from "../businessClassification.js";
import type * as businessClassificationAction from "../businessClassificationAction.js";
import type * as businessFingerprint from "../businessFingerprint.js";
import type * as businessFingerprintAction from "../businessFingerprintAction.js";
import type * as cache from "../cache.js";
import type * as candidateDiscovery from "../candidateDiscovery.js";
import type * as candidateDiscoveryAction from "../candidateDiscoveryAction.js";
import type * as competitorRanking from "../competitorRanking.js";
import type * as competitorRankingAction from "../competitorRankingAction.js";
import type * as competitorVerification from "../competitorVerification.js";
import type * as competitorVerificationAction from "../competitorVerificationAction.js";
import type * as crawler from "../crawler.js";
import type * as crawlerNode from "../crawlerNode.js";
import type * as eventBus from "../eventBus.js";
import type * as gapOpportunity from "../gapOpportunity.js";
import type * as gapOpportunityAction from "../gapOpportunityAction.js";
import type * as http from "../http.js";
import type * as knowledgeGraph from "../knowledgeGraph.js";
import type * as orchestrator from "../orchestrator.js";
import type * as providerManager from "../providerManager.js";
import type * as reportEngine from "../reportEngine.js";
import type * as reportEngineAction from "../reportEngineAction.js";
import type * as seoAudits from "../seoAudits.js";
import type * as seoComparison from "../seoComparison.js";
import type * as seoComparisonAction from "../seoComparisonAction.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiGateway: typeof apiGateway;
  auth: typeof auth;
  backgroundJobs: typeof backgroundJobs;
  businessClassification: typeof businessClassification;
  businessClassificationAction: typeof businessClassificationAction;
  businessFingerprint: typeof businessFingerprint;
  businessFingerprintAction: typeof businessFingerprintAction;
  cache: typeof cache;
  candidateDiscovery: typeof candidateDiscovery;
  candidateDiscoveryAction: typeof candidateDiscoveryAction;
  competitorRanking: typeof competitorRanking;
  competitorRankingAction: typeof competitorRankingAction;
  competitorVerification: typeof competitorVerification;
  competitorVerificationAction: typeof competitorVerificationAction;
  crawler: typeof crawler;
  crawlerNode: typeof crawlerNode;
  eventBus: typeof eventBus;
  gapOpportunity: typeof gapOpportunity;
  gapOpportunityAction: typeof gapOpportunityAction;
  http: typeof http;
  knowledgeGraph: typeof knowledgeGraph;
  orchestrator: typeof orchestrator;
  providerManager: typeof providerManager;
  reportEngine: typeof reportEngine;
  reportEngineAction: typeof reportEngineAction;
  seoAudits: typeof seoAudits;
  seoComparison: typeof seoComparison;
  seoComparisonAction: typeof seoComparisonAction;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
