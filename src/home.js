// Renders the homepage from the Cars and Coffee database (Supabase, schema "site") using src/home-template.html.
// Everything editable in admin.carsandcoffee.uk shows up here: block order/visibility, block text, events, news, partners, etc.
import TEMPLATE from "./home-template.html";
import BLOCKS from "./blocks.json";

const SB_URL = "https://mslidnchoopgsnbraaxe.supabase.co";
const SB_KEY = "sb_publishable_O9p-X8To8z-GisYYSBKoxg_RxAe1-cU"; // publishable key: public read of published content only
const SITE = "https://carsandcoffee.uk";
const TZ = "Europe/London";

export const EVENT_TYPES = { meet: "Meet", race: "Race night", tour: "Tour", garage: "Garage night", watch: "Watch party", track: "Track day", show: "Show" };
export const TICKET = { free_rsvp: "Free · RSVP", selling_fast: "Selling fast", on_sale: "On sale", sold_out: "Sold out" };
export const ORG = { "@type": "Organization", "@id": "https://carsandcoffee.uk/#org", name: "Cars and Coffee UK", url: "https://carsandcoffee.uk/", logo: { "@type": "ImageObject", url: "https://carsandcoffee.uk/logo.png", width: 168, height: 164 }, areaServed: ["Norfolk", "Suffolk"] };
export const ARROW = '<svg class="ar" viewBox="0 0 20 12" aria-hidden="true"><path d="M0 6h17M12 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
export const SVC_ICON = {
  restoration: '<path d="M14 6a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-2 2-2-1-1-2z"/>',
  servicing: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  tuning: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.5"/>',
  bodywork: '<path d="M3 15l2-5 4-2h6l4 4 2 1v2H3z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>',
  "wraps-graphics": '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
  detailing: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  tyres: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
  storage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
};
export const SVC_DEFAULT = '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>';

