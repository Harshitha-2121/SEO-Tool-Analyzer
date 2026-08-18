"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import tls from "tls";
import dns from "dns";
import { parseHTML } from "linkedom";

// Helper: Get SSL Certificate properties
async function getSslDetails(urlStr: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      if (url.protocol !== "https:") {
        resolve({ isHttps: false, sslValid: false });
        return;
      }

      const socket = tls.connect(
        {
          host: url.hostname,
          port: 443,
          servername: url.hostname,
          rejectUnauthorized: false,
        },
        () => {
          const cert = socket.getPeerCertificate(true);
          const valid = socket.authorized;
          const validFrom = cert.valid_from;
          const validTo = cert.valid_to;
          const expiresAt = validTo ? new Date(validTo).getTime() : 0;

          resolve({
            isHttps: true,
            sslValid: valid,
            issuer: cert.issuer?.O || cert.issuer?.CN || "",
            validFrom,
            validTo,
            expiresAt,
            authorizedError: socket.authorizationError,
          });
          socket.end();
        }
      );

      socket.on("error", (err) => {
        resolve({ isHttps: true, sslValid: false, error: err.message });
      });
    } catch (err: any) {
      resolve({ isHttps: false, sslValid: false, error: err.message });
    }
  });
}

// Helper: Inspect HSTS and CSP headers
function inspectHeaders(headers: Headers) {
  const hsts = headers.get("strict-transport-security");
  const csp = headers.get("content-security-policy");
  const xFrame = headers.get("x-frame-options");
  const xContent = headers.get("x-content-type-options");

  return {
    hstsEnabled: !!hsts,
    hstsHeader: hsts || "",
    cspEnabled: !!csp,
    cspHeader: csp || "",
    xFrameHeader: xFrame || "",
    xContentTypeHeader: xContent || "",
  };
}

// Node Action: Crawl single url and return technical parsing details
export const crawlUrl = internalAction({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const urlStr = args.url;
    try {
      // 1. Perform DNS lookup checks
      const parsedUrl = new URL(urlStr);
      const ip = await new Promise<string>((resolve) => {
        dns.lookup(parsedUrl.hostname, (err, address) => {
          resolve(err ? "127.0.0.1" : address);
        });
      });

      // 2. Collect SSL Security properties
      const ssl = await getSslDetails(urlStr);

      // 3. Fetch Page Content & measure performance
      const startTime = Date.now();
      let html = "";
      let latencyMs = 0;
      let ttfb = 0;
      let response: Response = null as any;

      const api_key = process.env.OLLAGRAPH_API_KEY;

      if (api_key) {
        try {
          const res = await fetch("https://api.ollagraph.com/v1/scrape/llm-ready", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${api_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: urlStr }),
            signal: AbortSignal.timeout(10000)
          });
          if (res.ok) {
            const ollagraphRes: any = await res.json();
            html = ollagraphRes.content || "";
            ttfb = Date.now() - startTime;
            latencyMs = Date.now() - startTime;
            response = res;
          } else {
            console.warn(`Ollagraph API returned status ${res.status}`);
          }
        } catch (e) {
          console.warn("Ollagraph API failed, falling back to direct fetch:", e);
        }
      }

      if (!html) {
        const directRes = await fetch(urlStr, {
          headers: {
            "User-Agent": "AntiGravityBot/1.0",
            "Accept-Encoding": "gzip, deflate, br",
          },
          signal: AbortSignal.timeout(5000)
        });
        ttfb = Date.now() - startTime;
        html = await directRes.text();
        latencyMs = Date.now() - startTime;
        response = directRes;
      }

      // 4. Inspect HTTP headers
      const securityHeaders = inspectHeaders(response.headers);
      const compression = response.headers.get("content-encoding") || "none";

      // 5. Parse DOM using linkedom
      const { document } = parseHTML(html);

      // Title & Description
      const title = document.querySelector("title")?.textContent?.trim() || "";
      const descElement = document.querySelector('meta[name="description"]') ||
                          document.querySelector('meta[property="og:description"]');
      const description = descElement?.getAttribute("content")?.trim() || "";

      // Canonical link
      const canonicalElement = document.querySelector('link[rel="canonical"]');
      const canonical = canonicalElement?.getAttribute("href")?.trim() || "";

      // Indexing directives
      const robotsMeta = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
      const isNoindex = robotsMeta.toLowerCase().includes("noindex");
      const isNofollow = robotsMeta.toLowerCase().includes("nofollow");

      // Headings extraction
      const headings: { tag: string; text: string }[] = [];
      const headingTags = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      headingTags.forEach((node: any) => {
        headings.push({
          tag: node.tagName.toLowerCase(),
          text: node.textContent?.trim() || "",
        });
      });

      // Media Asset extraction
      const images: { src: string; alt: string; lazy: boolean }[] = [];
      const imgTags = document.querySelectorAll("img");
      imgTags.forEach((node: any) => {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "";
        const loading = node.getAttribute("loading") || "";
        if (src) {
          images.push({
            src,
            alt,
            lazy: loading.toLowerCase() === "lazy",
          });
        }
      });

      // Links extraction
      const links: { href: string; text: string; nofollow: boolean; external: boolean }[] = [];
      const aTags = document.querySelectorAll("a");
      aTags.forEach((node: any) => {
        const href = node.getAttribute("href") || "";
        const text = node.textContent?.trim() || "";
        const rel = node.getAttribute("rel") || "";
        const nofollow = rel.toLowerCase().includes("nofollow");

        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
          let absoluteHref = href;
          try {
            absoluteHref = new URL(href, urlStr).toString();
          } catch {
            // keep raw link
          }

          const isExternal = !absoluteHref.includes(parsedUrl.hostname);
          links.push({
            href: absoluteHref,
            text,
            nofollow,
            external: isExternal,
          });
        }
      });

      // Structure Schema
      const schemas: string[] = [];
      const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
      schemaScripts.forEach((node: any) => {
        try {
          const content = node.textContent?.trim();
          if (content) {
            schemas.push(JSON.parse(content));
          }
        } catch {
          // ignore malformed JSON-LD in DOM parse stage
        }
      });

      return {
        url: urlStr,
        status: response.status,
        htmlLength: html.length,
        title,
        description,
        canonical,
        isNoindex,
        isNofollow,
        headings,
        images,
        links,
        schemas,
        ip,
        performance: {
          ttfb,
          latencyMs,
          compression,
        },
        performanceScore: Math.max(30, Math.round(100 - latencyMs / 10)),
        security: {
          ...ssl,
          ...securityHeaders,
        },
      };
    } catch (err: any) {
      // Detailed extraction error response
      return {
        url: urlStr,
        status: 500,
        htmlLength: 0,
        title: "",
        description: "",
        canonical: "",
        isNoindex: false,
        isNofollow: false,
        headings: [],
        images: [],
        links: [],
        schemas: [],
        ip: "127.0.0.1",
        performance: {
          ttfb: 0,
          latencyMs: 0,
          compression: "none",
        },
        performanceScore: 30,
        security: {
          isHttps: urlStr.startsWith("https://"),
          sslValid: false,
          error: err.message || String(err),
        },
      };
    }
  },
});
