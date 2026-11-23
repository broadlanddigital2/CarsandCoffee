// Event, news and guide pages (and their listing pages), rendered from the database inside the homepage's header and footer.
import { ORG, E, img, ARROW, q, eventCard, EVENT_TYPES, TICKET, money, fmt, nearYou, placesQ } from "./home.js";
import { shell, directions, newsletterHTML, crumbsHTML } from "./pages.js";
import { sanitize, safeUrl } from "./sanitize.js";
import { carsIndex } from "./standard.js";
import { shareBar, galleryOf, galleryHTML } from "./ui.js";
import { findAll } from "./assist.js";
import { basketPage, checkoutPage, shopHome, productPage, categoryPage as shopCategory, shopsIndex, storefront, sellPage, shopSitemap } from "./shop.js";
import { directoryHome, businessPage, servicePage, servicesIndex, regionPage, listYourBusiness, claimPage } from "./directory.js";
export { sanitize };

const SITE = "https://carsandcoffee.uk";
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
  if (path === "/cars") return { kind: "cars" };
  if (path === "/basket") return { kind: "basket" };
  if (path === "/checkout") return { kind: "checkout" };
  const sm = path.match(/^\/(shop|shops)(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?$/);
  if (sm) return { kind: sm[1], a: sm[2], b: sm[3] };
  const dm = path.match(/^\/directory(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?$/);
  if (dm) return { kind: "directory", a: dm[1], b: dm[2] };
  const m = path.match(/^\/(events|news|guides|galleries)(?:\/([a-z0-9-]+))?(\.ics)?$/);
  if (!m) return null;
  const [, kind, slug, ics] = m;
  if (ics && kind !== "events") return null;
  return { kind, slug, ics: !!ics };
}
export async function renderContent({ kind, slug, ics }) {
  if (kind === "events") return slug ? (ics ? eventIcs(slug) : eventPage(slug)) : eventsList();
  if (kind === "news") return slug ? (await articlePage(slug)) || (await categoryPage(slug)) : newsList();
  if (kind === "galleries") return slug ? galleryPage(slug) : galleriesList();
  if (kind === "cars") return carsIndex();
  if (kind === "directory") { const { a, b, params } = arguments[0];
    if (!a) return directoryHome(params || {});
    if (a === "list-your-business" && !b) return listYourBusiness();
    if (a === "services" && !b) return servicesIndex();
    if (a === "service" && b) return servicePage(b);
    if (a === "region" && b) return regionPage(b);
    if (a === "claim" && b) return claimPage(b);
    return b ? null : businessPage(a); }
  if (kind === "shop") { const { a, b, params } = arguments[0];
    if (!a) return shopHome(params || {});
    if (a === "category" && b) return shopCategory(b);
    if (a === "sell" && !b) return sellPage();
    return b ? null : productPage(a); }
  if (kind === "basket") return basketPage();
  if (kind === "checkout") return checkoutPage();
  if (kind === "shops") { const { a, b } = arguments[0]; return a ? storefront(a, b) : shopsIndex(); }
  if (kind === "search") return searchPage(arguments[0].q);
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
    ${shareBar(`${SITE}/events/${e.slug}`, e.title, { label: "Share" })}
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
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: loc, image: [e.image_path ? SITE + img(e.image_path) : SITE + "/og-home.jpg"],
    organizer: ORG,
    offers: { "@type": "Offer", price: ((e.price_pence || 0) / 100).toFixed(2), priceCurrency: "GBP", url: e.ticket_url || `${SITE}/events/${e.slug}`, availability: e.ticket_status === "sold_out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" } }];
  return shell({ title: e.meta_title || `${e.title}, ${fmt(e.starts_at, { day: "numeric", month: "short", year: "numeric" })} | Cars and Coffee UK`, description: e.meta_description || e.summary || clip(plain(rich)) || `${type} at ${e.venue}`,
    path: `/events/${e.slug}`, image: e.image_path, noindex: false, ld, main: html, partners });
}

