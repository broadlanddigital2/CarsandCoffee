// Event, news and guide pages (and their listing pages), rendered from the database inside the homepage's header and footer.
import { E, img, ARROW, q, eventCard, EVENT_TYPES, TICKET, money, fmt } from "./home.js";
import { shell, directions, newsletterHTML, crumbsHTML } from "./pages.js";

const SITE = "https://www.carsandcoffee.uk";
const CLUB = "https://club.carsandcoffee.uk";
const enc = encodeURIComponent;
const partnersQ = () => q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort");
const longDate = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hhmm = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false });
const dayKey = (d) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });
const monthLabel = (d) => fmt(d, { month: "long", year: "numeric" });
const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
const clip = (s, n = 155) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const ldLink = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) });

// ---------- safe HTML for text written in the admin's visual editor ----------
// Only simple formatting survives; everything else (scripts, styles, event handlers, unknown tags) is removed.
const ALLOWED = { p: [], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], s: [], ul: [], ol: [], li: [], blockquote: [], br: [], hr: [], a: ["href"], img: ["src", "alt", "width", "height"], figure: [], figcaption: [] };
const VOID = new Set(["br", "hr", "img"]);
const decode = (s) => s.replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);?/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const safeUrl = (u, isImg) => {
  const v = decode(u).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (/^(https?:)?\/\//i.test(v) || /^\/(?!\/)/.test(v)) return v;
  if (!isImg && (/^(mailto|tel):/i.test(v) || v.startsWith("#"))) return v;
  if (isImg && /^[a-z0-9][a-z0-9/_.-]*\.(webp|jpe?g|png|avif|gif|svg)$/i.test(v)) return "/" + v;
  return null;
};
export function sanitize(html) {
  if (!html) return "";
  let s = String(html).replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button|input|link|meta|base)\b[^>]*>/gi, "");
  const out = []; const open = [];
  let last = 0;
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g; let m;
  const text = (t) => t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  while ((m = re.exec(s))) {
    out.push(text(s.slice(last, m.index))); last = re.lastIndex;
    const closing = !!m[1], tag = m[2].toLowerCase();
    if (!(tag in ALLOWED)) continue;
    if (closing) { const i = open.lastIndexOf(tag); if (i === -1) continue; while (open.length > i) out.push(`</${open.pop()}>`); continue; }
    const attrs = []; const are = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g; let a;
    while ((a = are.exec(m[3]))) {
      const name = a[1].toLowerCase(), val = a[3] ?? a[4] ?? a[5] ?? "";
      if (!ALLOWED[tag].includes(name)) continue;
      if (name === "href" || name === "src") { const u = safeUrl(val, name === "src"); if (!u) continue; attrs.push(`${name}="${E(u)}"`); }
      else if (name === "width" || name === "height") { if (/^\d{1,4}$/.test(val)) attrs.push(`${name}="${val}"`); }
      else attrs.push(`${name}="${E(decode(val))}"`);
    }
    if (tag === "a") { if (!attrs.some((x) => x.startsWith("href="))) continue; if (/href="(https?:)?\/\/(?!www\.carsandcoffee\.uk|club\.carsandcoffee\.uk)/.test(attrs.join(" "))) attrs.push('rel="noopener"', 'target="_blank"'); }
    if (tag === "img") { if (!attrs.some((x) => x.startsWith("src="))) continue; if (!attrs.some((x) => x.startsWith("alt="))) attrs.push('alt=""'); attrs.push('loading="lazy"'); }
    out.push(`<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
    if (!VOID.has(tag)) open.push(tag);
  }
  out.push(text(s.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("").replace(/<p>\s*(<br>)?\s*<\/p>/g, "").trim();
}
// Old Markdown bodies (from before the visual editor) still display.
const mdToHtml = (md) => String(md || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
  const inline = (t) => E(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  if (/^### /.test(b)) return `<h3>${inline(b.slice(4))}</h3>`;
  if (/^## /.test(b)) return `<h2>${inline(b.slice(3))}</h2>`;
  if (/^[-*] /m.test(b) && b.split("\n").every((l) => /^[-*] /.test(l))) return `<ul>${b.split("\n").map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
  if (/^> /.test(b)) return `<blockquote>${inline(b.replace(/^> ?/gm, ""))}</blockquote>`;
  return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
}).join("");
const body = (row) => (row.body_html ? sanitize(row.body_html) : row.body ? sanitize(mdToHtml(row.body)) : "");

// ---------- routing ----------
export async function loadContent(path) {
  const m = path.match(/^\/(events|news|guides)(?:\/([a-z0-9-]+))?(\.ics)?$/);
  if (!m) return null;
  const [, kind, slug, ics] = m;
  if (ics && kind !== "events") return null;
  return { kind, slug, ics: !!ics };
}
export async function renderContent({ kind, slug, ics }) {
  if (kind === "events") return slug ? (ics ? eventIcs(slug) : eventPage(slug)) : eventsList();
  if (kind === "news") return slug ? articlePage(slug) : newsList();
  if (kind === "guides") return slug ? guidePage(slug) : guidesList();
  return null;
}

// ---------- events ----------
const evSelect = "*,venue_info:venues(*)";
async function eventPage(slug) {
  const [rows, partners] = await Promise.all([q(`events?select=${evSelect}&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const e = rows[0]; if (!e) return null;
  const now = new Date().toISOString();
  const past = e.ends_at < now;
  const more = await q(`events?select=${evSelect}&ends_at=gte.${now}&id=neq.${e.id}&order=starts_at&limit=3`);
  const v = e.venue_info;
  const type = EVENT_TYPES[e.event_type] || e.event_type;
  const when = dayKey(e.starts_at) === dayKey(e.ends_at) ? `${longDate(e.starts_at)}` : `${longDate(e.starts_at)} to ${longDate(e.ends_at)}`;
  const crumbs = [["Home", "/"], ["Events", "/events"], [e.title, `/events/${e.slug}`]];
  const isFree = !e.price_pence;
  const bookLabel = e.ticket_status === "sold_out" ? "Sold out" : isFree ? "RSVP for free" : "Book tickets";
  const book = past ? `<p class="ep-note">This event has finished. <a href="/events">See upcoming events</a>.</p>`
    : e.ticket_status === "sold_out" ? `<span class="btn ep-book disabled" aria-disabled="true">Sold out</span>`
    : e.ticket_url ? `<a class="btn red ep-book" href="${E(e.ticket_url)}"${/^https?:/.test(e.ticket_url) ? ' target="_blank" rel="noopener"' : ""}>${bookLabel} ${ARROW}</a>`
    : `<p class="ep-note">${isFree ? "RSVP" : "Booking"} opens soon. <a href="#newsletter">Get the newsletter</a> to hear first.</p>`;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(e.title)}&dates=${icsDate(e.starts_at)}/${icsDate(e.ends_at)}&details=${enc((e.summary || "") + "\n\n" + SITE + "/events/" + e.slug)}&location=${enc(v ? [v.name, v.address_line, v.town, v.postcode].filter(Boolean).join(", ") : e.venue)}`;
  const d = v ? directions(v) : null;
  const addr = v ? [v.address_line, v.town, v.postcode].filter(Boolean).join(", ") || v.county || "" : "";

  const side = `<aside class="ep-card" aria-label="Event details">
    <div class="ep-row"><span class="ep-ic" aria-hidden="true">${IC.cal}</span><div><strong>${E(when)}</strong><span>${hhmm(e.starts_at)} to ${hhmm(e.ends_at)}</span></div></div>
    <div class="ep-row"><span class="ep-ic" aria-hidden="true">${IC.pin}</span><div><strong>${E(v?.name || e.venue)}</strong><span>${E(addr)}${v?.approximate ? " (approximate)" : ""}</span></div></div>
    <div class="ep-row"><span class="ep-ic" aria-hidden="true">${IC.tix}</span><div><strong>${money(e.price_pence)}${e.members_only ? " · Members only" : ""}</strong><span>${E(TICKET[e.ticket_status] || "")}</span></div></div>
    ${book}
    ${past ? "" : `<div class="ep-cal"><span>Add to calendar:</span> <a href="${E(gcal)}" target="_blank" rel="noopener">Google</a> · <a href="/events/${E(e.slug)}.ics">Apple / Outlook</a></div>`}
    ${d ? `<div class="ep-dir"><span>Directions:</span> <a href="${E(d.google)}" target="_blank" rel="noopener">Google Maps</a> · <a href="${E(d.apple)}" target="_blank" rel="noopener">Apple Maps</a> · <a href="${E(d.waze)}" target="_blank" rel="noopener">Waze</a></div>` : ""}
    <div class="ep-share"><span>Share:</span> <a href="https://www.facebook.com/sharer/sharer.php?u=${enc(SITE + "/events/" + e.slug)}" target="_blank" rel="noopener">Facebook</a> · <a href="https://wa.me/?text=${enc(e.title + " " + SITE + "/events/" + e.slug)}" target="_blank" rel="noopener">WhatsApp</a> · <a href="mailto:?subject=${enc(e.title)}&body=${enc(SITE + "/events/" + e.slug)}">Email</a></div>
  </aside>`;

  const rich = body(e);
  const main = `<div class="ep-main">
    ${e.summary ? `<p class="ep-lead">${E(e.summary)}</p>` : ""}
    ${rich ? `<div class="rich">${rich}</div>` : `<div class="rich"><p>More details coming soon.</p></div>`}
    ${e.schedule?.length ? `<h2 class="ep-h">On the day</h2><ol class="ep-sched">${e.schedule.map((l) => { const mm = l.match(/^(\d{1,2}[:.]\d{2})\s*[-–:]?\s*(.*)$/); return `<li>${mm ? `<time>${E(mm[1].replace(".", ":"))}</time><span>${E(mm[2])}</span>` : `<span>${E(l)}</span>`}</li>`; }).join("")}</ol>` : ""}
    <div class="ep-two">
      ${e.what_to_bring?.length ? `<div class="lp-panel"><h3>What to bring</h3><ul class="ticks">${e.what_to_bring.map((x) => `<li>${E(x)}</li>`).join("")}</ul></div>` : ""}
      ${e.accessibility || v?.access || v?.parking ? `<div class="lp-panel"><h3>Access and parking</h3>${e.accessibility || v?.access ? `<p>${E(e.accessibility || v.access)}</p>` : ""}${v?.parking ? `<p><strong>Parking:</strong> ${E(v.parking)}</p>` : ""}</div>` : ""}
    </div>
    <div class="ep-first"><div><strong>First time at a meet?</strong> Find out what to expect, from parking to etiquette.</div><a class="btn ghost small" href="/guides/your-first-car-meet">Read the guide</a></div>
  </div>`;

  const mapHTML = v && v.lat != null ? `<section class="lp-sec" id="venue"><div class="wrap"><h2>Getting there</h2>
    <div class="ep-venue"><div id="epmap" class="lp-map ep-map" role="region" aria-label="Map of ${E(v.name)}" data-lat="${v.lat}" data-lng="${v.lng}" data-name="${E(v.name)}"><p>Loading the map…</p></div>
      <div class="lp-panel"><h3>${E(v.name)}</h3><p class="lp-addr">${E(addr)}${v.approximate ? ` <span class="lp-approx">Approximate location</span>` : ""}</p>
        ${v.parking ? `<p><strong>Parking:</strong> ${E(v.parking)}</p>` : ""}${v.access ? `<p><strong>Access:</strong> ${E(v.access)}</p>` : ""}
        <div class="lp-dir"><a class="btn red small" href="${E(d.google)}" target="_blank" rel="noopener">Google Maps</a><a class="btn ghost small" href="${E(d.apple)}" target="_blank" rel="noopener">Apple Maps</a><a class="btn ghost small" href="${E(d.waze)}" target="_blank" rel="noopener">Waze</a></div></div></div>
    <p class="lp-legend">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>
    ${MAP_SCRIPT}</div></section>` : "";

  const html = [crumbsHTML(crumbs),
    `<section class="phero ep-hero"><img class="bg" src="${E(img(e.image_path) || "/homepage/hero.webp")}" alt="${E(e.image_alt || "")}"><div class="wrap"><span class="eyebrow">${E(type)}${e.county ? ` · ${E(e.town || e.county)}` : ""}</span><h1>${E(e.title)}</h1>
      <p class="ep-when">${E(when)} · ${hhmm(e.starts_at)} to ${hhmm(e.ends_at)} · ${E(v?.name || e.venue)}</p>${past ? `<span class="ep-past">This event has finished</span>` : ""}</div></section>`,
    `<section class="lp-sec ep"><div class="wrap ep-grid">${main}${side}</div></section>`,
    mapHTML,
    more.length ? `<section class="lp-sec"><div class="wrap"><h2>More upcoming events</h2><div class="evs">${more.map(eventCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/events">See all events ${ARROW}</a></div></div></section>` : "",
    newsletterHTML()].join("\n");

  const loc = v ? { "@type": "Place", name: v.name, address: { "@type": "PostalAddress", streetAddress: v.address_line || undefined, addressLocality: v.town || undefined, postalCode: v.postcode || undefined, addressRegion: v.county || undefined, addressCountry: "GB" },
    ...(v.lat != null && !v.approximate ? { geo: { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng } } : {}) } : { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressRegion: e.county || "Norfolk", addressCountry: "GB" } };
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.summary || clip(plain(rich)), startDate: e.starts_at, endDate: e.ends_at,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: loc, image: e.image_path ? [SITE + img(e.image_path)] : undefined,
    organizer: { "@type": "Organization", name: "Cars and Coffee UK", url: SITE },
    offers: { "@type": "Offer", price: ((e.price_pence || 0) / 100).toFixed(2), priceCurrency: "GBP", url: e.ticket_url || `${SITE}/events/${e.slug}`, availability: e.ticket_status === "sold_out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" } }];
  return shell({ title: e.meta_title || `${e.title}, ${fmt(e.starts_at, { day: "numeric", month: "short", year: "numeric" })} | Cars and Coffee UK`, description: e.meta_description || e.summary || clip(plain(rich)) || `${type} at ${e.venue}`,
    path: `/events/${e.slug}`, image: e.image_path, noindex: false, ld, main: html, partners });
}

async function eventsList() {
  const now = new Date().toISOString();
  const [events, partners] = await Promise.all([q(`events?select=${evSelect}&ends_at=gte.${now}&order=starts_at&limit=100`), partnersQ()]);
  const types = [...new Set(events.map((e) => e.event_type))];
  const groups = [];
  for (const e of events) { const k = monthLabel(e.starts_at); let g = groups.find((x) => x.k === k); if (!g) groups.push((g = { k, items: [] })); g.items.push(e); }
  const crumbs = [["Home", "/"], ["Events", "/events"]];
  const html = [crumbsHTML(crumbs),
    `<section class="phero"><img class="bg" src="/homepage/hero.webp" alt=""><div class="wrap"><span class="eyebrow">Norfolk and Suffolk</span><h1>Car meets and events</h1><p>Breakfast meets, classic runs, garage nights and race nights. Most morning meets are free: just RSVP and turn up.</p></div></section>`,
    `<section class="lp-sec"><div class="wrap">
      ${types.length > 1 ? `<div class="ev-filter" role="group" aria-label="Filter events"><button class="on" data-f="">All</button>${types.map((t) => `<button data-f="${E(t)}">${E(EVENT_TYPES[t] || t)}</button>`).join("")}</div>` : ""}
      ${groups.length ? groups.map((g) => `<div class="ev-month"><h2>${E(g.k)}</h2><div class="evs">${g.items.map(eventCard).join("")}</div></div>`).join("") : `<p class="lp-empty">No events scheduled right now. Join the newsletter to hear about the next one.</p>`}
      <p class="ev-empty" hidden>No events of that type coming up.</p>
      <script>(function(){var b=document.querySelectorAll('.ev-filter button');b.forEach(function(x){x.onclick=function(){b.forEach(function(y){y.classList.toggle('on',y===x)});var f=x.getAttribute('data-f'),any=false;document.querySelectorAll('.ev-month').forEach(function(m){var n=0;m.querySelectorAll('.ev').forEach(function(c){var s=!f||c.getAttribute('data-type')===f;c.hidden=!s;if(s)n++;});m.hidden=!n;if(n)any=true;});document.querySelector('.ev-empty').hidden=any;};});})();</script>
    </div></section>`,
    `<section class="lp-sec"><div class="wrap ep-first"><div><strong>New to car meets?</strong> Our first-timer's guide covers parking, etiquette and what to bring.</div><a class="btn ghost small" href="/guides/your-first-car-meet">Read the guide</a></div></section>`,
    newsletterHTML()].join("\n");
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "ItemList", name: "Upcoming car meets and events", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/events/${e.slug}`, name: e.title })) }];
  return shell({ title: "Car meets and events in Norfolk and Suffolk | Cars and Coffee UK", description: "Upcoming car meets, breakfast meets, classic runs and garage nights across Norfolk and Suffolk. Most morning meets are free.", path: "/events", ld, main: html, partners });
}

const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);
async function eventIcs(slug) {
  const rows = await q(`events?select=${evSelect}&slug=eq.${enc(slug)}&limit=1`);
  const e = rows[0]; if (!e) return null;
  const v = e.venue_info;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cars and Coffee UK//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${e.id}@carsandcoffee.uk`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(e.starts_at)}`, `DTEND:${icsDate(e.ends_at)}`, `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText((e.summary ? e.summary + "\n\n" : "") + SITE + "/events/" + e.slug)}`, `LOCATION:${icsText(v ? [v.name, v.address_line, v.town, v.postcode].filter(Boolean).join(", ") : e.venue)}`,
    `URL:${SITE}/events/${e.slug}`, ...(v && v.lat != null && !v.approximate ? [`GEO:${v.lat};${v.lng}`] : []), "END:VEVENT", "END:VCALENDAR"];
  return { ics: lines.map((l) => (l.length > 74 ? l.match(/.{1,74}/g).join("\r\n ") : l)).join("\r\n") + "\r\n", filename: `${e.slug}.ics` };
}

// ---------- news ----------
async function articlePage(slug) {
  const [rows, partners] = await Promise.all([q(`articles?select=*&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const a = rows[0]; if (!a) return null;
  const related = await q(`articles?select=slug,title,category,excerpt,image_path,image_alt,published_at,read_minutes&id=neq.${a.id}&order=published_at.desc&limit=3`);
  const rich = body(a);
  const crumbs = [["Home", "/"], ["News", "/news"], [a.title, `/news/${a.slug}`]];
  const date = a.published_at ? fmt(a.published_at, { day: "numeric", month: "long", year: "numeric" }) : "";
  const url = `${SITE}/news/${a.slug}`;
  const html = [crumbsHTML(crumbs),
    `<article class="art"><header class="art-head wrap"><span class="eyebrow">${E(a.category || "News")}</span><h1>${E(a.title)}</h1>${a.excerpt ? `<p class="art-dek">${E(a.excerpt)}</p>` : ""}
      <p class="art-meta">${a.author ? `By ${E(a.author)} · ` : ""}${date ? `<time datetime="${E(a.published_at)}">${E(date)}</time>` : ""}${a.read_minutes ? ` · ${a.read_minutes} min read` : ""}</p></header>
      ${a.image_path ? `<figure class="art-fig wrap"><img src="${E(img(a.image_path))}" alt="${E(a.image_alt || "")}" width="1200" height="640"></figure>` : ""}
      <div class="art-body wrap"><div class="rich">${rich || "<p>Full story coming soon.</p>"}</div>
        <div class="art-share"><span>Share:</span> <a href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener">Facebook</a> · <a href="https://wa.me/?text=${enc(a.title + " " + url)}" target="_blank" rel="noopener">WhatsApp</a> · <a href="https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(a.title)}" target="_blank" rel="noopener">X</a> · <a href="mailto:?subject=${enc(a.title)}&body=${enc(url)}">Email</a></div>
        <div class="ep-first"><div><strong>Into this kind of thing?</strong> Join the Cars and Coffee club to share your own car and chat with members.</div><a class="btn red small" href="${CLUB}/apply">Join the club</a></div></div></article>`,
    related.length ? `<section class="lp-sec"><div class="wrap"><h2>More stories</h2><div class="news-grid">${related.map(newsCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/news">All news ${ARROW}</a></div></div></section>` : "",
    newsletterHTML()].join("\n");
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.excerpt || clip(plain(rich)), datePublished: a.published_at, mainEntityOfPage: url,
    image: a.image_path ? [SITE + img(a.image_path)] : undefined, author: { "@type": a.author && a.author !== "Cars and Coffee team" ? "Person" : "Organization", name: a.author || "Cars and Coffee UK" },
    publisher: { "@type": "Organization", name: "Cars and Coffee UK", logo: { "@type": "ImageObject", url: `${SITE}/favicon.svg` } } }];
  return shell({ title: a.meta_title || `${a.title} | Cars and Coffee UK`, description: a.meta_description || a.excerpt || clip(plain(rich)), path: `/news/${a.slug}`, image: a.image_path, ld, main: html, partners });
}
const newsCard = (a) => `<a class="news-card" href="/news/${E(a.slug)}">${a.image_path ? `<img src="${E(img(a.image_path))}" alt="${E(a.image_alt || "")}" loading="lazy" width="600" height="340">` : ""}<div class="pad"><small>${E(a.category || "News")}${a.published_at ? ` · ${E(fmt(a.published_at, { day: "numeric", month: "short", year: "numeric" }))}` : ""}</small><h3>${E(a.title)}</h3>${a.excerpt ? `<p>${E(a.excerpt)}</p>` : ""}<span class="more">Read more ${ARROW}</span></div></a>`;
async function newsList() {
  const [arts, partners] = await Promise.all([q("articles?select=slug,title,category,excerpt,image_path,image_alt,published_at,read_minutes,featured&order=published_at.desc&limit=60"), partnersQ()]);
  const crumbs = [["Home", "/"], ["News", "/news"]];
  const [lead, ...rest] = arts;
  const cats = [...new Set(arts.map((a) => a.category).filter(Boolean))];
  const html = [crumbsHTML(crumbs),
    `<section class="lp-sec news-top"><div class="wrap"><span class="eyebrow red">From the club</span><h1 class="page-h1">News and stories</h1><p class="lp-lead">Restorations, racing, members' cars and practical guides from the Cars and Coffee community.</p>
      ${lead ? `<a class="news-lead" href="/news/${E(lead.slug)}">${lead.image_path ? `<img src="${E(img(lead.image_path))}" alt="${E(lead.image_alt || "")}" width="900" height="500">` : ""}<div class="pad"><small>${E(lead.category || "News")} · ${E(fmt(lead.published_at, { day: "numeric", month: "long", year: "numeric" }))}</small><h2>${E(lead.title)}</h2>${lead.excerpt ? `<p>${E(lead.excerpt)}</p>` : ""}<span class="more">Read the story ${ARROW}</span></div></a>` : `<p class="lp-empty">No stories yet.</p>`}
    </div></section>`,
    rest.length ? `<section class="lp-sec"><div class="wrap">${cats.length > 1 ? `<div class="ev-filter" role="group" aria-label="Filter stories"><button class="on" data-c="">All</button>${cats.map((c) => `<button data-c="${E(c)}">${E(c)}</button>`).join("")}</div>` : ""}
      <div class="news-grid">${rest.map((a) => newsCard(a).replace('<a class="news-card"', `<a class="news-card" data-c="${E(a.category || "")}"`)).join("")}</div>
      <script>(function(){var b=document.querySelectorAll('.ev-filter button');b.forEach(function(x){x.onclick=function(){b.forEach(function(y){y.classList.toggle('on',y===x)});var c=x.getAttribute('data-c');document.querySelectorAll('.news-card[data-c]').forEach(function(n){n.hidden=c&&n.getAttribute('data-c')!==c;});};});})();</script></div></section>` : "",
    newsletterHTML()].join("\n");
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: "News and stories", url: `${SITE}/news` }];
  return shell({ title: "Car news and stories | Cars and Coffee UK", description: "Restorations, racing, members' cars and practical classic car guides from the Cars and Coffee community in Norfolk and Suffolk.", path: "/news", ld, main: html, partners });
}

