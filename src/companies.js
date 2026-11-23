// Companies House search for the directory import (team only).
// POST /api/ch-search { county, group, name, start } with the admin user's Supabase token as "Authorization: Bearer …".
// The Companies House REST key is the Worker secret COMPANIES_HOUSE_API_KEY. Data is Crown copyright under the Open Government Licence.
const SB_URL = "https://mslidnchoopgsnbraaxe.supabase.co";
const SB_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU";
const ADMIN = "https://admin.carsandcoffee.uk";
const cors = (request) => (request.headers.get("Origin") === ADMIN ? { "Access-Control-Allow-Origin": ADMIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", Vary: "Origin" } : {});
const out = (request, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(request) } });

// SIC code groups we search, and what each means for our directory services
export const SIC_GROUPS = {
  repair: { label: "Garages and repairs (SIC 45200)", sic: ["45200"], services: ["Servicing"] },
  parts: { label: "Parts and accessories (SIC 45310, 45320)", sic: ["45310", "45320"], services: ["Parts and accessories"] },
  sales: { label: "Car sales (SIC 45111, 45112, 45190)", sic: ["45111", "45112", "45190"], services: ["Car sales"] },
};
// refine services from the company name
const NAME_SERVICES = [[/body|paint|crash|accident|smart repair|dent/i, "Bodywork"], [/tyre|tire|wheel/i, "Tyres"], [/detail|valet|ceramic|polish/i, "Detailing"], [/restor|classic|heritage|vintage/i, "Restoration"],
  [/tun(e|ing)|remap|performance|dyno|motorsport/i, "Tuning"], [/wrap|graphic|vinyl|livery/i, "Wraps and graphics"], [/storage/i, "Storage"], [/mot\b|service|servicing|garage|mechanic|auto ?repair/i, "Servicing"]];