async function eventsList() {
  const now = new Date().toISOString();
  const [events, partners, places] = await Promise.all([q(`events?select=${evSelect}&ends_at=gte.${now}&order=starts_at&limit=100`), partnersQ(), placesQ()]);
  const types = [...new Set(events.map((e) => e.event_type))];
  const groups = [];
  for (const e of events) { const k = monthLabel(e.starts_at); let g = groups.find((x) => x.k === k); if (!g) groups.push((g = { k, items: [] })); g.items.push(e); }
  const crumbs = [["Home", "/"], ["Events", "/events"]];
  const html = [crumbsHTML(crumbs),
    `<section class="phero"><img class="bg" src="/homepage/hero.webp" alt=""><div class="wrap"><span class="eyebrow">Norfolk and Suffolk</span><h1>Car meets and events</h1><p>Breakfast meets, classic runs, garage nights and race nights. Most morning meets are free: just RSVP and turn up.</p></div></section>`,
    `<section class="lp-sec"><div class="wrap">
      ${nearYou(places)}
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
  const [related, nextRows] = await Promise.all([q(`articles?select=slug,title,category,excerpt,image_path,image_alt,published_at,read_minutes&id=neq.${a.id}&order=published_at.desc&limit=3`),
    q(`events?select=slug,title,starts_at,venue&ends_at=gte.${new Date().toISOString()}&order=starts_at&limit=1`)]);
  const nextEv = nextRows[0];
  const rich = body(a);
  const crumbs = [["Home", "/"], ["News", "/news"], [a.title, `/news/${a.slug}`]];
  const date = a.published_at ? fmt(a.published_at, { day: "numeric", month: "long", year: "numeric" }) : "";
  const url = `${SITE}/news/${a.slug}`;
  const gallery = galleryOf(a.gallery);
  const html = [crumbsHTML(crumbs),
    `<article class="art"><header class="phero art-hero"><img class="bg" src="${E(img(a.image_path) || "/homepage/hero.webp")}" alt="${E(a.image_alt || "")}"><div class="wrap"><span class="eyebrow">${E(a.category || "News")}</span><h1>${E(a.title)}</h1>${a.excerpt ? `<p>${E(a.excerpt)}</p>` : ""}
      <p class="art-meta">${a.author ? `By ${E(a.author)} · ` : ""}${date ? `<time datetime="${E(a.published_at)}">${E(date)}</time>` : ""}${a.read_minutes ? ` · ${a.read_minutes} min read` : ""}${gallery.length ? ` · ${gallery.length} photos` : ""}</p>${shareBar(url, a.title, { light: true })}</div></header>
      <section class="lp-sec"><div class="wrap ep-grid art-grid"><div class="art-main"><div class="rich">${rich || "<p>Full story coming soon.</p>"}</div>${galleryHTML(gallery, a.title)}<div class="art-end">${shareBar(url, a.title, { label: "Enjoyed this? Share it" })}</div></div>
        <aside class="art-side">
          <div class="ep-card"><div class="art-join"><h3>Into this kind of thing?</h3><p>Join the Cars and Coffee club to share your own car, post photos and chat with members.</p><a class="btn red small" href="${CLUB}/apply">Join the club ${ARROW}</a></div></div>
          ${nextEv ? `<div class="ep-card art-next"><small>Next meet</small><h3><a href="/events/${E(nextEv.slug)}">${E(nextEv.title)}</a></h3><p>${E(longDate(nextEv.starts_at))} · ${E(nextEv.venue)}</p><a class="btn ghost small" href="/events/${E(nextEv.slug)}">See details</a></div>` : ""}
        </aside></div></section></article>`,
    related.length ? `<section class="lp-sec"><div class="wrap"><h2>More stories</h2><div class="news-grid">${related.map(newsCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/news">All news ${ARROW}</a></div></div></section>` : "",
    newsletterHTML()].join("\n");
  const ld = [ldLink(crumbs), { "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.excerpt || clip(plain(rich)), datePublished: a.published_at, mainEntityOfPage: url,
    image: [a.image_path, ...gallery.map((x) => x.src)].filter(Boolean).slice(0, 6).map((x) => (x.startsWith("http") ? x : SITE + img(x))), author: { "@type": a.author && a.author !== "Cars and Coffee team" ? "Person" : "Organization", name: a.author || "Cars and Coffee UK" },
    publisher: ORG }];
  return shell({ title: a.meta_title || `${a.title} | Cars and Coffee UK`, description: a.meta_description || a.excerpt || clip(plain(rich)), path: `/news/${a.slug}`, image: a.image_path || gallery[0]?.src, ld, main: html, partners, ogType: "article", published: a.published_at });
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
    image: g.image_path ? [SITE + img(g.image_path)] : undefined, author: ORG, publisher: ORG }];
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
  return shell({ title: "Guides | Cars and Coffee UK", description: "Practical guides from Cars and Coffee UK: your first car meet, meet etiquette, ownership tips and more.", path: "/guides", ld: [ldLink(crumbs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: guides.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/guides/" + x.slug })) }], main: html, partners });
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
  const [gals, biz, svcs] = await Promise.all([q("gallery_items?select=slug").catch(() => []), q("directory_listings?select=slug,updated_at").catch(() => []), q("directory_services?select=slug").catch(() => [])]);
  const [evs, arts, guides, pages] = await Promise.all([
    q(`events?select=slug,created_at,ends_at&ends_at=gte.${now}`), q("articles?select=slug,published_at"), q("guides?select=slug,updated_at"),
    q("pages?select=path,updated_at,noindex&status=eq.published&noindex=eq.false")]);
  const d = (x) => String(x || now).slice(0, 10);
  const urls = [["/", now, "daily", "1.0"], ["/events", now, "daily", "0.9"], ["/news", now, "daily", "0.7"], ["/guides", now, "weekly", "0.5"], ["/galleries", now, "weekly", "0.4"], ["/directory", now, "weekly", "0.8"], ["/directory/services", now, "monthly", "0.5"], ["/directory/list-your-business", now, "monthly", "0.5"],
    ...biz.map((b) => [`/directory/${b.slug}`, b.updated_at, "monthly", "0.6"]), ...svcs.map((s) => [`/directory/service/${s.slug}`, now, "weekly", "0.6"]), ["/cars", now, "monthly", "0.5"], ...gals.map((g) => [`/galleries/${g.slug}`, now, "monthly", "0.3"]),
    ...evs.map((e) => [`/events/${e.slug}`, e.created_at, "weekly", "0.8"]), ...arts.map((a) => [`/news/${a.slug}`, a.published_at, "monthly", "0.6"]),
    ...guides.map((g) => [`/guides/${g.slug}`, g.updated_at, "monthly", "0.6"]), ...pages.map((p) => [p.path, p.updated_at, "weekly", "0.7"]), ...(await shopSitemap().catch(() => []))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, m, f, pr]) => `  <url><loc>${SITE}${E(u)}</loc><lastmod>${d(m)}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`;
}

// ---------- news categories (/news/technical, /news/wec, /news/features) ----------
const catSlug = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const CAT_ALIASES = { wec: ["wec", "endurance", "le mans"], features: null };
async function categoryPage(slug) {
  const all = await q("articles?select=slug,title,category,excerpt,image_path,image_alt,published_at,featured&order=published_at.desc&limit=200");
  let list, name;
  if (slug === "features") { list = all.filter((a) => a.featured || /feature|people|restoration/i.test(a.category || "")); name = "Features"; }
  else {
    const al = CAT_ALIASES[slug];
    list = all.filter((a) => catSlug(a.category) === slug || (al && al.some((x) => (a.category || "").toLowerCase().includes(x))));
    name = list[0]?.category || (slug === "wec" ? "WEC and endurance" : null);
  }
  if (!name) return null;
  const partners = await partnersQ();
  const cats = [...new Set(all.map((a) => a.category).filter(Boolean))];
  const crumbs = [["Home", "/"], ["News", "/news"], [name, `/news/${slug}`]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec news-top"><div class="wrap"><span class="eyebrow red">News</span><h1 class="page-h1">${E(name)}</h1>
    <div class="ev-filter" role="navigation" aria-label="News categories"><a class="${""}" href="/news">All</a>${cats.map((x) => `<a class="${catSlug(x) === slug ? "on" : ""}" href="/news/${catSlug(x)}">${E(x)}</a>`).join("")}</div>
    ${list.length ? `<div class="news-grid">${list.map(newsCard).join("")}</div>` : `<p class="lp-empty">No ${E(name.toLowerCase())} stories yet. <a href="/news">See all news</a>.</p>`}</div></section>`, newsletterHTML()].join("\n");
  return shell({ title: `${name}: car news and stories | Cars and Coffee UK`, description: `${name} stories from the Cars and Coffee community in Norfolk and Suffolk.`, path: `/news/${slug}`, ld: [ldLink(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name, url: `${SITE}/news/${slug}` }], main, partners });
}

// ---------- galleries ----------
async function galleriesList() {
  const [items, partners] = await Promise.all([q("gallery_items?select=slug,title,image_path,image_alt,description,photos&order=sort"), partnersQ()]);
  const crumbs = [["Home", "/"], ["Galleries", "/galleries"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec news-top"><div class="wrap"><span class="eyebrow red">Photos</span><h1 class="page-h1">Galleries</h1><p class="lp-lead">Photos from our meets, drives and members' garages.</p>
    ${items.length ? `<div class="gl-grid">${items.map((g) => `<a class="gl-card" href="/galleries/${E(g.slug)}"><img src="${E(img(g.image_path))}" alt="${E(g.image_alt || "")}" loading="lazy"><span><strong>${E(g.title)}</strong><small>${(g.photos || []).length ? `${(g.photos || []).length + 1} photos` : "View"}</small></span></a>`).join("")}</div>` : `<p class="lp-empty">Galleries coming soon.</p>`}
    <div class="ep-first" style="margin-top:28px"><div><strong>Got great shots from a meet?</strong> Share them with members in the Cars and Coffee club.</div><a class="btn ghost small" href="${CLUB}/apply">Join the club</a></div></div></section>`, newsletterHTML()].join("\n");
  return shell({ title: "Car photo galleries | Cars and Coffee UK", description: "Photo galleries from Cars and Coffee meets, drives and members' cars across Norfolk and Suffolk.", path: "/galleries", ld: [ldLink(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: "Galleries", url: `${SITE}/galleries` }], main, partners });
}
async function galleryPage(slug) {
  const [rows, partners] = await Promise.all([q(`gallery_items?select=*&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const g = rows[0]; if (!g) return null;
  const others = await q(`gallery_items?select=slug,title,image_path,image_alt&slug=neq.${enc(slug)}&order=sort&limit=4`).catch(() => []);
  const photos = galleryOf([{ src: g.image_path, alt: g.image_alt, caption: "" }, ...(g.photos || [])]);
  const crumbs = [["Home", "/"], ["Galleries", "/galleries"], [g.title, `/galleries/${g.slug}`]];
  const url = `${SITE}/galleries/${g.slug}`;
  const main = [crumbsHTML(crumbs), `<section class="phero"><img class="bg" src="${E(img(g.image_path))}" alt="${E(g.image_alt || "")}"><div class="wrap"><span class="eyebrow">Gallery · ${photos.length} photo${photos.length === 1 ? "" : "s"}</span><h1>${E(g.title)}</h1>${g.description ? `<p>${E(g.description)}</p>` : ""}${shareBar(url, g.title, { light: true })}</div></section>`,
    `<section class="lp-sec"><div class="wrap">${galleryHTML(photos, g.title).replace('<h2 id="gal-h">Gallery', '<h2 id="gal-h">Photos')}${photos.length < 2 ? `<p class="lp-empty">More photos coming soon.</p>` : ""}</div></section>`,
    others.length ? `<section class="lp-sec"><div class="wrap"><h2>More galleries</h2><div class="gl-grid">${others.map((o) => `<a class="gl-card" href="/galleries/${E(o.slug)}"><img src="${E(img(o.image_path))}" alt="${E(o.image_alt || "")}" loading="lazy"><span><strong>${E(o.title)}</strong></span></a>`).join("")}</div></div></section>` : "",
    newsletterHTML()].join("\n");
  return shell({ title: `${g.title}: photo gallery | Cars and Coffee UK`, description: g.description || `Photos: ${g.title}, from the Cars and Coffee community.`, path: `/galleries/${g.slug}`, image: g.image_path,
    ld: [ldLink(crumbs), { "@context": "https://schema.org", "@type": "ImageGallery", name: g.title, url, image: photos.slice(0, 10).map((x) => (x.src.startsWith("http") ? x.src : SITE + x.src)) }], main, partners });
}

// ---------- search page (works without JavaScript; the header search uses /api/search) ----------
async function searchPage(qs) {
  const term = String(qs || "").slice(0, 120).trim();
  const [results, partners] = await Promise.all([term ? findAll(term, 8).catch(() => []) : [], partnersQ()]);
  const main = [crumbsHTML([["Home", "/"], ["Search", "/search"]]), `<section class="lp-sec news-top"><div class="wrap std-narrow"><h1 class="page-h1">Search</h1>
    <form action="/search" method="get" role="search" class="sp-form"><input name="q" value="${E(term)}" placeholder="Search events, towns, guides, news…" aria-label="Search"><button class="btn red" type="submit">Search</button></form>
    ${term ? (results.length ? `<p class="lp-lead">${results.length} result${results.length === 1 ? "" : "s"} for “${E(term)}”</p><ul class="sp-list">${results.map((r) => `<li><a href="${E(r.url)}">${r.img ? `<img src="${E(r.img)}" alt="" loading="lazy">` : ""}<span><small>${E(r.type)}</small><strong>${E(r.title)}</strong>${r.text ? `<span>${E(r.text)}</span>` : ""}</span></a></li>`).join("")}</ul>` : `<p class="lp-lead">Nothing matched “${E(term)}”. Try a different word, or ask our help chat.</p>`) : `<p class="lp-lead">Type what you're looking for: a town, an event, a guide or a type of business.</p>`}
  </div></section>`].join("\n");
  return shell({ title: term ? `Search: ${term} | Cars and Coffee UK` : "Search | Cars and Coffee UK", description: "Search Cars and Coffee UK.", path: "/search", noindex: true, ld: [], main, partners });
}