// ---------- guides ----------
async function guidePage(slug) {
  const [rows, partners] = await Promise.all([q(`guides?select=*&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const g = rows[0]; if (!g) return null;
  const now = new Date().toISOString();
  const [others, next] = await Promise.all([q(`guides?select=slug,title,intro,image_path,image_alt&id=neq.${g.id}&order=sort&limit=3`), q(`events?select=${evSelect}&ends_at=gte.${now}&order=starts_at&limit=3`)]);
  const rich = body(g);
  const heads = [...rich.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m, i) => ({ id: "s" + (i + 1), text: plain(m[1]) }));
  let n = 0; const withIds = rich.replace(/<h2>/g, () => `<h2 id="s${++n}">`);
  const crumbs = [["Home", "/"], ["Guides", "/guides"], [g.title, `/guides/${g.slug}`]];
  const html = [crumbsHTML(crumbs),
    `<section class="phero"><img class="bg" src="${E(img(g.image_path) || "/homepage/hero.webp")}" alt="${E(g.image_alt || "")}"><div class="wrap"><span class="eyebrow">Guide${g.read_minutes ? ` · ${g.read_minutes} min read` : ""}</span><h1>${E(g.title)}</h1>${g.intro ? `<p>${E(g.intro)}</p>` : ""}</div></section>`,
    `<section class="lp-sec"><div class="wrap guide-grid">
      ${heads.length > 2 ? `<nav class="guide-toc" aria-label="In this guide"><strong>In this guide</strong><ol>${heads.map((h) => `<li><a href="#${h.id}">${E(h.text)}</a></li>`).join("")}</ol></nav>` : "<div></div>"}
      <div class="rich guide-body">${withIds || "<p>Coming soon.</p>"}</div></div></section>`,
    next.length ? `<section class="lp-sec"><div class="wrap"><h2>Ready for your first meet?</h2><div class="evs">${next.map(eventCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/events">See all events ${ARROW}</a><a class="btn ghost" href="/car-meets">Car meets by town</a></div></div></section>` : "",
    others.length ? `<section class="lp-sec"><div class="wrap"><h2>More guides</h2><div class="news-grid">${others.map(guideCard).join("")}</div></div></section>` : "",
    newsletterHTML()].join("\n");
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.intro || clip(plain(rich)), dateModified: g.updated_at, datePublished: g.created_at, mainEntityOfPage: `${SITE}/guides/${g.slug}`,
    image: g.image_path ? [SITE + img(g.image_path)] : undefined, author: { "@type": "Organization", name: "Cars and Coffee UK" }, publisher: { "@type": "Organization", name: "Cars and Coffee UK" } }];
  return shell({ title: g.meta_title || `${g.title} | Cars and Coffee UK`, description: g.meta_description || g.intro || clip(plain(rich)), path: `/guides/${g.slug}`, image: g.image_path, ld, main: html, partners });
}
const guideCard = (g) => `<a class="news-card" href="/guides/${E(g.slug)}">${g.image_path ? `<img src="${E(img(g.image_path))}" alt="${E(g.image_alt || "")}" loading="lazy" width="600" height="340">` : ""}<div class="pad"><small>Guide</small><h3>${E(g.title)}</h3>${g.intro ? `<p>${E(g.intro)}</p>` : ""}<span class="more">Read the guide ${ARROW}</span></div></a>`;
async function guidesList() {
  const [guides, partners] = await Promise.all([q("guides?select=slug,title,intro,image_path,image_alt&order=sort"), partnersQ()]);
  const crumbs = [["Home", "/"], ["Guides", "/guides"]];
  const html = [crumbsHTML(crumbs),
    `<section class="lp-sec news-top"><div class="wrap"><span class="eyebrow red">Know-how</span><h1 class="page-h1">Guides</h1><p class="lp-lead">Practical help for car meets, ownership and getting involved.</p>
      ${guides.length ? `<div class="news-grid">${guides.map(guideCard).join("")}</div>` : `<p class="lp-empty">Guides coming soon.</p>`}</div></section>`,
    newsletterHTML()].join("\n");
  return shell({ title: "Guides | Cars and Coffee UK", description: "Practical guides from Cars and Coffee UK: your first car meet, meet etiquette, ownership tips and more.", path: "/guides", ld: [ldLink(crumbs)], main: html, partners });
}

// ---------- shared ----------
const IC = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  tix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>',
};
const MAP_SCRIPT = `<script>(function(){var el=document.getElementById('epmap');if(!el)return;var started=false;
  function css(h){var l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l);}
  function js(srcs,cb){var s=document.createElement('script');s.src=srcs[0];s.onload=cb;s.onerror=function(){if(srcs.length>1)js(srcs.slice(1),cb);else el.innerHTML='<p>The map could not load. Use the directions buttons.</p>';};document.head.appendChild(s);}
  function draw(){var lat=+el.dataset.lat,lng=+el.dataset.lng;el.innerHTML='';var map=L.map(el,{scrollWheelZoom:false}).setView([lat,lng],13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    L.circleMarker([lat,lng],{radius:11,color:'#fff',weight:3,fillColor:'#c00d0d',fillOpacity:1}).addTo(map).bindPopup(el.dataset.name.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}));}
  function start(){if(started)return;started=true;css('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');js(['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],draw);}
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start();}},{rootMargin:'300px'});io.observe(el);}else start();})();</script>`;

// ---------- sitemap (published, indexable pages only) ----------
export async function sitemap() {
  const now = new Date().toISOString();
  const [evs, arts, guides, pages] = await Promise.all([
    q(`events?select=slug,created_at,ends_at&ends_at=gte.${now}`), q("articles?select=slug,published_at"), q("guides?select=slug,updated_at"),
    q("pages?select=path,updated_at,noindex&status=eq.published&noindex=eq.false")]);
  const d = (x) => String(x || now).slice(0, 10);
  const urls = [["/", now, "daily", "1.0"], ["/events", now, "daily", "0.9"], ["/news", now, "daily", "0.7"], ["/guides", now, "weekly", "0.5"],
    ...evs.map((e) => [`/events/${e.slug}`, e.created_at, "weekly", "0.8"]), ...arts.map((a) => [`/news/${a.slug}`, a.published_at, "monthly", "0.6"]),
    ...guides.map((g) => [`/guides/${g.slug}`, g.updated_at, "monthly", "0.6"]), ...pages.map((p) => [p.path, p.updated_at, "weekly", "0.7"])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, m, f, pr]) => `  <url><loc>${SITE}${E(u)}</loc><lastmod>${d(m)}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`;
}
