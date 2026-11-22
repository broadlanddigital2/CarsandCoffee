// Cars and Coffee UK website Worker.
// - Redirects the bare domain to www.
// - Builds the homepage from the database (see home.js), cached for 60 seconds, so changes in admin.carsandcoffee.uk go live within a minute.
//   If the database can't be reached it serves the last good copy, or the static public/index.html.
// - Everything else is served from ./public.
import { loadHome, renderHome } from "./home.js";
import { loadPage, renderLocation } from "./pages.js";
import { loadContent, renderContent, sitemap } from "./content.js";
import { handleAssist } from "./assist.js";
import { renderStandard, carsIndex } from "./standard.js";

const FRESH_SECONDS = 60;       // how long a rendered homepage is reused
const STALE_SECONDS = 86400;    // how long the last good copy is kept as a fallback

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === "carsandcoffee.uk") { url.hostname = "www.carsandcoffee.uk"; return Response.redirect(url.toString(), 301); }
    if ((url.pathname === "/" || url.pathname === "/index.html") && (request.method === "GET" || request.method === "HEAD")) {
      return homepage(request, env, ctx, url);
    }
    // Local hubs moved from /car-meets/<county>/<town> to /<county>/<town>
    const moved = url.pathname.match(/^\/car-meets\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/);
    if (moved) return Response.redirect(`${url.origin}/${moved[1]}${url.search}`, 301);
    if ((/^\/car-meets\/?$/.test(url.pathname) || /^\/(norfolk|suffolk|cambridgeshire|essex)(\/[a-z0-9-]+)?\/?$/.test(url.pathname)) && (request.method === "GET" || request.method === "HEAD")) {
      return contentPage(request, env, ctx, url);
    }
    if ((/^\/(events|news|guides|galleries|search)(\/[a-z0-9-]+(\.ics)?)?\/?$/.test(url.pathname) || url.pathname === "/cars" || /^\/directory(\/[a-z0-9-]+){0,2}\/?$/.test(url.pathname)) && (request.method === "GET" || request.method === "HEAD")) {
      return contentPage(request, env, ctx, url, true);
    }
    if (url.pathname.startsWith("/api/")) return handleAssist(request, env, url);
    if (url.pathname === "/sitemap.xml") {
      try { return new Response(await sitemap(), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } }); }
      catch { return env.ASSETS.fetch(request); }
    }
    // Any other one- or two-part address may be an editable page from the admin (legal pages, About, Contact, /cars/..., /go/...)
    if (/^\/[a-z0-9-]+(\/[a-z0-9-]+)?\/?$/.test(url.pathname) && !/^\/(homepage|partners|email)\//.test(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
      return contentPage(request, env, ctx, url, false, true);
    }
    return env.ASSETS.fetch(request);
  },
};

// Location and other content pages from site.pages, cached like the homepage.
async function contentPage(request, env, ctx, url, rich = false, maybe = false) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== url.pathname) return Response.redirect(url.origin + path + url.search, 301);
  if (path === "/directory" && url.search) {
    const out = await renderContent({ kind: "directory", params: Object.fromEntries(url.searchParams) });
    return withHeaders(new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } }), "NOCACHE");
  }
  if (path === "/search") {
    const out = await renderContent({ kind: "search", q: url.searchParams.get("q") || "" });
    return withHeaders(new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } }), "NOCACHE");
  }
  const cache = caches.default;
  const freshKey = new Request(`https://${url.hostname}/__page/fresh${path}`);
  const staleKey = new Request(`https://${url.hostname}/__page/stale${path}`);
  const hit = await cache.match(freshKey);
  if (hit) return withHeaders(hit, "HIT");
  try {
    let res;
    if (rich) {
      const what = await loadContent(path);
      const out = what && (await renderContent(what));
      if (!out) return env.ASSETS.fetch(new Request(new URL("/__missing__", url), request));
      if (out.redirect) return Response.redirect(url.origin + out.redirect, 301);
      res = typeof out === "string" ? new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } })
        : new Response(out.ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${out.filename}"` } });
    } else {
      const page = await loadPage(path);
      if (!page) return maybe ? env.ASSETS.fetch(request) : env.ASSETS.fetch(new Request(new URL("/__missing__", url), request));
      res = new Response(page.page_type === "location" ? await renderLocation(page) : await renderStandard(page), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    ctx.waitUntil(Promise.all([cache.put(freshKey, withCache(res.clone(), FRESH_SECONDS)), cache.put(staleKey, withCache(res.clone(), STALE_SECONDS))]));
    return withHeaders(res, "MISS");
  } catch (err) {
    console.error("page render failed:", path, err && err.message);
    const stale = await cache.match(staleKey);
    if (stale) return withHeaders(stale, "STALE");
    return env.ASSETS.fetch(new Request(new URL("/__missing__", url), request));
  }
}

async function homepage(request, env, ctx, url) {
  const cache = caches.default;
  const freshKey = new Request(`https://${url.hostname}/__home/fresh`);
  const staleKey = new Request(`https://${url.hostname}/__home/stale`);
  const hit = await cache.match(freshKey);
  if (hit) return withHeaders(hit, "HIT");
  try {
    const html = renderHome(await loadHome());
    const res = new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    ctx.waitUntil(Promise.all([
      cache.put(freshKey, withCache(res.clone(), FRESH_SECONDS)),
      cache.put(staleKey, withCache(res.clone(), STALE_SECONDS)),
    ]));
    return withHeaders(res, "MISS");
  } catch (err) {
    console.error("homepage render failed:", err && err.message);
    const stale = await cache.match(staleKey);
    if (stale) return withHeaders(stale, "STALE");
    const fallback = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    return withHeaders(fallback, "STATIC");
  }
}

function withCache(res, seconds) {
  const r = new Response(res.body, res);
  r.headers.set("Cache-Control", `public, max-age=${seconds}`);
  return r;
}
function withHeaders(res, state) {
  const r = new Response(res.body, res);
  r.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  r.headers.set("X-Home-Render", state);
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  r.headers.set("X-Frame-Options", "SAMEORIGIN");
  r.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return r;
}
