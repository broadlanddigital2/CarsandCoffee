// SEO optimiser and Google Ads checks for site.pages. Pure functions, no network.
export const LIMITS = { metaTitle: [30, 60], metaDesc: [120, 160], adHeadline: 30, adDescription: 90, adPath: 15 };
export const MIN_WORDS = { standard: 400, location: 600, sector: 600, audience: 600, guide: 1000, landing: 300 };

const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export const slugify = (s) => norm(s).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
export const words = (s) => (norm(s).match(/[a-z0-9]+/g) || []);
// Phrase match that allows up to two small joining words between keyword words ("car meets norwich" matches "car meets in norwich").
const kwRe = (needle, flags = "") => new RegExp("(?:^| )" + norm(needle).split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(?: [a-z0-9]+){0,2}? ") + "(?= |$)", flags);
const has = (hay, needle) => !!norm(needle) && kwRe(needle).test(norm(hay));
const countKw = (hay, needle) => (norm(hay).match(kwRe(needle, "g")) || []).length;
export function stripMd(md) {
  return String(md || "").replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ");
}

// Score a page: returns { score 0-100, grade, checks: [{ status: pass|warn|fail|info, label, tip }] }
export function analyse(p) {
  const checks = [];
  const add = (status, label, tip = "", weight = 1) => checks.push({ status, label, tip, weight });
  const kw = (p.focus_keyword || "").trim();
  const type = p.page_type || "standard";
  const metaTitle = p.meta_title || p.title || "";
  const metaDesc = p.meta_description || "";
  const h1 = p.h1 || p.title || "";
  const body = p.body_md || "";
  const text = [p.intro, stripMd(body)].filter(Boolean).join(" ");
  const wc = words(text).length;
  const firstPara = (p.intro || stripMd(body).trim().split(/\n\s*\n/)[0] || "").slice(0, 600);

  if (!kw) add("fail", "Set a focus keyword", "Pick the main search phrase this page should rank for, e.g. “car meets Norwich”.", 3);
  else add("pass", `Focus keyword: “${kw}”`, "", 1);

  const tl = metaTitle.length;
  if (!metaTitle) add("fail", "Add an SEO title", "Shown as the blue link in Google.", 2);
  else if (tl < LIMITS.metaTitle[0]) add("warn", `SEO title is short (${tl} characters)`, "Aim for 30–60 characters so it fills the result.", 2);
  else if (tl > LIMITS.metaTitle[1]) add("warn", `SEO title is long (${tl} characters)`, "Google cuts titles off at around 60 characters.", 2);
  else add("pass", `SEO title length is good (${tl})`, "", 2);
  if (kw) has(metaTitle, kw) ? add("pass", "Keyword is in the SEO title", "", 2) : add("fail", "Put the keyword in the SEO title", "Ideally near the start.", 2);

  const dl = metaDesc.length;
  if (!metaDesc) add("fail", "Write a meta description", "The grey text under the link in Google. Make it a reason to click.", 2);
  else if (dl < LIMITS.metaDesc[0]) add("warn", `Meta description is short (${dl} characters)`, "Aim for 120–160 characters.", 1);
  else if (dl > LIMITS.metaDesc[1]) add("warn", `Meta description is long (${dl} characters)`, "Google cuts it off at around 160 characters.", 1);
  else add("pass", `Meta description length is good (${dl})`, "", 1);
  if (kw && metaDesc) has(metaDesc, kw) ? add("pass", "Keyword is in the meta description", "", 1) : add("warn", "Add the keyword to the meta description", "Google bolds matching words.", 1);

  if (!p.h1 && !p.title) add("fail", "Add a main heading (H1)", "", 2);
  else if (kw) has(h1, kw) ? add("pass", "Keyword is in the main heading", "", 2) : add("warn", "Use the keyword in the main heading", "", 2);

  if (kw) {
    const kwSlug = slugify(kw).split("-");
    const pathWords = String(p.path || "").toLowerCase().split(/[\/-]+/);
    const hits = kwSlug.filter((w) => pathWords.includes(w)).length;
    hits >= Math.ceil(kwSlug.length * 0.6) ? add("pass", "Keyword is in the page address", "", 1) : add("warn", "Put the keyword in the page address", `e.g. ${"/" + slugify(kw)}`, 1);
    has(firstPara, kw) ? add("pass", "Keyword appears in the opening paragraph", "", 1) : add("warn", "Use the keyword in the first paragraph", "Tells Google and readers straight away what the page is about.", 1);
    if (wc > 50) {
      const n = countKw(text, kw);
      const density = (n * words(kw).length) / wc * 100;
      if (n === 0) add("fail", "Keyword isn't used in the page text", "", 2);
      else if (density > 3) add("warn", `Keyword used a lot (${density.toFixed(1)}%)`, "Over 3% can read as keyword stuffing. Use natural variations.", 1);
      else add("pass", `Keyword used ${n} time${n === 1 ? "" : "s"} (${density.toFixed(1)}%)`, "", 1);
    }
  }

  const minW = MIN_WORDS[type] || 400;
  if (wc < minW * 0.5) add("fail", `Only ${wc} words`, `${labelType(type)} pages should have at least ${minW} words of useful content.`, 2);
  else if (wc < minW) add("warn", `${wc} words: aim for ${minW}+`, `${labelType(type)} pages rank better with more depth.`, 2);
  else add("pass", `${wc} words of content`, "", 2);

  const subs = (body.match(/^#{2,3}\s+.+$/gm) || []);
  if (wc > 300 && subs.length < 2) add("warn", "Add subheadings (## Heading)", "Break the page into sections people can scan.", 1);
  else if (subs.length) {
    add("pass", `${subs.length} subheading${subs.length === 1 ? "" : "s"}`, "", 1);
    if (kw && !subs.some((s) => has(s, kw) || words(kw).filter((w) => w.length > 3).some((w) => has(s, w)))) add("warn", "Use the keyword (or part of it) in a subheading", "", 1);
  }

  const internal = (body.match(/\]\((\/[^)\s]*)\)/g) || []).length + (p.cta_url && p.cta_url.startsWith("/") ? 1 : 0);
  internal >= 2 ? add("pass", `${internal} internal links`, "", 1) : add("warn", `Add internal links (${internal} so far)`, "Link to related events, guides or location pages, e.g. [Norwich car meets](/car-meets/norfolk/norwich).", 1);
  const external = (body.match(/\]\((https?:\/\/[^)\s]*)\)/g) || []).length;
  if (external) add("info", `${external} external link${external === 1 ? "" : "s"}`, "", 0);

  const imgs = body.match(/!\[([^\]]*)\]\([^)]*\)/g) || [];
  const noAlt = imgs.filter((m) => /^!\[\s*\]/.test(m)).length;
  if (p.hero_image_path && !p.hero_image_alt) add("fail", "Describe the main image (alt text)", "Helps Google Images and screen reader users.", 1);
  if (noAlt) add("warn", `${noAlt} image${noAlt === 1 ? "" : "s"} without alt text`, "", 1);
  if (!p.hero_image_path && !imgs.length) add("warn", "Add an image", "Pages with a relevant photo get more clicks and shares.", 1);
  else if (!noAlt && (!p.hero_image_path || p.hero_image_alt)) add("pass", "Images have alt text", "", 1);

  if (type === "location") {
    if (!p.town && !p.county) add("fail", "Set the town or county", "Location pages need a place.", 2);
    const place = p.town || p.county;
    if (place) {
      has(metaTitle, place) ? add("pass", `${place} is in the SEO title`, "", 1) : add("fail", `Put “${place}” in the SEO title`, "", 1);
      has(h1, place) ? add("pass", `${place} is in the main heading`, "", 1) : add("warn", `Put “${place}” in the main heading`, "", 1);
    }
  }
  if (type === "landing") {
    const a = p.ads || {};
    if (!p.cta_label || !p.cta_url) add("fail", "Add a clear call to action", "Landing pages need one obvious next step (button text and link).", 2);
    else add("pass", `Call to action: “${p.cta_label}”`, "", 2);
    const hs = (a.headlines || []).filter((h) => h && h.trim());
    const ds = (a.descriptions || []).filter((d) => d && d.trim());
    const longH = hs.filter((h) => h.length > LIMITS.adHeadline).length, longD = ds.filter((d) => d.length > LIMITS.adDescription).length;
    if (hs.length < 3) add("fail", `Ad headlines: ${hs.length} of at least 3`, "Google responsive search ads need 3–15 headlines.", 2);
    else if (longH) add("fail", `${longH} ad headline${longH === 1 ? " is" : "s are"} over 30 characters`, "", 2);
    else add("pass", `${hs.length} ad headlines`, hs.length < 8 ? "More headlines (up to 15) give Google more to test." : "", 2);
    if (ds.length < 2) add("fail", `Ad descriptions: ${ds.length} of at least 2`, "", 1);
    else if (longD) add("fail", `${longD} ad description${longD === 1 ? " is" : "s are"} over 90 characters`, "", 1);
    else add("pass", `${ds.length} ad descriptions`, "", 1);
    if (kw && hs.length && !hs.some((h) => has(h, kw) || words(kw).every((w) => has(h, w)))) add("warn", "Use the keyword in at least one ad headline", "Improves ad relevance and Quality Score.", 1);
    if (!(a.keywords || []).filter(Boolean).length) add("warn", "Add the ad group's keywords", "So the page copy can be checked against what people search.", 1);
    if (!a.utm_campaign) add("warn", "Set a UTM campaign name", "So visits from this ad show up properly in Google Analytics.", 1);
  }
  if (p.status === "published" && p.noindex) add("warn", "Page is hidden from Google (noindex)", "Untick “Hide from search engines” if it should rank.", 1);
  if (type === "landing" && !p.noindex) add("info", "Tip: landing pages for ads are often hidden from search (noindex)", "Avoids competing with your SEO pages for the same searches.", 0);

  const scored = checks.filter((c) => c.weight > 0);
  const total = scored.reduce((s, c) => s + c.weight, 0) || 1;
  const got = scored.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const score = Math.round((got / total) * 100);
  const order = { fail: 0, warn: 1, pass: 2, info: 3 };
  checks.sort((a, b) => order[a.status] - order[b.status]);
  return { score, grade: score >= 80 ? "good" : score >= 55 ? "ok" : "bad", checks, words: wc };
}