const tidy = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ltd|Limited|Llp|Plc)\b\.?/gi, (m) => ({ ltd: "Ltd", limited: "Limited", llp: "LLP", plc: "PLC" }[m.toLowerCase().replace(".", "")] || m)).replace(/\bUk\b/g, "UK").replace(/\bMot\b/g, "MOT").replace(/\bBmw\b/g, "BMW").replace(/\bVw\b/g, "VW").replace(/'S\b/g, "'s").replace(/\bAnd\b/g, "and");

export async function companiesSearch(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return out(request, { error: "Method not allowed" }, 405);
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return out(request, { error: "Please sign in to admin." }, 401);
  const team = await fetch(`${SB_URL}/rest/v1/rpc/am_i_team`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Profile": "site", "Content-Type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : false)).catch(() => false);
  if (team !== true) return out(request, { error: "Team only." }, 403);
  if (!env.COMPANIES_HOUSE_API_KEY) return out(request, { error: "The Companies House key isn't set yet. Add the Worker secret COMPANIES_HOUSE_API_KEY in Cloudflare.", unavailable: true }, 503);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  const county = ["Norfolk", "Suffolk", "Cambridgeshire", "Essex"].includes(b.county) ? b.county : "Norfolk";
  const g = SIC_GROUPS[b.group] || null, name = String(b.name || "").trim().slice(0, 40), start = Math.max(0, Math.min(5000, +b.start || 0));
  if (!g && name.length < 3) return out(request, { error: "Choose a type of business or enter a word in the name (e.g. detailing)." }, 400);
  const qs = new URLSearchParams({ company_status: "active", location: county, size: "100", start_index: String(start) });
  if (g) g.sic.forEach((s) => qs.append("sic_codes", s));
  if (name) qs.set("company_name_includes", name);
  const r = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${qs}`, { headers: { Authorization: "Basic " + btoa(env.COMPANIES_HOUSE_API_KEY + ":") } }).catch(() => null);
  if (!r) return out(request, { error: "Couldn't reach Companies House. Try again." }, 502);
  if (r.status === 401) return out(request, { error: "Companies House rejected the key. Check the COMPANIES_HOUSE_API_KEY secret." }, 502);
  if (r.status === 404) return out(request, { total: 0, items: [] });
  if (!r.ok) return out(request, { error: `Companies House returned an error (${r.status}).` }, 502);
  const j = await r.json();
  const items = (j.items || []).map((c) => {
    const a = c.registered_office_address || {};
    const fromName = NAME_SERVICES.filter(([re]) => re.test(c.company_name || "")).map(([, s]) => s);
    const services = [...new Set([...fromName, ...(g ? g.services : [])])].slice(0, 4);
    return { company_number: c.company_number, name: tidy(c.company_name), raw_name: c.company_name, incorporated: c.date_of_creation || null, sic: c.sic_codes || [],
      town: tidy(a.locality || a.post_town || ""), county: a.region ? tidy(a.region) : county, postcode: a.postal_code || "", services: services.length ? services : ["Servicing"] };
  }).filter((x) => !x.county || x.county.toLowerCase().includes(county.toLowerCase()) || !x.county);
  return out(request, { total: j.hits || items.length, start, items, attribution: "Contains public sector information from Companies House, licensed under the Open Government Licence v3.0." });
}

// ---------- POST /api/site-scan { url } (team only): read a business's own website for contact details ----------
// Looks at the homepage and a likely contact page for: structured business data (JSON-LD), tel:/mailto: links, social links,
// address, and a logo. Results are suggestions for the team to confirm; nothing is saved here.
const SOCIAL = [["instagram", /instagram\.com\/[A-Za-z0-9_.]+/i], ["facebook", /facebook\.com\/[A-Za-z0-9_.\-/?=]+/i], ["youtube", /youtube\.com\/(@|c\/|channel\/)[A-Za-z0-9_\-]+/i], ["tiktok", /tiktok\.com\/@[A-Za-z0-9_.]+/i], ["x_url", /(twitter|x)\.com\/[A-Za-z0-9_]+/i], ["linkedin", /linkedin\.com\/company\/[A-Za-z0-9_\-]+/i]];
const BAD_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|godaddy|@(domain|email|yourdomain)\./i;
function absolute(u, base) { try { return new URL(u, base).href; } catch { return null; } }
async function getPage(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CarsAndCoffeeUK-DirectoryBot/1.0; +https://carsandcoffee.uk/directory)", Accept: "text/html" }, redirect: "follow", cf: { cacheTtl: 3600 } });
  if (!r.ok || !(r.headers.get("content-type") || "").includes("html")) return null;
  const t = await r.text(); return { url: r.url, html: t.slice(0, 600000) };
}
function scanHtml(p, out) {
  const h = p.html;
  for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1].trim()); const list = [].concat(j["@graph"] || j);
      for (const x of list) { if (!x || typeof x !== "object") continue;
        if (x.telephone && !out.phone) out.phone = String(x.telephone);
        if (x.email && !out.email) out.email = String(x.email).replace(/^mailto:/, "");
        if (x.logo && !out.logo) out.logo = absolute(typeof x.logo === "string" ? x.logo : x.logo.url, p.url);
        if (x.address && typeof x.address === "object" && !out.address) { const a = x.address; out.address = { line: a.streetAddress || "", town: a.addressLocality || "", county: a.addressRegion || "", postcode: a.postalCode || "" }; }
        if (Array.isArray(x.sameAs)) out._links.push(...x.sameAs); } } catch {}
  }
  for (const m of h.matchAll(/href=["']tel:([^"']+)["']/gi)) out._tels.push(decodeURIComponent(m[1]));
  for (const m of h.matchAll(/href=["']mailto:([^"'?]+)/gi)) out._emails.push(decodeURIComponent(m[1]).trim());
  for (const m of h.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) out._emails.push(m[0]);
  for (const m of h.matchAll(/href=["']([^"']+)["']/gi)) out._links.push(m[1]);
  if (!out.logo) { const og = h.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)/i) || h.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)/i) || h.match(/<img[^>]+src=["']([^"']*logo[^"']*)["']/i) || h.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/i);
    if (og) out.logo = absolute(og[1], p.url); }
  if (!out.postcode) { const pc = h.replace(/<[^>]+>/g, " ").match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b/); if (pc) out.postcode = pc[1].toUpperCase(); }
}
export async function siteScan(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const team = token ? await fetch(`${SB_URL}/rest/v1/rpc/am_i_team`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Profile": "site", "Content-Type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : false)).catch(() => false) : false;
  if (team !== true) return out(request, { error: "Team only." }, 403);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  let url = String(b.url || "").trim(); if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let host; try { host = new URL(url).hostname; } catch { return out(request, { error: "That doesn't look like a website address." }, 400); }
  if (/(^|\.)(google|yell|facebook|instagram|checkatrade|trustpilot|companieshouse|gov)\./i.test(host)) return out(request, { error: "Use the business's own website, not a directory or social page." }, 400);
  const res = { website: "", phone: "", email: "", logo: "", address: null, postcode: "", socials: {}, _tels: [], _emails: [], _links: [] };
  const home = await getPage(url).catch(() => null);
  if (!home) return out(request, { error: "We couldn't open that website. Check the address, or add the details by hand." }, 502);
  res.website = new URL(home.url).origin;
  scanHtml(home, res);
  const contact = [...home.html.matchAll(/href=["']([^"']*(contact|about|find-us|location)[^"']*)["']/gi)].map((m) => absolute(m[1], home.url)).find((u) => u && new URL(u).hostname === new URL(home.url).hostname);
  if (contact) { const cp = await getPage(contact).catch(() => null); if (cp) scanHtml(cp, res); }
  const site = new URL(home.url).hostname.replace(/^www\./, "");
  const emails = [...new Set(res._emails.map((e) => e.toLowerCase().replace(/^mailto:/, "")))].filter((e) => !BAD_EMAIL.test(e));
  res.email = res.email || emails.find((e) => e.endsWith("@" + site)) || emails[0] || "";
  res.phone = (res.phone || res._tels[0] || "").replace(/[^\d+ ]/g, "").trim();
  for (const [k, re] of SOCIAL) { const m = res._links.map(String).find((l) => re.test(l)); if (m) res.socials[k] = m.startsWith("http") ? m.split(/[?#]/)[0] : "https://" + m; }
  const { _tels, _emails, _links, ...clean } = res;
  return out(request, { ...clean, other_emails: emails.filter((e) => e !== res.email).slice(0, 4) });
}
