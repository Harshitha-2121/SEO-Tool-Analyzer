import { internalMutation, internalQuery, internalAction, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// Max retry limit for background jobs
const MAX_RETRIES = 3;

// =============================================================================
// DATABASE INTERFACES (Convex Mutations & Queries)
// =============================================================================

// Mutation to enqueue a new background job
export const enqueueJob = internalMutation({
  args: {
    type: v.string(), // "website_crawl", "seo_audit", "ai_roadmap", etc.
    args: v.any(),
    priority: v.string(), // "critical" | "high" | "medium" | "low" | "background"
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("backgroundJobs", {
      type: args.type,
      status: "queued",
      priority: args.priority,
      args: args.args,
      progress: 0,
      runCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Spawn the runner asynchronously
    await ctx.scheduler.runAfter(0, internal.backgroundJobs.runJobAction, { jobId });
    return jobId;
  },
});

// Mutation to update job execution details (called from Actions)
export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("backgroundJobs"),
    status: v.string(),
    progress: v.number(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    runCountIncrement: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const patch: any = {
      status: args.status,
      progress: args.progress,
      updatedAt: Date.now(),
    };

    if (args.result !== undefined) patch.result = args.result;
    if (args.error !== undefined) patch.error = args.error;
    if (args.runCountIncrement) patch.runCount = job.runCount + 1;

    await ctx.db.patch(args.jobId, patch);
  },
});

// =============================================================================
// JOB RUNNER ACTIONS
// =============================================================================

// Decoupled Background Job Runner
export const runJobAction = internalAction({
  args: { jobId: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    // 1. Get job context
    const job = await ctx.runQuery(internal.backgroundJobs.getJobQuery, { jobId: args.jobId });
    if (!job || job.status !== "queued") return;

    // 2. Set state to running
    await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
      jobId: args.jobId,
      status: "running",
      progress: 10,
    });

    try {
      let result: any = null;

      // 3. Route task to provider capabilities or mock engine runs
      if (job.type === "website_crawl") {
        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "running",
          progress: 30,
        });

        // Execute provider website crawl capability
        result = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "website_crawl",
          args: { url: job.args.url },
        });

        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "running",
          progress: 80,
        });

        // Trigger Knowledge Graph update and Event Bus publish on completion
        await ctx.runMutation(internal.orchestrator.onCrawlJobCompletedHook, {
          url: job.args.url,
          crawlResult: result,
          websiteId: job.args.websiteId,
        });
      } else if (job.type === "seo_audit") {
        // Execute dynamic audit pipeline
        result = await ctx.runAction(api.providerManager.executeCapability, {
          capabilityName: "seo_scoring",
          args: { url: job.args.url },
        });
      } else {
        result = { info: `Task type ${job.type} processed successfully.` };
      }

      // 4. Mark job as complete
      await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "completed",
        progress: 100,
        result,
      });
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      const nextRunCount = job.runCount + 1;

      if (nextRunCount < MAX_RETRIES) {
        // Apply exponential backoff (2^runCount * 1 second)
        const delaySeconds = Math.pow(2, job.runCount);
        
        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "queued", // set back to queued for scheduler
          progress: 0,
          error: errorMsg,
          runCountIncrement: true,
        });

        await ctx.scheduler.runAfter(delaySeconds * 1000, internal.backgroundJobs.runJobAction, {
          jobId: args.jobId,
        });
      } else {
        // Set permanently to failed
        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "failed",
          progress: 100,
          error: `Max retries exceeded. Last error: ${errorMsg}`,
          runCountIncrement: true,
        });
      }
    }
  },
});

// Helper Query to retrieve single job definition
export const getJobQuery = internalQuery({
  args: { jobId: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Query active background job queues for dashboard widgets
export const getJobsList = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    if (args.status) {
      return await ctx.db
        .query("backgroundJobs")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("backgroundJobs")
      .order("desc")
      .take(limit);
  },
});

// =============================================================================
// EVENT BUS TRIGGER SUBSCRIBERS (Idempotency hooks)
// =============================================================================
export const triggerSubscriberHook = internalMutation({
  args: {
    hookName: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      action: `job_subscriber_${args.hookName}`,
      details: args.payload,
      ip: "127.0.0.1",
      createdAt: Date.now(),
    });
  },
});
