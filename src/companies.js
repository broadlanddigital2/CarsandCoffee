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
const decode = (t) => String(t || "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&ndash;|&#8211;/g, "–").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const SERVICE_WORDS = [[/\bMOTs?\b/, "MOT"], [/\bservic(e|ing)\b/i, "Servicing"], [/diagnostic/i, "Diagnostics"], [/\btyres?\b/i, "Tyres"], [/bodywork|body shop|paintwork|accident repair|smart repair/i, "Bodywork"],
  [/detailing|valet|ceramic coat|paint correction|machine polish/i, "Detailing"], [/\bwraps?\b|vinyl|ppf|paint protection film/i, "Wraps and PPF"], [/remap|ecu|tuning|dyno/i, "Tuning"], [/restoration|restore/i, "Restoration"],
  [/classic cars?|vintage/i, "Classic cars"], [/air ?con/i, "Air conditioning"], [/clutch|gearbox/i, "Clutch and gearbox"], [/\bEVs?\b|electric vehicles?|hybrid/i, "EV and hybrid"], [/exhaust/i, "Exhausts"],
  [/alignment|tracking/i, "Wheel alignment"], [/car sales|used cars|vehicles for sale/i, "Car sales"], [/storage/i, "Storage"], [/recovery|breakdown/i, "Recovery"], [/motorsport|track day|race prep/i, "Motorsport"]];
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
        if (x.openingHours && !out.hours) out.hours = [].concat(x.openingHours).join(", ");
        if (Array.isArray(x.openingHoursSpecification) && !out.hours) out.hours = x.openingHoursSpecification.map((o) => `${[].concat(o.dayOfWeek || []).map((d) => String(d).split("/").pop().slice(0, 3)).join(", ")} ${o.opens || ""}–${o.closes || ""}`).join("; ");
        if (x.description && !out.description) out.description = String(x.description).slice(0, 400);
        if (x.foundingDate && !out.established) out.established = String(x.foundingDate).slice(0, 4);
        if (Array.isArray(x.sameAs)) out._links.push(...x.sameAs); } } catch {}
  }
  for (const m of h.matchAll(/href=["']tel:([^"']+)["']/gi)) out._tels.push(decodeURIComponent(m[1]));
  for (const m of h.matchAll(/href=["']mailto:([^"'?]+)/gi)) out._emails.push(decodeURIComponent(m[1]).trim());
  for (const m of h.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) out._emails.push(m[0]);
  for (const m of h.matchAll(/href=["']([^"']+)["']/gi)) out._links.push(m[1]);
  if (!out.logo) { const og = h.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*?\b(?:data-src|src)=["']([^"']+)/i) || h.match(/<img[^>]+\b(?:data-src|src)=["']([^"']*logo[^"']*)["']/i) || h.match(/<[^>]+class=["'][^"']*(?:logo|brand)[^"']*["'][^>]*>\s*(?:<a[^>]*>\s*)?<img[^>]+\b(?:data-src|src)=["']([^"']+)/i) || h.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)/i);
    if (og) out.logo = absolute(og[1], p.url); }
  const meta = (n) => (h.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*content=["']([^"']+)`, "i")) || h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${n}["']`, "i")) || [])[1];
  if (!out.title) out.title = decode((h.match(/<title[^>]*>([^<]+)/i) || [])[1] || "").trim().slice(0, 160);
  if (!out.description) out.description = decode(meta("description") || meta("og:description") || "").trim().slice(0, 400);
  if (!out.image) { const im = meta("og:image"); if (im) out.image = absolute(im, p.url); }
  const text = decode(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  for (const [re, label] of SERVICE_WORDS) if (re.test(text)) out._services.add(label);
  const cn = text.match(/compan(?:y|ies) (?:reg(?:istration|istered)?\.? )?(?:no\.?|number)[:\s]*([0-9]{8}|[A-Z]{2}[0-9]{6})/i); if (cn && !out.company_number_on_site) out.company_number_on_site = cn[1];
  const yr = text.match(/\b(?:established|est\.?|since|founded(?: in)?)\s+((?:19|20)\d{2})\b/i); if (yr && !out.established) out.established = yr[1];
  if (!out.about) { const ab = text.match(/(?:about us|who we are|welcome to)[\s:–-]+(.{80,420}?[.!])/i); if (ab) out.about = ab[1].trim(); }
  // photos: content images on the page (not icons, logos, tracking pixels or sprites)
  for (const m of h.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0], src = (tag.match(/\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1] || "", srcset = (tag.match(/\bsrcset=["']([^"']+)["']/i) || [])[1] || "";
    const best = srcset ? srcset.split(",").map((x) => x.trim().split(/\s+/)).sort((a, b) => (parseInt(b[1]) || 0) - (parseInt(a[1]) || 0))[0]?.[0] : src;
    const u = absolute(best || src, p.url); if (!u || !/^https?:/i.test(u)) continue;
    const w = parseInt((tag.match(/\bwidth=["']?(\d+)/i) || [])[1] || "0");
    if (/\.svg(\?|$)|logo|icon|favicon|sprite|pixel|badge|avatar|emoji|spinner|loader|placeholder|blank\.|gravatar|facebook\.com|google|data:image/i.test(u + " " + tag)) continue;
    if (w && w < 300) continue;
    if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) && !/wp-content|uploads|images|media|cdn|photos?/i.test(u)) continue;
    const alt = decode((tag.match(/\balt=["']([^"']*)["']/i) || [])[1] || "").trim().slice(0, 140);
    if (!out._photos.find((x) => x.src === u)) out._photos.push({ src: u, alt });
  }
  if (!out.address) {
    const ip = (n) => decode((h.match(new RegExp(`itemprop=["']${n}["'][^>]*>([^<]+)<`, "i")) || [])[1] || "").trim();
    if (ip("streetAddress") || ip("postalCode")) out.address = { line: ip("streetAddress"), town: ip("addressLocality"), county: ip("addressRegion"), postcode: ip("postalCode") };
  }
  if (!out.address) {
    // a UK postcode in the page text, with the address words just before it (e.g. "Unit 4, Mill Road, Dereham, Norfolk NR19 1AA")
    const m = text.match(/([A-Za-z0-9][A-Za-z0-9 ,.'&\-\/]{8,120}?)[, ]+([A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})\b/);
    if (m) { const parts = m[1].split(/\s*,\s*|\s{2,}/).map((x) => x.trim()).filter((x) => x && x.length < 60 && !/^(address|find us|visit us|contact|tel|phone|email|copyright|©)/i.test(x)).slice(-4);
      if (parts.length >= 2) { const county = /^(norfolk|suffolk|essex|cambridgeshire)$/i.test(parts[parts.length - 1]) ? parts.pop() : ""; const town = parts.length > 1 ? parts.pop() : "";
        out.address = { line: parts.join(", "), town, county, postcode: m[2].toUpperCase().replace(/^(.+?)(\d[A-Z]{2})$/, (x, a, b) => a.trim() + " " + b) }; } }
  }
  if (!out.postcode) { const pc = h.replace(/<[^>]+>/g, " ").match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b/); if (pc) out.postcode = pc[1].toUpperCase(); }
}
export async function scanSite(rawUrl, companyNumber = "") {
  let url = String(rawUrl || "").trim(); if (!url) return { error: "No website address." }; if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let host; try { host = new URL(url).hostname; } catch { return { error: "That doesn't look like a website address." }; }
  if (/(^|\.)(google|yell|facebook|instagram|checkatrade|trustpilot|companieshouse|gov)\./i.test(host)) return { error: "Use the business's own website, not a directory or social page." };
  const res = { website: "", phone: "", email: "", logo: "", address: null, postcode: "", socials: {}, title: "", description: "", image: "", hours: "", about: "", established: "", company_number_on_site: "", _services: new Set(), _photos: [], _tels: [], _emails: [], _links: [] };
  const home = await getPage(url).catch(() => null) || (!/^https?:\/\/www\./i.test(url) ? await getPage(url.replace(/^https?:\/\//i, "https://www.")).catch(() => null) : null);
  if (!home) return { error: "We couldn't open that website." };
  res.website = new URL(home.url).origin;
  scanHtml(home, res);
  const sameHost = (u) => { try { return u && new URL(u).hostname === new URL(home.url).hostname; } catch { return false; } };
  const extra = [...home.html.matchAll(/href=["']([^"']*(contact|find-us|location|about|services|opening)[^"']*)["']/gi)].map((m) => absolute(m[1], home.url)).filter(sameHost);
  extra.sort((a, b) => (/contact|find-us|location/i.test(b) ? 1 : 0) - (/contact|find-us|location/i.test(a) ? 1 : 0));
  for (const u of [...new Set(extra)].slice(0, 3)) { const cp = await getPage(u).catch(() => null); if (cp) scanHtml(cp, res); }
  const site = new URL(home.url).hostname.replace(/^www\./, "");
  const emails = [...new Set(res._emails.map((e) => e.toLowerCase().replace(/^mailto:/, "")))].filter((e) => !BAD_EMAIL.test(e));
  res.email = res.email || emails.find((e) => e.endsWith("@" + site)) || emails[0] || "";
  res.phone = (res.phone || res._tels[0] || "").replace(/[^\d+ ]/g, "").trim();
  for (const [k, re] of SOCIAL) { const m = res._links.map(String).find((l) => re.test(l)); if (m) res.socials[k] = m.startsWith("http") ? m.split(/[?#]/)[0] : "https://" + m; }
  const { _tels, _emails, _links, _services, _photos, ...clean } = res;
  const photos = _photos.filter((x) => x.src !== clean.logo).slice(0, 10);
  const want = String(companyNumber || "").toUpperCase();
  return { ...clean, photos, services_found: [..._services], company_match: want && clean.company_number_on_site ? clean.company_number_on_site.toUpperCase() === want : null, other_emails: emails.filter((e) => e !== res.email).slice(0, 4), checked_at: new Date().toISOString() };
}
export async function siteScan(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if ((await isTeam(request)) !== true) return out(request, { error: "Team only." }, 403);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  const r = await scanSite(b.url, b.company_number);
  return out(request, r, r.error ? 400 : 200);
}

// ---------- shared team check ----------
async function isTeam(request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  return fetch(`${SB_URL}/rest/v1/rpc/am_i_team`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Profile": "site", "Content-Type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : false)).catch(() => false);
}

// ---------- POST /api/ch-profile { company_number } (team only): the full Companies House record ----------
// Company profile (status, type, incorporated, registered office, SIC codes, accounts and confirmation statement dates) and current officers.
const SIC_NAMES = { "45111": "Sale of new cars and light motor vehicles", "45112": "Sale of used cars and light motor vehicles", "45190": "Sale of other motor vehicles", "45200": "Maintenance and repair of motor vehicles",
  "45310": "Wholesale trade of motor vehicle parts and accessories", "45320": "Retail trade of motor vehicle parts and accessories", "45400": "Sale, maintenance and repair of motorcycles", "77110": "Renting and leasing of cars", "52219": "Other service activities incidental to land transportation" };
export async function chProfileData(n, env) {
  if (!env.COMPANIES_HOUSE_API_KEY) return { error: "The Companies House key isn't set yet. Add the Worker secret COMPANIES_HOUSE_API_KEY in Cloudflare.", unavailable: true };
  n = String(n || "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9]{8}$/.test(n)) return { error: "That isn't a Companies House number." };
  const auth = { Authorization: "Basic " + btoa(env.COMPANIES_HOUSE_API_KEY + ":") };
  const [pr, of] = await Promise.all([fetch(`https://api.company-information.service.gov.uk/company/${n}`, { headers: auth }).catch(() => null), fetch(`https://api.company-information.service.gov.uk/company/${n}/officers?items_per_page=20`, { headers: auth }).catch(() => null)]);
  if (!pr) return { error: "Couldn't reach Companies House." };
  if (pr.status === 401) return { error: "Companies House rejected the key. Check the COMPANIES_HOUSE_API_KEY secret.", unavailable: true };
  if (pr.status === 404) return { error: "Companies House has no company with that number." };
  if (!pr.ok) return { error: `Companies House returned an error (${pr.status}).` };
  const c = await pr.json(), o = of && of.ok ? await of.json() : { items: [] };
  const a = c.registered_office_address || {};
  const officers = (o.items || []).filter((x) => !x.resigned_on).map((x) => {
    const nm = String(x.name || ""), parts = nm.split(",").map((t) => t.trim()), first = tidy((parts[1] || "").split(/\s+/)[0] || ""), last = tidy(parts[0] || "");
    return { name: parts.length > 1 ? `${tidy(parts[1])} ${last}` : tidy(nm), first_name: first, role: String(x.officer_role || "").replace(/-/g, " "), appointed: x.appointed_on || null, corporate: /corporate/.test(x.officer_role || "") };
  });
  return {
    company_number: c.company_number, name: tidy(c.company_name), status: c.company_status, type: String(c.type || "").toUpperCase() === "LTD" ? "Private limited company" : c.type, incorporated: c.date_of_creation || null,
    registered_office: [a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code].filter(Boolean).join(", "), office: { line: [a.premises, a.address_line_1, a.address_line_2].filter(Boolean).join(", ").replace(/^(\d+[A-Z]?), /, "$1 "), town: tidy(a.locality || ""), county: tidy(a.region || ""), postcode: a.postal_code || "" }, postcode: a.postal_code || "",
    sic: (c.sic_codes || []).map((x) => ({ code: x, name: SIC_NAMES[x] || "" })),
    accounts: { next_due: c.accounts?.next_due || null, last_made_up_to: c.accounts?.last_accounts?.made_up_to || null, overdue: !!c.accounts?.overdue, type: c.accounts?.last_accounts?.type || null },
    confirmation: { next_due: c.confirmation_statement?.next_due || null, overdue: !!c.confirmation_statement?.overdue },
    has_insolvency: !!c.has_insolvency_history, has_charges: !!c.has_charges, officers, checked_at: new Date().toISOString(),
    attribution: "Contains public sector information from Companies House, licensed under the Open Government Licence v3.0." };
}
// find the company number from a business name (search, then keep only a confident match: same name, active, and in the area when we know it)
const normName = (x) => String(x || "").toLowerCase().replace(/&/g, " and ").replace(/\b(ltd|limited|llp|plc|the|uk|co)\b\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
export async function chFind(name, town, county, env) {
  if (!env.COMPANIES_HOUSE_API_KEY || !name) return null;
  const r = await fetch(`https://api.company-information.service.gov.uk/search/companies?items_per_page=10&q=${encodeURIComponent(name)}`, { headers: { Authorization: "Basic " + btoa(env.COMPANIES_HOUSE_API_KEY + ":") } }).catch(() => null);
  if (!r || !r.ok) return null;
  const want = normName(name), area = [town, county].filter(Boolean).map((x) => x.toLowerCase());
  const items = ((await r.json()).items || []).map((c) => ({ number: c.company_number, name: c.title, status: c.company_status, address: c.address_snippet || "", same: normName(c.title) === want, local: area.some((a) => (c.address_snippet || "").toLowerCase().includes(a)) }));
  const best = items.find((c) => c.same && c.status === "active" && (c.local || !area.length)) || items.find((c) => c.same && c.status === "active");
  return { match: best ? { ...best, confident: !!(best.same && (best.local || !area.length)) } : null, candidates: items.slice(0, 5) };
}
export async function chProfile(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if ((await isTeam(request)) !== true) return out(request, { error: "Team only." }, 403);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  const r = await chProfileData(b.company_number, env);
  return out(request, r, r.error ? (r.unavailable ? 503 : 400) : 200);
}

// ---------- POST /api/site-guess { name, town } (team only): try the likely website addresses for a business ----------
// Checks a handful of domains made from the company name and returns those that open and mention the name. A person confirms the right one.
export async function guessSites(name, town) {
  const base = String(name || "").toLowerCase().replace(/&/g, " and ").replace(/\b(ltd|limited|llp|plc|uk|the|co|company|services?|group)\b\.?/g, " ").replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 4);
  if (!base.length) return [];
  const stems = [...new Set([base.join(""), base.join("-"), base.slice(0, 2).join(""), base.slice(0, 3).join("")].filter((x) => x.length >= 4))];
  const cands = stems.flatMap((x) => [`${x}.co.uk`, `${x}.com`, `${x}.uk`]).slice(0, 9);
  const words = base.filter((w) => w.length > 2);
  const found = (await Promise.all(cands.map(async (d) => {
    const p = await Promise.race([getPage("https://" + d).catch(() => null), new Promise((r) => setTimeout(() => r(null), 6000))]);
    if (!p) return null;
    const title = decode((p.html.match(/<title[^>]*>([^<]+)/i) || [])[1] || "").trim(), text = p.html.toLowerCase();
    const hits = words.filter((w) => text.includes(w)).length, tn = town && text.includes(String(town).toLowerCase());
    if (!hits) return null;
    return { url: new URL(p.url).origin, title: title.slice(0, 120), score: hits / Math.max(1, words.length) + (tn ? 0.5 : 0), mentions_town: !!tn };
  }))).filter(Boolean).sort((x, y) => y.score - x.score);
  const seen = new Set(); return found.filter((x) => (seen.has(x.url) ? false : seen.add(x.url))).slice(0, 4);
}
export async function siteGuess(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if ((await isTeam(request)) !== true) return out(request, { error: "Team only." }, 403);
  let b; try { b = await request.json(); } catch { return out(request, { error: "Bad request" }, 400); }
  return out(request, { items: await guessSites(b.name, b.town) });
}

// ---------- POST /api/enrich: research businesses end to end and save the results ----------
// Called by the database every few minutes for new businesses (header x-outbox-token, checked by the database), or from admin for one business (team sign-in).
// Steps: find/confirm the company at Companies House, find and read their website, look up the postcode, then save. The database fills the listing and contact.
export async function enrich(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return out(request, { error: "Method not allowed" }, 405);
  const machine = request.headers.get("x-outbox-token") || "", jwt = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let b = {}; try { b = await request.json(); } catch {}
  const auth = machine ? SB_KEY : jwt; if (!auth) return out(request, { error: "Please sign in to admin." }, 401);
  const rpc = (fn, args) => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${auth}`, "Content-Profile": "site", "Content-Type": "application/json" }, body: JSON.stringify({ p_token: machine || null, ...args }) });
  const q = await rpc("outreach_enrich_queue", { p_listing: b.listing_id || null, p_limit: Math.min(3, Math.max(1, +b.limit || 2)) });
  if (!q.ok) return out(request, { error: q.status === 401 || q.status === 403 ? "Team only." : "Couldn't load businesses to research." }, q.status === 400 ? 403 : q.status);
  const rows = await q.json(), done = [];
  for (const x of rows) {
    const e = { ...(x.enrichment || {}) }, notes = [];
    // Companies House: use the number we have, or find it from the name
    let cn = x.company_number || "";
    if (!cn) { const f = await chFind(x.name, x.town, x.county, env).catch(() => null); if (f) { e.ch_search = f; if (f.match?.confident) { cn = f.match.number; e.ch_found = true; } } }
    if (cn) { const c = await chProfileData(cn, env); if (c.error) { e.ch_error = c.error; notes.push(c.error); } else { e.ch = c; delete e.ch_error; } }
    else if (!env.COMPANIES_HOUSE_API_KEY) { e.ch_error = "The Companies House key isn't set yet (Worker secret COMPANIES_HOUSE_API_KEY)."; notes.push(e.ch_error); }
    // website: the listing's, a confirmed one, or the best guess
    let url = x.website || (e.site_confirmed && e.site?.website) || "", confirmed = !!url;
    if (!url) { e.guesses = await guessSites(e.ch?.name || x.name, x.town).catch(() => []); const top = e.guesses[0]; if (top && top.score >= 1) url = top.url; }
    if (url) { const st = await scanSite(url, cn); if (st.error) { e.site_error = st.error; notes.push("Website: " + st.error); } else { e.site = st; delete e.site_error;
      // treat a guessed site as theirs when it shows their company number, or names the business and the town
      e.site_confirmed = confirmed || st.company_match === true || ((e.guesses || [])[0]?.score >= 1.5);
      e.site_guessed = !confirmed; } }
    // where they are: the website's address first, then the registered office as a fallback (flagged, as it's often an accountant)
    const addr = e.site?.address?.postcode ? { ...e.site.address, source: "website" } : e.site?.postcode ? { line: "", town: "", county: "", postcode: e.site.postcode, source: "website" } : e.ch?.office?.postcode ? { ...e.ch.office, source: "registered office" } : null;
    if (addr?.postcode) {
      const pc = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(addr.postcode)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (pc?.result) { addr.lat = pc.result.latitude; addr.lng = pc.result.longitude; addr.town = addr.town || pc.result.admin_district || ""; addr.county = addr.county || pc.result.admin_county || pc.result.region || ""; addr.postcode = pc.result.postcode; }
      addr.maps_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([x.name, addr.line, addr.town, addr.postcode].filter(Boolean).join(", "))}`;
      e.address = addr;
    }
    e.researched_at = new Date().toISOString();
    const sv = await rpc("outreach_save_enrichment", { p_listing: x.listing_id, p_data: e, p_company_number: cn || null, p_notes: notes.join("; ") || null });
    done.push({ listing_id: x.listing_id, name: x.name, ok: sv.ok, notes, filled: sv.ok ? await sv.json() : null });
  }
  return out(request, { researched: done.length, items: done });
}
