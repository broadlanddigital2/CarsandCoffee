// admin.carsandcoffee.uk Worker.
// - POST /api/generate: AI writing help for the editors ("Write with AI" / "Suggest" buttons), using Cloudflare Workers AI.
//   Only signed-in, approved admins and moderators can use it (checked against Supabase on every request).
// - Everything else is the static admin app in ./public.
const AUTH = "https://auth.carsandcoffee.uk";
const KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU";
const MODELS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct-fast"];
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      try { return await generate(request, env); } catch (e) { console.error(e); return json({ error: "Something went wrong. Please try again." }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};

async function teamMember(request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const u = await fetch(`${AUTH}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const user = await u.json();
  const p = await fetch(`${AUTH}/rest/v1/profiles?select=role,status&id=eq.${encodeURIComponent(user.id)}`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!p.ok) return null;
  const [prof] = await p.json();
  return prof && prof.status === "approved" && ["admin", "moderator"].includes(prof.role) ? user.id : null;
}

async function limited(id, max) {
  const k = new Request(`https://rate.local/gen/${id}/${Math.floor(Date.now() / 60000)}`);
  const hit = await caches.default.match(k); const n = hit ? +(await hit.text()) : 0;
  if (n >= max) return true;
  await caches.default.put(k, new Response(String(n + 1), { headers: { "Cache-Control": "max-age=70" } }));
  return false;
}

const STYLE = `You write for Cars and Coffee UK, a friendly car community in Norfolk and Suffolk that runs car meets, a members' club and a directory of trusted local car businesses.
Write in plain, warm UK English (British spelling). Short sentences. No hype words like "ultimate", "unleash" or "elevate". Never use em dashes; use commas, colons or full stops.
Never invent specific facts: no made-up dates, prices, addresses, distances, phone numbers, business names, statistics or quotes. Use only facts given in the CONTEXT. If a specific detail would help but isn't given, write it generically or put a short placeholder in square brackets, e.g. [venue name], for the team to fill in.`;

const FIELDS = {
  body: { html: true, max: 1400, task: (c) => `Write the main body content for this ${c.kind || "web page"}. Aim for ${c.words || 400}-${(c.words || 400) + 200} words. Use 3 to 5 <h2> section headings, short <p> paragraphs and a <ul> list where it helps. Work the focus keyword in naturally: once in the first paragraph, once in a heading and a few times in the text. Add 2 or 3 internal links using <a href="..."> to relevant pages from KEY PAGES. Do not repeat the page title as a heading.` },
  scene: { html: true, max: 700, task: (c) => `Write "The local car scene" section for the ${c.place || "local"} hub page: 2 or 3 short <p> paragraphs about what the car scene is like for enthusiasts in and around ${c.place || "the area"} (types of cars and events people enjoy, why it's a good place for drivers, how Cars and Coffee fits in). Keep it general and true; don't name specific businesses or venues unless given.` },
  getting_car: { html: true, max: 220, task: (c) => `Write one short <p> paragraph (2 or 3 sentences) on getting around ${c.place || "the area"} by car for car meets: general tips on main roads, parking and arriving early. Don't invent road numbers or car parks unless given.` },
  getting_nocar: { html: true, max: 220, task: (c) => `Write one short <p> paragraph (2 or 3 sentences) on getting to car meets in ${c.place || "the area"} without a car: public transport, lifts from friends and asking in the club. Don't invent bus routes or stations unless given.` },
  intro: { options: 3, max: 400, task: (c) => `Write 3 alternative opening paragraphs, each 1 or 2 sentences (under 220 characters), that answer the searcher straight away and include the focus keyword naturally.` },
  summary: { options: 3, max: 400, task: (c) => `Write 3 alternative short summaries (1 or 2 sentences, under 200 characters each) for this ${c.kind || "page"}, suitable for a card and the top of the page.` },
  meta_title: { options: 5, max: 300, task: (c) => `Write 5 alternative SEO page titles for Google. Each must be between 40 and 60 characters including spaces, start with or include the focus keyword near the start, and may end with " | Cars and Coffee" only if it still fits in 60 characters.` },
  meta_description: { options: 3, max: 500, task: (c) => `Write 3 alternative Google meta descriptions. Each must be between 120 and 155 characters including spaces, include the focus keyword naturally, and give a reason to click.` },
  faqs: { faqs: 5, max: 900, task: (c) => `Write 5 frequently asked questions with helpful answers (each answer 1 to 3 sentences) that people searching for this page would ask. Base answers only on the CONTEXT; keep them general where details aren't given.` },
  ad_headlines: { options: 10, max: 400, task: (c) => `Write 10 Google Ads responsive search ad headlines. Each MUST be 30 characters or fewer including spaces. Include the focus keyword or close variants in at least 4. No exclamation marks.` },
  ad_descriptions: { options: 4, max: 500, task: (c) => `Write 4 Google Ads descriptions. Each MUST be 90 characters or fewer including spaces, with a clear call to action.` },
};

async function generate(request, env) {
  if (!env.AI) return json({ error: "AI isn't switched on for the admin yet." }, 503);
  const uid = await teamMember(request);
  if (!uid) return json({ error: "Please sign in again." }, 401);
  if (await limited(uid, 20)) return json({ error: "That's a lot of requests in a minute. Give it a moment." }, 429);
  let b; try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const f = FIELDS[b.field];
  if (!f) return json({ error: "Unknown field" }, 400);
  const c = b.context || {};
  const clip = (s, n) => String(s ?? "").slice(0, n);
  const context = [
    c.kind && `Page type: ${clip(c.kind, 40)}`, c.title && `Page title: ${clip(c.title, 160)}`, c.h1 && `Main heading: ${clip(c.h1, 160)}`,
    c.focus_keyword && `Focus keyword: ${clip(c.focus_keyword, 80)}`, c.secondary && `Other keywords: ${clip(c.secondary, 300)}`,
    c.place && `Place: ${clip(c.place, 80)}`, c.county && `County: ${clip(c.county, 40)}`, c.url && `Page address: ${clip(c.url, 160)}`,
    c.facts && `Facts you may use:\n${clip(c.facts, 1500)}`, c.intro && `Current opening paragraph: ${clip(c.intro, 600)}`,
    c.existing && `Existing text on the page (improve on it, keep any facts):\n${clip(c.existing, 3000)}`,
    "KEY PAGES: /events (all events) · /car-meets (car meets by town) · /guides/your-first-car-meet (first-timer's guide) · /guides/before-you-buy-a-classic · /guides/photographing-cars-at-a-meet · /directory (business directory) · /directory/list-your-business · https://club.carsandcoffee.uk/apply (join the club)",
  ].filter(Boolean).join("\n");
  const brief = clip(b.brief, 400).trim();
  let format;
  if (f.html) format = "Reply with the HTML only (allowed tags: h2, h3, p, ul, ol, li, strong, em, a, blockquote). No <html>, <body>, markdown or explanations.";
  else if (f.faqs) format = `Reply with JSON only: an array of ${f.faqs} objects like {"q": "question", "a": "answer"}. No other text.`;
  else format = `Reply with JSON only: an array of ${f.options} strings. No other text.`;
  const messages = [
    { role: "system", content: `${STYLE}\n\nCONTEXT:\n${context}` },
    { role: "user", content: `${f.task(c)}${brief ? `\nExtra instructions from the editor: ${brief}` : ""}\n\n${format}` },
  ];
  let out = "";
  for (const m of MODELS) {
    try { const r = await env.AI.run(m, { messages, max_tokens: f.max * 2, temperature: 0.6 }); out = String(r?.response || "").trim(); if (out) break; } catch (e) { console.error("ai", m, e && e.message); }
  }
  if (!out) return json({ error: "The AI didn't reply. Please try again." }, 502);
  if (f.html) {
    const html = out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").replace(/—/g, ", ").trim();
    return json({ html });
  }
  const arr = parseJson(out);
  if (!Array.isArray(arr) || !arr.length) return json({ error: "The AI reply couldn't be read. Please try again." }, 502);
  if (f.faqs) return json({ faqs: arr.filter((x) => x && x.q && x.a).map((x) => [String(x.q).replace(/—/g, ", "), String(x.a).replace(/—/g, ", ")]).slice(0, 8) });
  return json({ options: arr.map((x) => String(x).replace(/—/g, ", ").trim()).filter(Boolean).slice(0, f.options) });
}
function parseJson(s) {
  const t = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\[[\s\S]*\]/); if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