export const E = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const img = (p) => !p ? "" : /^https?:\/\//.test(p) || p.startsWith("/") ? p : "/" + p;
export const money = (p) => !p ? "Free" : ("£" + (p / 100).toFixed(2)).replace(".00", "");
export const fmt = (d, o) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o }).format(new Date(d));
const dow = (d) => fmt(d, { weekday: "short" });
const dm = (d) => fmt(d, { day: "numeric", month: "short" });
const ukdate = (d) => `${dow(d)} ${fmt(d, { day: "numeric", month: "short", year: "numeric" })}`;
const hhmm = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false });
const sameDay = (a, b) => fmt(a, { year: "numeric", month: "2-digit", day: "2-digit" }) === fmt(b, { year: "numeric", month: "2-digit", day: "2-digit" });
export const utm = (u, medium, camp) => !u ? "#" : u.startsWith("/") ? u : `${u}${u.includes("?") ? "&amp;" : "?"}utm_source=carsandcoffee&amp;utm_medium=${medium}&amp;utm_campaign=${camp}`;
const link = (text, href) => `<a class="more" href="${href}">${text} ${ARROW}</a>`;
const slug = (x) => String(x).toLowerCase().replace(/ and /g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function q(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Accept-Profile": "site" }, cf: { cacheTtl: 0 } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status}`);
  return r.json();
}

export const eventCard = (e) => {
  const when = sameDay(e.starts_at, e.ends_at) ? ukdate(e.starts_at) : `${dm(e.starts_at)} – ${ukdate(e.ends_at)}`;
  const tcls = { selling_fast: "hot", sold_out: "out" }[e.ticket_status] || "";
  return `<article class="ev" data-type="${E(e.event_type)}"><a href="/events/${E(e.slug)}">
<div class="ph"><img src="${E(img(e.image_path))}" alt="${E(e.image_alt)}" width="600" height="250" loading="lazy"><span class="tag">${E(EVENT_TYPES[e.event_type] || e.event_type)}</span></div>
<div class="evb"><div class="date"><b>${dow(e.starts_at)}</b><span>${dm(e.starts_at)}</span></div>
<div><h3>${E(e.title)}</h3><p class="meta">${E(e.venue)}</p><p class="meta">${when} · ${hhmm(e.starts_at)}–${hhmm(e.ends_at)}</p>
<p class="price"><span>${money(e.price_pence)}</span><span class="ts ${tcls}">${E(TICKET[e.ticket_status] || e.ticket_status)}</span></p></div></div></a></article>`;
};

// Town search with a styled suggestions list (replaces the browser's plain datalist).
// items: [{ t: town, c: county, h: link, live: has its own page }]
let tsN = 0;
export function townSearch(items, { placeholder = "Your town, e.g. Norwich", button = "Find meets", label = "Your town", hideLabel = true, cls = "" } = {}) {
  const id = "ts" + ++tsN;
  const data = JSON.stringify(items.map((x) => ({ t: x.t, c: x.c || "", h: x.h, l: !!x.live }))).replace(/</g, "\\u003c");
  return `<form class="tw ${cls}" id="${id}" action="/car-meets" method="get" role="search" autocomplete="off">
  <label for="${id}-i"${hideLabel ? ' class="sr"' : ""}>${E(label)}</label>
  <div class="tw-row"><div class="tw-box"><svg class="tw-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <input id="${id}-i" name="town" type="text" placeholder="${E(placeholder)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-l" spellcheck="false">
    <ul class="tw-list" id="${id}-l" role="listbox" hidden></ul></div><button class="btn red" type="submit">${E(button)}</button></div>
  <p class="tw-msg" role="status"></p>
  <script>(function(){var f=document.getElementById('${id}'),i=f.querySelector('input'),ul=f.querySelector('.tw-list'),msg=f.querySelector('.tw-msg'),D=${data},cur=-1,shown=[];
    var norm=function(s){return String(s||'').toLowerCase().replace(/[’']/g,'').replace(/\\s+/g,' ').trim();};
    var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
    function match(q){q=norm(q);if(!q)return D.filter(function(x){return x.l;}).concat(D.filter(function(x){return !x.l;})).slice(0,8);
      var a=[],b=[];D.forEach(function(x){var n=norm(x.t);if(n.indexOf(q)===0)a.push(x);else if(n.indexOf(q)>0||norm(x.c).indexOf(q)===0)b.push(x);});return a.concat(b).slice(0,8);}
    function hi(t,q){q=norm(q);var n=norm(t),k=n.indexOf(q);if(!q||k<0)return esc(t);return esc(t.slice(0,k))+'<mark>'+esc(t.slice(k,k+q.length))+'</mark>'+esc(t.slice(k+q.length));}
    function draw(){shown=match(i.value);cur=-1;
      if(!shown.length){ul.innerHTML='<li class="tw-none">No match yet. Try a nearby town or <a href="/car-meets">see all areas</a>.</li>';}
      else ul.innerHTML=shown.map(function(x,k){return '<li role="option" id="${id}-o'+k+'" data-k="'+k+'" aria-selected="false"><span class="tw-t">'+hi(x.t,i.value)+'</span><span class="tw-s">'+esc(x.c)+'</span><span class="tw-b'+(x.l?' live':'')+'">'+(x.c==='County'?'County page':x.l?'Town page':'Nearby meets')+'</span></li>';}).join('');
      ul.hidden=false;i.setAttribute('aria-expanded','true');}
    function close(){ul.hidden=true;i.setAttribute('aria-expanded','false');i.removeAttribute('aria-activedescendant');cur=-1;}
    function setCur(k){var o=ul.querySelectorAll('[role=option]');if(!o.length)return;cur=(k+o.length)%o.length;o.forEach(function(e,j){e.setAttribute('aria-selected',j===cur);});i.setAttribute('aria-activedescendant','${id}-o'+cur);o[cur].scrollIntoView({block:'nearest'});}
    function go(x){if(!x)return;i.value=x.t;close();location.href=x.h;}
    i.addEventListener('input',function(){msg.textContent='';draw();});
    i.addEventListener('focus',draw);
    i.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();if(ul.hidden)draw();setCur(cur+1);}else if(e.key==='ArrowUp'){e.preventDefault();setCur(cur-1);}else if(e.key==='Escape'){close();}else if(e.key==='Enter'&&cur>=0){e.preventDefault();go(shown[cur]);}});
    ul.addEventListener('mousedown',function(e){var li=e.target.closest('[role=option]');if(li){e.preventDefault();go(shown[+li.dataset.k]);}});
    document.addEventListener('click',function(e){if(!f.contains(e.target))close();});
    f.addEventListener('submit',function(e){e.preventDefault();var q=norm(i.value);if(!q){msg.textContent='Type a town name.';i.focus();return;}
      var exact=D.filter(function(x){return norm(x.t)===q;})[0],m=exact||match(i.value)[0];
      if(m&&(exact||norm(m.t).indexOf(q)===0))go(m);else{close();msg.innerHTML='We don\\'t have a page for that town yet. Try the nearest town, or <a href="/car-meets">browse all areas</a>.';}});
    if(f.classList.contains('tw-hub')){var t=new URLSearchParams(location.search).get('town');if(t){i.value=t;f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}));f.scrollIntoView({block:'center'});}}
  })();</script></form>`;
}

// "Car meets near you": town search plus links to every live location page. Used on the homepage and the events page.
export const placesQ = () => q("pages?select=path,title,county,town,content&page_type=eq.location&status=eq.published&order=path").catch(() => []);
export function townItems(places = []) {
  const hub = places.find((p) => !p.county);
  const pageFor = (county, town) => places.find((p) => p.county === county && (town ? p.town === town : !p.town));
  const list = [];
  for (const [county, towns] of [["Norfolk", hub?.content?.norfolk_towns || []], ["Suffolk", hub?.content?.suffolk_towns || []]]) for (const t of towns) {
    const tp = pageFor(county, t), cp = pageFor(county, null);
    list.push({ t, c: county, h: tp ? tp.path : cp ? cp.path + "#events" : "/car-meets", live: !!tp });
  }
  for (const p of places.filter((p) => p.town && !list.some((x) => x.t === p.town))) list.push({ t: p.town, c: p.county, h: p.path, live: true });
  for (const p of places.filter((p) => p.county && !p.town)) list.push({ t: p.county, c: "County", h: p.path, live: true });
  return list.sort((a, b) => a.t.localeCompare(b.t));
}
export function nearYou(places = []) {
  const links = places.filter((p) => p.county).sort((a, b) => (a.town ? 1 : 0) - (b.town ? 1 : 0) || (a.town || a.county).localeCompare(b.town || b.county));
  return `<div class="near"><div class="near-t"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg><div><strong>Car meets and car services near you</strong><span>Events, garages, parts and local specialists by town.</span></div></div>
${townSearch(townItems(places), { cls: "near-f" })}
<div class="near-l">${links.map((p) => `<a href="${E(p.path)}">${E(p.town || p.county)}</a>`).join("")}<a href="/car-meets">All areas ${ARROW}</a></div></div>`;
}

export const bizCard = (l) => `<article class="biz"${l.lat != null ? ` data-lat="${l.lat}" data-lng="${l.lng}"` : ""}><a href="/directory/${E(l.slug)}"><div class="ph"><img src="${E(img(l.image_path))}" alt="${E(l.image_alt)}" width="600" height="300" loading="lazy">${l.featured === false ? "" : `<span class="tag feat-tag">Featured</span>`}</div>
<div class="bizb"><h3>${E(l.name)}</h3><p class="svc">${(l.services || []).map(E).join(" · ")}</p>
<p class="meta"><span class="loc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>${E(l.town)}</span>
<span class="ver"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>Checked by us</span></p>
<span class="more">View business ${ARROW}</span></div></a></article>`;

export async function loadHome() {
  const now = new Date().toISOString();
  const [blocks, events, articles, community, products, gallery, listings, services, regions, partners, features, sponsored, faqs, stats] = await Promise.all([
    q("homepage_blocks?select=key,position,settings&order=position"),
    q(`events?select=*&ends_at=gte.${now}&order=starts_at&limit=12`),
    q("articles?select=*&order=published_at.desc&limit=12"),
    q("community_highlights?select=*&order=sort&limit=3"),
    q("products?select=*&order=units_sold_30d.desc&limit=4"),
    q("gallery_items?select=*&order=sort&limit=5"),
    q("directory_listings?select=slug,name,services,town,image_path,image_alt,featured,featured_until&featured=is.true&order=created_at&limit=3"),
    q("directory_services?select=name,slug&order=sort"),
    q("directory_regions?select=name,slug&order=sort"),
    q("partners?select=*&order=sort"),
    q("partner_features?select=*&order=starts_at.desc"),
    q("sponsored_slots?select=*&order=starts_at.desc&limit=1"),
    q("faqs?select=question,answer&order=sort"),
    q("site_stats?select=key,label,value"),
  ]);
  const places = await placesQ();
  return { blocks, events, articles, community, products, gallery, listings, services, regions, partners, features, sponsored, faqs, stats, places };
}

export function renderHome(d) {
  const blockMap = Object.fromEntries(d.blocks.map((b) => [b.key, b]));
  // text for a block: saved setting, else the default from blocks.json
  const T = (key, name) => {
    const v = blockMap[key]?.settings?.[name];
    if (v != null && String(v).trim() !== "") return String(v);
    return (BLOCKS[key]?.fields || []).find((f) => f.name === name)?.default ?? "";
  };
  const fieldType = (key, name) => (BLOCKS[key]?.fields || []).find((f) => f.name === name)?.type;

  const evCount = Math.max(1, Math.min(12, parseInt(T("events", "count"), 10) || 6));
  const events = d.events.slice(0, evCount);
  const nxt = events[0];

  const arts = d.articles;
  const feat = arts.find((a) => a.featured) || arts[0];
  const minis = arts.filter((a) => a !== feat).slice(0, 4);
  const news = feat ? `<article class="feat"><a href="/news/${E(feat.slug)}"><div class="ph"><img src="${E(img(feat.image_path))}" alt="${E(feat.image_alt)}" width="740" height="372" loading="lazy"><span class="tag">Feature</span></div>
<div><small>${E(feat.category)}</small><h3>${E(feat.title)}</h3><p>${E(feat.excerpt)}</p><span class="more">Read the story ${ARROW}</span></div></a></article>
<ul class="minis">${minis.map((a) => `<li><a href="/news/${E(a.slug)}"><img src="${E(img(a.image_path))}" alt="${E(a.image_alt)}" width="120" height="76" loading="lazy">
<span><small>${E(a.category)}</small><b>${E(a.title)}</b><em>${a.read_minutes ? `${a.read_minutes} min read · ` : ""}<time datetime="${E(a.published_at)}">${dm(a.published_at + "T12:00:00Z")}</time></em></span></a></li>`).join("")}</ul>` : "";

  const partnerBand = (key, cls) => {
    const f = d.features.find((x) => x.block_key === key);
    if (!f) return "";
    const pn = d.partners.find((p) => p.id === f.partner_id) || {};
    let count = "";
    if (f.countdown_to && new Date(f.countdown_to) > new Date()) {
      const lbl = key === "livery_of_week" ? "Challenge closes in" : key === "race_night" ? "Race night starts in" : "Ends in";
      count = `<div class="cd" data-to="${E(f.countdown_to)}" aria-label="${lbl}"><small>${lbl}</small><div><span><b data-u="d">–</b>days</span><span><b data-u="h">–</b>hrs</span><span><b data-u="m">–</b>mins</span></div></div>`;
    }
    const btn = (label, url, c) => label && url ? `<a class="btn ${c}" href="${utm(url, "partner_block", pn.slug)}">${E(label)} ${ARROW}</a>` : "";
    return `<section class="pband ${cls}" id="${key.replace(/_/g, "-")}" aria-labelledby="${key}-h">
<img class="pbg" src="${E(img(f.image_path))}" alt="${E(f.image_alt)}" loading="lazy">
<div class="pin"><p class="plabel"><span class="badge">Partner</span>${pn.logo_dark_path || pn.logo_path ? `<img class="plogo" src="${E(img(pn.logo_dark_path || pn.logo_path))}" alt="${E(pn.name)}" height="44">` : E(pn.name)}</p>
<h2 id="${key}-h">${E(f.title)}</h2><p>${E(f.body)}</p>${f.extra ? `<p class="extra">${E(f.extra)}</p>` : ""}
<div class="btns">${btn(f.cta_label, f.cta_url, "red")}${btn(f.cta2_label, f.cta2_url, "ghost")}</div></div>${count}</section>`;
  };

  const community = d.community.map((c, i) => {
    const href = c.post_url || "https://club.carsandcoffee.uk/";
    const h = c.handle || "";
    return `<article class="post"><a href="${E(href)}"><img src="${E(img(c.image_path))}" alt="${E(c.image_alt)}" width="580" height="366" loading="lazy">
<p class="who"><span class="av" aria-hidden="true">${E((h.replace("@", "")[0] || "C").toUpperCase())}</span>${E(h)}${c.posted_label ? ` · ${E(c.posted_label)}` : ""}</p><h3>${E(c.title)}</h3><p>${E(c.excerpt)}</p><span class="more">Read the post ${ARROW}</span></a></article>`;
  }).join("");

  const shop = d.products.map((p) => `<article class="prod"><div class="ph"><img src="${E(img(p.image_path))}" alt="${E(p.image_alt)}" width="436" height="254" loading="lazy">${p.badge ? `<span class="tag">${E(p.badge)}</span>` : ""}</div>
<h3><a href="/shop/${E(p.slug)}">${E(p.name)}</a></h3><p class="price"><b>${money(p.price_pence)}</b>${p.member_price_pence ? ` <span>Members ${money(p.member_price_pence)}</span>` : ""}</p>
<a class="add" href="/shop/${E(p.slug)}">View product</a></article>`).join("");

  const gallery = d.gallery.map((g, i) => `<a class="g g${i}" href="/galleries/${E(g.slug)}"><img src="${E(img(g.image_path))}" alt="${E(g.image_alt)}" loading="lazy"><span>${E(g.title)}</span></a>`).join("");

  const dir = d.listings.filter((l) => !l.featured_until || new Date(l.featured_until + "T23:59:59Z") >= new Date()).map(bizCard).join("");
  const svcTiles = d.services.map((s) => `<a class="svct" href="/directory/service/${E(s.slug)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${SVC_ICON[s.slug] || SVC_DEFAULT}</svg><span>${E(s.name)}</span></a>`).join("");
  const svcOptions = d.services.map((s) => `<option value="${E(s.slug)}">${E(s.name)}</option>`).join("");
  const regions = d.regions.map((r) => `<a href="/directory/region/${E(r.slug)}">${E(r.name)}</a>`).join("");
  const faq = d.faqs.map((f) => `<details><summary>${E(f.question)}</summary><p>${E(f.answer)}</p></details>`).join("");
  const partnersStrip = d.partners.map((p) => `<a class="pl" href="${utm(p.page_path, "partner_strip", p.slug)}" rel="noopener">${p.logo_path ? `<img src="${E(img(p.logo_path))}" alt="${E(p.name)}" loading="lazy">` : `<b>${E(p.name)}</b>`}<small>${E(p.tagline)}</small></a>`).join("");
  const footerPartners = d.partners.map((p) => `<a href="${utm(p.page_path, "footer", p.slug)}" rel="noopener"><img src="${E(img(p.logo_dark_path || p.logo_path))}" alt="${E(p.name)}" loading="lazy"></a>`).join("");
  const order = ["members", "meets_held", "cars_featured"];
  const stats = [...d.stats].sort((a, b) => (order.indexOf(a.key) + 99) % 99 - (order.indexOf(b.key) + 99) % 99).map((s) => `<li><b>${E(s.value)}</b>${E(s.label)}</li>`).join("");
  const types = [...new Set(events.map((e) => e.event_type))];
  const chipNames = { meet: "Meets", race: "Race nights", tour: "Tours", garage: "Garage nights", watch: "Watch parties", track: "Track days", show: "Shows" };
  const chips = '<button type="button" class="chip on" data-f="all" aria-pressed="true">All events</button>' + types.map((k) => `<button type="button" class="chip" data-f="${E(k)}" aria-pressed="false">${E(chipNames[k] || k)}</button>`).join("");
  const sp = d.sponsored.find((s) => new Date(s.starts_at) <= new Date() && new Date(s.ends_at) > new Date());

  const ld = [
    { "@context": "https://schema.org", ...ORG, sameAs: ["https://club.carsandcoffee.uk/"] },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": SITE + "/#website", name: "Cars and Coffee UK", url: SITE + "/", publisher: { "@id": SITE + "/#org" }, potentialAction: { "@type": "SearchAction", target: SITE + "/search?q={q}", "query-input": "required name=q" } },
    { "@context": "https://schema.org", "@type": "ItemList", name: "Upcoming events", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, item: {
      "@type": "Event", name: e.title, startDate: e.starts_at, endDate: e.ends_at, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
      location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressRegion: e.region || "Norfolk", addressCountry: "GB" } },
      offers: { "@type": "Offer", price: ((e.price_pence || 0) / 100).toFixed(2), priceCurrency: "GBP", url: `${SITE}/events/${e.slug}` }, url: `${SITE}/events/${e.slug}` } })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: d.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
  ];

  const vals = {
    ARROW, NEAR_YOU: nearYou(d.places || []), EVENTS_LINK: link("View all events", "/events"), CHIPS: chips, EVENTS: events.map(eventCard).join(""), NEWS: news,
    DREAM: partnerBand("detail_of_month", "ao"), COMMUNITY: community, LIVERY: partnerBand("livery_of_week", "rcg"), SHOP: shop,
    LEMANS: partnerBand("race_night", "lmc"), GALLERY: gallery, DIRECTORY: dir, REGIONS: regions, SVC_TILES: svcTiles, SVC_OPTIONS: svcOptions,
    STATS: stats, PARTNERS: partnersStrip, FOOTER_PARTNERS: footerPartners, FAQ: faq, BRANDLINE: "/homepage/brandline.webp",
    LD: JSON.stringify(ld).replace(/</g, "\\u003c"),
    NEXT_TITLE: E(nxt?.title), NEXT_SLUG: E(nxt?.slug), NEXT_VENUE: E(nxt?.venue), NEXT_DATE: nxt ? ukdate(nxt.starts_at) : "",
    NEXT_DOW: nxt ? dow(nxt.starts_at) : "", NEXT_DM: nxt ? dm(nxt.starts_at) : "", NEXT_TIME: nxt ? `${hhmm(nxt.starts_at)}–${hhmm(nxt.ends_at)}` : "", NEXT_ISO: E(nxt?.starts_at),
    SP_ADV: E(sp?.advertiser), SP_TITLE: E(sp?.title), SP_BODY: E(sp?.body), SP_IMG: E(img(sp?.image_path)), SP_ALT: E(sp?.image_alt), SP_CTA: E(sp?.cta_label || "Find out more"), SP_URL: E(sp?.cta_url || "#"),
  };

  let html = TEMPLATE;
  // show, hide and reorder blocks
  const main = html.match(/<main>\n([\s\S]*?)\n<\/main>/);
  if (main) {
    const chunks = [...main[1].matchAll(/<!--B:(\w+)-->\n([\s\S]*?)\n<!--\/B:\1-->/g)].map((m, i) => ({ key: m[1], html: m[2], i }));
    const skip = (k) => !blockMap[k] || (k === "hero" && !nxt) || (k === "sponsored" && !sp) || (k === "detail_of_month" && !vals.DREAM) || (k === "livery_of_week" && !vals.LIVERY) || (k === "race_night" && !vals.LEMANS)
      || (k === "events" && !events.length) || (k === "news" && !feat) || (k === "faqs" && !d.faqs.length);
    const kept = chunks.filter((c) => !skip(c.key)).sort((a, b) => (blockMap[a.key].position - blockMap[b.key].position) || a.i - b.i);
    html = html.replace(main[0], "<main>\n" + kept.map((c) => c.html).join("\n\n") + "\n</main>");
  }
  // block text
  html = html.replace(/\{\{t\.(\w+)\.(\w+)\}\}/g, (_, k, n) => {
    const v = T(k, n), type = fieldType(k, n);
    if (type === "image") return E(img(v));
    if (k === "intro" && n === "body") return v.split(/\n\s*\n/).map((p) => `<p>${E(p.trim())}</p>`).join("\n");
    return E(v);
  });
  html = html.replace(/\{\{([A-Z_0-9]+)\}\}/g, (m, k) => (k in vals ? vals[k] : m));
  // hero image preload follows the chosen photo
  html = html.replace(/<link rel="preload" as="image" href="\/homepage\/hero\.webp" media="\(min-width:601px\)"><link rel="preload" as="image" href="\/homepage\/hero-m\.webp" media="\(max-width:600px\)">/,
    `<link rel="preload" as="image" href="${E(img(T("hero", "image")))}" media="(min-width:601px)"><link rel="preload" as="image" href="${E(img(T("hero", "image_mobile")))}" media="(max-width:600px)">`);
  if (globalThis.TS_KEY) html = html.replace("</head>", `<meta name="ts-key" content="${E(globalThis.TS_KEY)}"></head>`);
  return html;
}
