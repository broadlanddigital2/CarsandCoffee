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