export function labelType(t) {
  return { standard: "Standard", location: "Location", sector: "Sector", audience: "Audience", guide: "Guide", landing: "Ad landing" }[t] || t;
}

export function utmUrl(base, a = {}) {
  try {
    const u = new URL(base);
    if (a.utm_source) u.searchParams.set("utm_source", a.utm_source);
    if (a.utm_medium) u.searchParams.set("utm_medium", a.utm_medium);
    if (a.utm_campaign) u.searchParams.set("utm_campaign", a.utm_campaign);
    if (a.utm_content) u.searchParams.set("utm_content", a.utm_content);
    if (a.utm_term) u.searchParams.set("utm_term", a.utm_term);
    return u.toString();
  } catch { return base; }
}

// Small, safe Markdown renderer for previews (headings, paragraphs, lists, bold, italic, links, images, quotes).
export function md(src) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inline = (s) => esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => /^(https?:\/\/|\/)/.test(u) ? `<img src="${u}" alt="${a}">` : "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => /^(https?:\/\/|\/|mailto:)/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  const out = []; let list = null, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(src || "").split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list !== "ul") { if (list) out.push(`</${list}>`); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list !== "ol") { if (list) out.push(`</${list}>`); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flush(); out.push(`<blockquote class="border-start ps-3 text-body-secondary">${inline(m[1])}</blockquote>`); continue; }
    if (list) { out.push(`</${list}>`); list = null; }
    para.push(line.trim());
  }
  flush();
  return out.join("\n");
}
