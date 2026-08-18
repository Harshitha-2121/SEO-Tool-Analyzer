import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CACHE MANAGER CRUD OPERATIONS
// =============================================================================

// Query: Retrieve cache entry (respects expiration times)
export const getEntry = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("cacheEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      // Expired entry (Cannot delete inside query, client will handle fallback)
      return null;
    }

    return entry.value;
  },
});

// Mutation: Insert or overwrite cache entry
export const setEntry = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    type: v.string(), // "ai" | "seo" | "provider" | "report"
    ttlSeconds: v.number(), // Time to live in seconds
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cacheEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const expiresAt = Date.now() + args.ttlSeconds * 1000;

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        type: args.type,
        expiresAt,
      });
    } else {
      await ctx.db.insert("cacheEntries", {
        key: args.key,
        value: args.value,
        type: args.type,
        expiresAt,
      });
    }

    // Proactively clean up a few expired cache entries to prevent unbounded table growth
    const expired = await ctx.db
      .query("cacheEntries")
      .collect();
    
    let count = 0;
    for (const item of expired) {
      if (item.expiresAt < Date.now()) {
        await ctx.db.delete(item._id);
        count++;
        if (count >= 10) break; // limit batch deletion size
      }
    }
  },
});

// Mutation: Invalidate key directly
export const invalidateEntry = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cacheEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Mutation: Invalidate entire cache type namespace (e.g. invalidate all "ai" caches)
export const invalidateType = mutation({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("cacheEntries")
      .collect();

    for (const item of list) {
      if (item.type === args.type) {
        await ctx.db.delete(item._id);
      }
    }
  },
});
