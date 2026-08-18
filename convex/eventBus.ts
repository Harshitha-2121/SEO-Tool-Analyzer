import { internalMutation, internalAction, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// =============================================================================
// EVENT BUS SUBSCRIBER REGISTRY
// Maps Event Types to fully qualified Convex internal mutation/action references.
// =============================================================================
const subscriberRegistry: Record<string, string[]> = {
  "website_created": ["orchestrator:onWebsiteCreated"],
  "crawl_started": ["orchestrator:onCrawlStarted"],
  "crawl_completed": ["orchestrator:onCrawlCompleted", "backgroundJobs:onCrawlCompleted"],
  "seo_issue_detected": ["orchestrator:onIssueDetected"],
  "recommendation_generated": ["orchestrator:onRecommendationGenerated"],
};

// =============================================================================
// DATABASE INTERFACES
// =============================================================================

// Publisher Mutation: Inserts the event log and schedules subscriber dispatches
export const publishEvent = internalMutation({
  args: {
    eventType: v.string(), // e.g., "crawl_completed"
    payload: v.any(),
    publisher: v.string(), // Module name or User Id
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("eventBusLogs", {
      eventType: args.eventType,
      payload: args.payload,
      publisher: args.publisher,
      status: "published",
      createdAt: Date.now(),
    });

    const handlers = subscriberRegistry[args.eventType] || [];
    for (const handlerPath of handlers) {
      // Schedule each handler asynchronously so they do not block each other
      await ctx.scheduler.runAfter(0, internal.eventBus.dispatchSubscriber, {
        eventId,
        handlerPath,
        payload: args.payload,
      });
    }

    return eventId;
  },
});

// Asynchronous Dispatcher Action
export const dispatchSubscriber = internalAction({
  args: {
    eventId: v.id("eventBusLogs"),
    handlerPath: v.string(), // Format: "moduleName:functionName"
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const [moduleName, functionName] = args.handlerPath.split(":");
    let success = false;
    let errorMsg = "";

    try {
      // Direct call routing within the orchestrator or modules
      // Since it's a mock, we inspect the handler path and run internal mutations
      if (moduleName === "orchestrator") {
        await ctx.runMutation(internal.orchestrator.triggerSubscriberHook, {
          hookName: functionName,
          payload: args.payload,
        });
      } else if (moduleName === "backgroundJobs") {
        await ctx.runMutation(internal.backgroundJobs.triggerSubscriberHook, {
          hookName: functionName,
          payload: args.payload,
        });
      }
      success = true;
    } catch (e: any) {
      errorMsg = e.message || String(e);
    }

    // Update status in db
    await ctx.runMutation(internal.eventBus.updateDispatchStatus, {
      eventId: args.eventId,
      status: success ? "processed" : "failed",
      error: success ? undefined : `${args.handlerPath} failed: ${errorMsg}`,
    });
  },
});

// Update the event logs database status (Mutation needed by Action)
export const updateDispatchStatus = internalMutation({
  args: {
    eventId: v.id("eventBusLogs"),
    status: v.string(), // "processed" | "failed"
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.eventId);
    if (!log) return;

    await ctx.db.patch(args.eventId, {
      status: args.status,
      error: args.error,
    });

    if (args.status === "failed") {
      // Dead Letter Queue logging (can trigger alerts)
      await ctx.db.insert("auditLogs", {
        action: "dead_letter_queue",
        details: {
          eventId: args.eventId,
          error: args.error,
          message: "Event moved to Dead Letter Queue for manual audit.",
        },
        ip: "127.0.0.1",
        createdAt: Date.now(),
      });
    }
  },
});

// Retrieve event logs for auditing
export const getEventLogsList = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eventBusLogs")
      .order("desc")
      .take(args.limit || 50);
  },
});
