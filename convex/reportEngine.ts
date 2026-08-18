import { internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createReport = internalMutation({
  args: {
    profileId: v.id("business_profiles"),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("business_reports", {
      profileId: args.profileId,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("report_history", {
      profileId: args.profileId,
      reportId: reportId,
      action: "Report generation started",
      createdAt: Date.now(),
    });

    return reportId;
  },
});

export const saveReportData = internalMutation({
  args: {
    reportId: v.id("business_reports"),
    profileId: v.id("business_profiles"),
    reportData: v.any(),
    summaryText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      reportData: args.reportData,
      status: "completed",
    });

    await ctx.db.insert("executive_summaries", {
      reportId: args.reportId,
      summaryText: args.summaryText,
      createdAt: Date.now(),
    });

    await ctx.db.insert("report_history", {
      profileId: args.profileId,
      reportId: args.reportId,
      action: "Report generation completed",
      createdAt: Date.now(),
    });
  },
});

export const logExport = mutation({
  args: {
    reportId: v.id("business_reports"),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("report_exports", {
      reportId: args.reportId,
      format: args.format,
      exportedAt: Date.now(),
    });
  },
});

export const getLatestReport = query({
  args: { profileId: v.id("business_profiles") },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("business_reports")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .collect();

    if (reports.length === 0) return null;
    const latest = reports[0];

    const summaries = await ctx.db
      .query("executive_summaries")
      .withIndex("by_report", (q) => q.eq("reportId", latest._id))
      .collect();

    return {
      report: latest,
      executiveSummary: summaries[0]?.summaryText || "No summary generated.",
    };
  },
});
