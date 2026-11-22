// Renders content pages (location pages for now) from site.pages, inside the homepage's header and footer.
import TEMPLATE from "./home-template.html";
import { E, img, utm, ARROW, q, eventCard, bizCard, townSearch, SVC_ICON, SVC_DEFAULT } from "./home.js";
import { sanitize } from "./sanitize.js";

const SITE = "https://carsandcoffee.uk";
const CLUB = "https://club.carsandcoffee.uk";
const INTEREST_LINKS = { "Classic cars": "classic-cars", "Track days": "track-days", "Detailing and wraps": "detailing-wraps", "Sim racing": "sim-racing",
  "Restoration and builds": "restoration-builds", "JDM": "jdm", "American": "american", "EV and hybrid": "ev-hybrid", "Modern performance and supercars": "modern-performance", "Rally": "rally", "F1": "f1" };
const slug = (x) => String(x).toLowerCase().replace(/[’']/g, "").replace(/ and /g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const enc = (s) => encodeURIComponent(s);

// The page shell: the homepage template with its <main>, title and meta swapped for this page's.
export function shell({ title, description, path, image, noindex, ld, main, partners, ogType, published }) {
  let html = TEMPLATE;
  const url = SITE + path;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${E(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${E(description)}">${noindex ? '<meta name="robots" content="noindex, follow">' : ""}`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${E(url)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${E(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${E(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${E(url)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${E(image ? (image.startsWith("http") ? image : SITE + img(image)) : SITE + "/og-home.jpg")}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${ogType || "website"}">${published ? `<meta property="article:published_time" content="${E(published)}">` : ""}`)
    .replace(/<link rel="preload" as="image"[^>]*>/g, "")
    .replace(/<main>[\s\S]*?<\/main>/, `<main>\n${main}\n</main>`)
    .replace("{{LD}}", JSON.stringify(ld).replace(/</g, "\\u003c"))
    .replace("</head>", globalThis.TS_KEY ? `<meta name="ts-key" content="${E(globalThis.TS_KEY)}"></head>` : "</head>")
    .replace("{{FOOTER_PARTNERS}}", (partners || []).map((p) => `<a href="${utm(p.page_path, "footer", p.slug)}" rel="noopener"><img src="${E(img(p.logo_dark_path || p.logo_path))}" alt="${E(p.name)}" loading="lazy"></a>`).join(""))
    .replace(/\{\{ARROW\}\}/g, ARROW)
    .replace(/\{\{[^}]+\}\}/g, "");
  return html;
}

const sec = (heading, body, opts = {}) => `<section class="lp-sec"${opts.id ? ` id="${opts.id}"` : ""}><div class="wrap">${heading ? `<h2>${heading}</h2>` : ""}${opts.lead ? `<p class="lp-lead">${opts.lead}</p>` : ""}${body}</div></section>`;
const chips = (items) => `<div class="lp-chips">${items.map(([label, href]) => `<a class="lp-chip" href="${E(href)}">${E(label)}</a>`).join("")}</div>`;
const card = ({ href, image, alt, small, title, text }) => `<${href ? `a href="${E(href)}"` : "div"} class="lp-card">${image ? `<img src="${E(img(image))}" alt="${E(alt || title)}" loading="lazy" width="600" height="375">` : ""}<div class="pad">${small ? `<small>${E(small)}</small>` : ""}<h3>${E(title)}</h3>${text ? `<p>${E(text)}</p>` : ""}</div></${href ? "a" : "div"}>`;
const faqHTML = (faqs) => `<div class="lp-faq">${faqs.map(([qq, a]) => `<details><summary>${E(qq)}</summary><p>${E(a)}</p></details>`).join("")}</div>`;
export const crumbsHTML = (items) => `<nav class="crumbs" aria-label="Breadcrumb"><div class="wrap"><ol>${items.map(([name, href], i) => `<li>${i < items.length - 1 ? `<a href="${E(href)}">${E(name)}</a>` : `<span aria-current="page">${E(name)}</span>`}</li>`).join("")}</ol></div></nav>`;
export const newsletterHTML = () => `<section class="band news-band" aria-labelledby="nl-h" id="newsletter"><div class="wrap"><h2 id="nl-h">Get the next meet in your inbox</h2><p>Meet dates, stories and guides from Cars and Coffee UK, every week.</p>
<form id="nl" novalidate><input type="email" id="nl-email" name="email" autocomplete="email" placeholder="Your email address" aria-label="Email address" required><button class="btn red" type="submit">Subscribe</button>
<label><input type="checkbox" id="nl-consent" required> <span>I’d like to receive emails from Cars and Coffee UK, including events, news and partner offers. I can unsubscribe at any time. See our <a href="/privacy" style="text-decoration:underline">privacy policy</a>.</span></label><p class="msg" id="nl-msg" role="status"></p></form></div></section>`;




// Hub: "Find meets by town" feature with search, county panels and town tiles
const COUNTY_PHOTO = { Norfolk: "homepage/ev-breakfast.webp", Suffolk: "homepage/ev-tour.webp" };
function townsFeature(c, events, placePages) {
  const pageFor = (county, town) => placePages.find((x) => x.county === county && (town ? x.town === town : !x.town));
  const short = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
  const counties = [["Norfolk", c.norfolk_towns || []], ["Suffolk", c.suffolk_towns || []]].filter(([, t]) => t.length);
  const all = [];
  const panel = ([county, towns]) => {
    const cp = pageFor(county, null);
    const countyEvents = events.filter((e) => e.county === county);
    const tiles = towns.map((t) => {
      const tp = pageFor(county, t), next = events.find((e) => e.county === county && e.town === t);
      const href = tp ? tp.path : cp ? `${cp.path}#events` : "#events";
      all.push({ t, county, href, live: !!tp });
      return `<a class="tt${tp ? " live" : ""}" href="${E(href)}"><strong>${E(t)}</strong><span>${next ? `Next: ${short(next.starts_at)}` : tp ? "Local hub" : "Coming soon"}</span>${tp ? `<i aria-hidden="true">${ARROW}</i>` : ""}</a>`;
    }).join("");
    return `<div class="tf-county" id="${slug(county)}">
      <div class="tf-top"><img src="${E(img(cp?.hero_image_path || COUNTY_PHOTO[county]))}" alt="" loading="lazy"><div class="tf-top-in">
        <h3>${E(county)}</h3><p>${countyEvents.length ? `${countyEvents.length} upcoming meet${countyEvents.length === 1 ? "" : "s"}` : "Meets coming soon"} · ${towns.length} towns</p>
        ${cp ? `<a class="btn red small" href="${E(cp.path)}">${E(county)} car hub ${ARROW}</a>` : `<span class="tf-soon">County page coming soon</span>`}</div></div>
      <div class="tf-tiles">${tiles}</div></div>`;
  };
  const panels = counties.map(panel).join("");
  return `<section class="tf" aria-labelledby="tf-h"><div class="wrap">
    <div class="tf-head"><div><span class="eyebrow">Your local car hub</span><h2 id="tf-h">Find your town</h2><p>Pick your town for upcoming meets, trusted garages and detailers, the best drives and local clubs.</p></div>
      <div class="tf-search">${townSearch(all.map((x) => ({ t: x.t, c: x.county, h: x.href, live: x.live })).concat(placePages.filter((x) => x.county && !x.town).map((x) => ({ t: x.county, c: "County", h: x.path, live: true }))).sort((a, b) => a.t.localeCompare(b.t)), { label: "Your town", hideLabel: false, placeholder: "Start typing, e.g. Norwich", button: "Go", cls: "tw-hub" })}</div></div>
    <div class="tf-grid">${panels}</div>
    ${c.coming_soon ? `<div class="tf-next"><strong>Coming next:</strong> ${E(c.coming_soon)} <span class="tf-pills"><span>Cambridgeshire</span><span>Essex</span></span></div>` : ""}
  </div></section>`;
}

// "How our meets work": a designed three-step band
const ICONS = {
  find: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="10" width="34" height="31" rx="4"/><path d="M7 19h34M16 6v8M32 6v8"/><circle cx="24" cy="30" r="5"/><path d="m28 34 5 5"/></svg>',
  rsvp: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 16a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v4a4 4 0 0 0 0 8v4a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-4a4 4 0 0 0 0-8z"/><path d="m18 24 4 4 8-8"/></svg>',
  enjoy: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 20h22v10a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"/><path d="M32 23h3a5 5 0 0 1 0 10h-3"/><path d="M16 8c0 3 3 3 3 6M22 8c0 3 3 3 3 6"/></svg>',
};
function howItWorks() {
  const steps = [
    ["find", "Find a meet", "Pick a date near you on this page or in the events calendar. Breakfast meets are the easiest place to start."],
    ["rsvp", "RSVP or book", "Most morning meets are free; a quick RSVP helps us plan parking. Tours and race nights have tickets."],
    ["enjoy", "Turn up and enjoy", "Coffee, cars and good conversation. Bring what you drive, or come along just to look."],
  ];
  return `<section class="hiw" aria-labelledby="hiw-h"><div class="wrap">
    <div class="hiw-head"><span class="eyebrow">New to Cars and Coffee?</span><h2 id="hiw-h">How our meets work</h2><p>Three steps from sofa to Sunday morning line-up. No membership, no special car, no fuss.</p></div>
    <ol class="hiw-steps">${steps.map(([ic, h, t], i) => `<li><div class="hiw-icon">${ICONS[ic]}<span class="hiw-n">${i + 1}</span></div><h3>${h}</h3><p>${t}</p></li>`).join("")}</ol>
    <div class="hiw-foot"><a class="btn red" href="/events">Find your next meet ${ARROW}</a><a class="btn ghost" href="/guides/your-first-car-meet">Read the first-timer's guide</a></div>
  </div></section>`;
}


// Town and county pages: "What to expect at a meet" in the same designed band
Object.assign(ICONS, {
  park: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="6"/><path d="M19 34V14h7a6 6 0 0 1 0 12h-7"/></svg>',
  look: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 30l4-10a5 5 0 0 1 4.7-3.3h18.6A5 5 0 0 1 38 20l4 10v7a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2H13v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M6 30h36"/><circle cx="14" cy="30" r="0.5"/><circle cx="34" cy="30" r="0.5"/></svg>',
  quiet: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 19h7l9-7v24l-9-7H8z"/><path d="m32 19 10 10M42 19 32 29"/></svg>',
});
function whatToExpect(place) {
  const steps = [
    ["park", "Arrive and park", "Display cars and visitors usually park separately. Follow the marshals and keep entrances clear."],
    ["look", "Walk the line-up", "Take your time and ask owners about their cars. Ask before photographing people or number plates."],
    ["quiet", "Leave quietly", "No revving, no wheelspin. How we leave decides whether we're welcome back."],
  ];
  return `<section class="hiw hiw-expect" aria-labelledby="wte-h"><div class="wrap">
    <div class="hiw-head"><span class="eyebrow">First time at a meet in ${E(place)}?</span><h2 id="wte-h">What to expect at a meet</h2><p>Relaxed, friendly and over by lunchtime. Here's how a morning meet goes.</p></div>
    <ol class="hiw-steps">${steps.map(([ic, h, t], i) => `<li><div class="hiw-icon">${ICONS[ic]}<span class="hiw-n">${i + 1}</span></div><h3>${h}</h3><p>${t}</p></li>`).join("")}</ol>
    <div class="hiw-panels">
      <div class="hiw-panel"><h3>Bring with you</h3><ul class="hiw-ticks"><li>A warm layer: mornings can be cold</li><li>Your phone or camera</li><li>Cash or card for coffee and food</li><li>Your RSVP or ticket, if the event needs one</li></ul></div>
      <div class="hiw-panel"><h3>Accessibility and families</h3><p>Each event page lists step-free access, toilets and blue-badge parking where available. Morning meets are family-friendly; keep little ones close around moving cars.</p>
        <a class="hiw-link" href="/guides/your-first-car-meet">Read the first-timer's guide ${ARROW}</a></div>
    </div>
  </div></section>`;
}

// ---------- map and directions ----------
const venuesOf = (events) => { const seen = new Map(); for (const e of events) { const v = e.venue_info; if (v && !seen.has(v.id)) seen.set(v.id, { ...v, events: [] }); if (v) seen.get(v.id).events.push(e); } return [...seen.values()]; };
export function directions(v) {
  const label = [v.name, v.address_line, v.town, v.postcode].filter(Boolean).join(", ");
  if (v.lat == null || v.approximate) {
    const qs = enc([v.name, v.town || v.county].filter(Boolean).join(" "));
    return { google: `https://www.google.com/maps/search/?api=1&query=${qs}`, apple: `https://maps.apple.com/?q=${qs}`, waze: `https://waze.com/ul?q=${qs}&navigate=yes`, label };
  }
  return { google: `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`, apple: `https://maps.apple.com/?daddr=${v.lat},${v.lng}&q=${enc(v.name)}`, waze: `https://waze.com/ul?ll=${v.lat},${v.lng}&navigate=yes`, label };
}
const dirButtons = (v) => { const d = directions(v); return `<div class="lp-dir"><a class="btn red small" href="${E(d.google)}" target="_blank" rel="noopener">Google Maps</a><a class="btn ghost small" href="${E(d.apple)}" target="_blank" rel="noopener">Apple Maps</a><a class="btn ghost small" href="${E(d.waze)}" target="_blank" rel="noopener">Waze</a></div>`; };
function mapSection(place, events, listings) {
  const vs = venuesOf(events).filter((v) => v.lat != null);
  const biz = listings.filter((l) => l.lat != null);
  if (!vs.length && !biz.length) return "";
  const points = [
    ...vs.map((v) => ({ t: "venue", n: v.name, lat: v.lat, lng: v.lng, a: !!v.approximate, sub: v.events.map((e) => e.title).slice(0, 2).join(" · "), href: `/events/${v.events[0].slug}`, dir: directions(v).google })),
    ...biz.map((l) => ({ t: "biz", n: l.name, lat: l.lat, lng: l.lng, a: !!l.approximate, sub: (l.services || []).slice(0, 3).join(" · "), href: `/directory/${l.slug}`, dir: directions({ ...l, name: l.name }).google })),
  ];
  const venueCards = vs.map((v) => `<div class="lp-panel lp-venue"><h3>${E(v.name)}</h3>
      <p class="lp-addr">${E([v.address_line, v.town, v.postcode].filter(Boolean).join(", ") || v.county || "")}${v.approximate ? ` <span class="lp-approx">Approximate location</span>` : ""}</p>
      <p class="lp-next">Next: <a href="/events/${E(v.events[0].slug)}">${E(v.events[0].title)}</a></p>
      ${v.parking ? `<p><strong>Parking:</strong> ${E(v.parking)}</p>` : ""}${v.access ? `<p><strong>Access:</strong> ${E(v.access)}</p>` : ""}
      ${dirButtons(v)}</div>`).join("");
  return sec(`Meets and businesses on the map`, `<div class="lp-mapwrap"><div id="lpmap" class="lp-map" role="region" aria-label="Map of car meet venues and businesses near ${E(place)}" data-points="${E(JSON.stringify(points))}"><p>Loading the map…</p></div>
    <p class="lp-legend"><span class="dot venue"></span> Meet venue <span class="dot biz"></span> Local business · Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p></div>
    ${venueCards ? `<h3 style="margin-top:26px">Venues and directions</h3><div class="lp-venues">${venueCards}</div>` : ""}
    <script>(function(){var el=document.getElementById('lpmap');if(!el)return;var started=false;
      function css(h){var l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l);}
      function js(srcs,cb){var s=document.createElement('script');s.src=srcs[0];s.onload=cb;s.onerror=function(){if(srcs.length>1)js(srcs.slice(1),cb);else el.innerHTML='<p>The map could not load. Use the directions below.</p>';};document.head.appendChild(s);}
      function draw(){var pts=JSON.parse(el.getAttribute('data-points'));el.innerHTML='';var map=L.map(el,{scrollWheelZoom:false});
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
        var esc=function(t){return String(t||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
        var b=[];pts.forEach(function(p){var m=L.circleMarker([p.lat,p.lng],{radius:p.t==='venue'?10:7,color:'#fff',weight:2,fillColor:p.t==='venue'?'#c00d0d':'#5e4c42',fillOpacity:1}).addTo(map);
          m.bindPopup('<strong>'+esc(p.n)+'</strong><br>'+esc(p.sub)+(p.a?'<br><em>Approximate location</em>':'')+'<br><a href="'+esc(p.href)+'">'+(p.t==='venue'?'See the event':'View business')+'</a> · <a href="'+esc(p.dir)+'" target="_blank" rel="noopener">Directions</a>');b.push([p.lat,p.lng]);});
        if(b.length>1)map.fitBounds(b,{padding:[40,40],maxZoom:12});else map.setView(b[0],11);}
      function start(){if(started)return;started=true;css('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');js(['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],draw);}
      if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start();}},{rootMargin:'300px'});io.observe(el);}else start();})();</script>`, { id: "map", lead: `Upcoming meet venues and trusted businesses in and around ${E(place)}. Tap a pin for details and directions.` });
}

export async function loadPage(path) {
  const rows = await q(`pages?select=*&path=eq.${enc(path)}&status=eq.published&limit=1`);
  return rows[0] || null;
}

// Local hub: services tiles that filter the business list below
function servicesSection(place, services, listings, county) {
  const match = (l, s) => (l.services || []).some((x) => { const a = x.toLowerCase(), b = s.name.toLowerCase(); return a === b || a.startsWith(b.split(" ")[0]) || b.startsWith(a.split(" ")[0]); });
  const tiles = services.map((s) => { const n = listings.filter((l) => match(l, s)).length;
    return `<button type="button" class="svc-t${n ? "" : " none"}" data-svc="${E(s.name)}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${SVC_ICON[s.slug] || SVC_DEFAULT}</svg><strong>${E(s.name)}</strong><span>${n ? `${n} local business${n === 1 ? "" : "es"}` : "Coming soon"}</span></button>`; }).join("");
  const cards = listings.map((l) => bizCard(l).replace('<article class="biz"', `<article class="biz" data-svcs="${E((l.services || []).join("|"))}"`)).join("");
  return `<section class="lp-sec svc-sec" id="services"><div class="wrap">
    <div class="svc-head"><div><h2>Local car services in ${E(place)}</h2><p class="lp-lead">Garages, detailers, restorers, tuners and more in and around ${E(place)}, checked by our team. Pick a service to filter.</p></div>
      <a class="btn ghost" href="/directory/list-your-business">List your business</a></div>
    <div class="svc-grid" role="group" aria-label="Filter businesses by service">${tiles}</div>
    <div id="businesses" class="svc-results">
      <div class="svc-bar"><h3 id="svc-title">Trusted local businesses</h3><button type="button" class="svc-clear" hidden>Show all</button></div>
      ${listings.length ? `<div class="bizs">${cards}</div><p class="svc-empty" hidden>No ${E(place)} businesses for that service yet. <a href="/directory/list-your-business">Know a good one? Tell us.</a></p>` : `<p class="lp-empty">We're checking local businesses for ${E(place)}. Know a good one? <a href="/directory/list-your-business">Tell us</a>.</p>`}
      <div class="btns" style="margin-top:18px"><a class="btn ghost" href="/directory/region/${slug(county)}">Browse the ${E(county)} directory</a></div>
    </div>
    <script>(function(){var s=document.getElementById('services');if(!s)return;var tiles=s.querySelectorAll('.svc-t'),cards=s.querySelectorAll('.biz[data-svcs]'),clr=s.querySelector('.svc-clear'),t=s.querySelector('#svc-title'),empty=s.querySelector('.svc-empty');
      function m(c,name){var b=name.toLowerCase();return c.getAttribute('data-svcs').toLowerCase().split('|').some(function(a){return a&&(a===b||a.indexOf(b.split(' ')[0])===0||b.indexOf(a.split(' ')[0])===0);});}
      function apply(name){var n=0;tiles.forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.svc===name));});cards.forEach(function(c){var ok=!name||m(c,name);c.hidden=!ok;if(ok)n++;});clr.hidden=!name;t.textContent=name?name+' near ${E(place).replace(/'/g, "\\'")}':'Trusted local businesses';if(empty)empty.hidden=!!n;}
      tiles.forEach(function(x){x.onclick=function(){var on=x.getAttribute('aria-pressed')==='true';apply(on?'':x.dataset.svc);if(!on)document.getElementById('businesses').scrollIntoView({behavior:'smooth',block:'start'});};});clr.onclick=function(){apply('');};})();</script>
  </div></section>`;
}

export async function renderLocation(p) {
  const c = p.content || {};
  const now = new Date().toISOString();
  const isHub = !p.county, isTown = !!p.town;
  const place = p.town || p.county || "East Anglia";
  const [eventsAll, listingsAll, children, parentRows, siblings, partners, placePages, services] = await Promise.all([
    q(`events?select=*,venue_info:venues(*)&ends_at=gte.${now}&order=starts_at&limit=12`),
    q(`directory_listings?select=slug,name,services,town,county,image_path,image_alt,featured,featured_until,address_line,postcode,lat,lng,approximate${isHub ? "" : `&county=eq.${enc(p.county)}`}&order=featured.desc,name&limit=${isHub ? 30 : 40}`),
    q(`pages?select=path,title,town,county,hero_image_path,intro,content&parent_id=eq.${p.id}&status=eq.published&order=title`),
    p.parent_id ? q(`pages?select=path,title,county,town&id=eq.${p.parent_id}`) : Promise.resolve([]),
    p.parent_id && isTown ? q(`pages?select=path,title,town,hero_image_path,intro&parent_id=eq.${p.parent_id}&status=eq.published&id=neq.${p.id}&order=title&limit=6`) : Promise.resolve([]),
    q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort"),
    q("pages?select=path,town,county,hero_image_path&page_type=eq.location&status=eq.published&county=not.is.null"),
    q("directory_services?select=name,slug&order=sort").catch(() => []),
  ]);
  const parent = parentRows[0];
  // businesses: this town first, then the rest of the county
  const listings = isTown ? [...listingsAll.filter((l) => l.town === p.town), ...listingsAll.filter((l) => l.town !== p.town)] : listingsAll;
  // events: this town first, then the rest of the county, then everything (hub)
  let events = isHub ? eventsAll : eventsAll.filter((e) => e.county === p.county);
  if (isTown) events = [...events.filter((e) => e.town === p.town), ...events.filter((e) => e.town !== p.town)];
  const nearbyNote = !isHub && !events.length;
  if (nearbyNote) events = eventsAll;
  events = events.slice(0, 6);
  const countyPath = (county) => (placePages || []).find((x) => x.county === county && !x.town)?.path || `/${slug(county)}`;

  const crumbs = [["Home", "/"], ["Near you", "/car-meets"]];
  if (isHub) crumbs.pop(), crumbs.push(["Near you", "/car-meets"]);
  else { if (isTown) crumbs.push([p.county, parent?.path || countyPath(p.county)]); crumbs.push([p.town || p.county, p.path]); }

  const hero = `<section class="phero">${p.hero_image_path ? `<img class="bg" src="${E(img(p.hero_image_path))}" alt="${E(p.hero_image_alt || "")}">` : `<img class="bg" src="/homepage/hero.webp" alt="">`}
    <div class="wrap">${c.label ? `<span class="eyebrow">${E(c.label)}</span>` : ""}<h1>${E(p.h1 || p.title)}</h1>${p.intro ? `<p>${E(p.intro)}</p>` : ""}
    <div class="btns"><a class="btn red" href="#events">Upcoming meets ${ARROW}</a>${isHub ? `<a class="btn ghost" style="color:#fff;border-color:#fff" href="${CLUB}/apply">Join the community</a>` : `<a class="btn ghost" style="color:#fff;border-color:#fff" href="#services">Find a local business</a>`}</div></div></section>`;

  const parts = [crumbsHTML(crumbs), hero];
  if (!isHub) {
    const nav = [["Meets", "#events"], ["Local services", "#services"], ["Map", "#map"], c.scene?.length ? ["Car scene", "#scene"] : null, c.drives?.length ? ["Drives", "#drives"] : null, ["Clubs", "#clubs"], c.faqs?.length ? ["FAQs", "#faqs"] : null].filter(Boolean);
    parts.push(`<nav class="hubnav" aria-label="On this page"><div class="wrap">${nav.map(([l, h]) => `<a href="${h}">${E(l)}</a>`).join("")}</div></nav>`);
  }
  if (c.stats?.length) parts.push(sec("At a glance", `<div class="lp-stats">${c.stats.map(([n, l]) => `<div class="lp-stat"><strong>${E(n)}</strong><span>${E(l)}</span></div>`).join("")}</div>`));

  if (isHub) parts.push(townsFeature(c, eventsAll, placePages || []));

  parts.push(sec(isHub ? "Next meets" : `Car meets in and near ${E(place)}`, events.length ? `${nearbyNote ? `<p class="lp-lead">Nothing in ${E(place)} just yet. Here are the nearest upcoming meets.</p>` : ""}<div class="evs">${events.map(eventCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/events">See all events ${ARROW}</a></div>` : `<p class="lp-empty">No meets scheduled yet. Join the newsletter to hear first.</p>`, { id: "events" }));

  if (!isHub) {
    parts.push(servicesSection(place, services || [], listings, p.county));
    parts.push(mapSection(place, events, listings));
    if (c.scene?.length) {
      const interests = (c.interests || []).map((n) => [n, INTEREST_LINKS[n] ? `/cars/${INTEREST_LINKS[n]}` : "/cars"]);
      parts.push(sec(`The ${E(place)} car scene`, `<div class="lp-split"><div class="lp-prose rich">${c.scene_html ? sanitize(c.scene_html) : c.scene.map((x) => `<p>${E(x)}</p>`).join("")}</div>
        <div class="lp-panel">${interests.length ? `<h3>Popular here</h3>${chips(interests)}` : ""}<h3>Useful guides</h3>${chips([["Your first car meet", "/guides/your-first-car-meet"], ["Before you buy a classic", "/guides/before-you-buy-a-classic"], ["Photographing cars at a meet", "/guides/photographing-cars-at-a-meet"]])}</div></div>`, { id: "scene" }));
    }
    if (c.drives?.length) parts.push(sec(`Best drives from ${E(place)}`, `<div class="lp-drives">${c.drives.map((d) => card({ image: d.image, title: d.title, text: d.text, small: d.distance })).join("")}</div>`, { id: "drives", lead: "Favourite routes for a weekend run. Drive to the conditions and respect the villages you pass through." }));
    parts.push(whatToExpect(place));
    parts.push(sec(`Clubs and hubs near ${E(place)}`, `<div class="lp-cards">${[
      card({ href: `${CLUB}/hubs/${slug(p.county)}`, image: "homepage/com-1.webp", small: "Club hub", title: `${p.county} hub`, text: `Meets, drives, recommendations and car news across ${p.county}.` }),
      card({ href: `${CLUB}/hubs/classic-cars`, image: "homepage/gal-aston.webp", small: "Club hub", title: "Classic cars", text: "Ownership, restoration and runs." }),
      card({ href: `${CLUB}/hubs/track-days`, image: "homepage/rcg.webp", small: "Club hub", title: "Track days", text: "Snetterton dates, set-up and lap times." })].join("")}</div>
      <div class="btns" style="margin-top:18px"><a class="btn red" href="${CLUB}/apply">Join the Cars and Coffee club ${ARROW}</a></div>`, { id: "clubs" }));
    const towns = isTown ? siblings : children;
    const townsHTML = towns.length ? `<div class="lp-cards">${towns.map((x) => card({ href: x.path, image: x.hero_image_path || "homepage/ev-breakfast.webp", title: x.town || x.title, text: x.intro ? x.intro.split(". ")[0] + "." : "" })).join("")}</div>` : "";
    const more = (c.more_places || []).filter((n) => !towns.some((x) => x.town === n));
    if (townsHTML || more.length) parts.push(sec(isTown ? "Nearby towns" : `Towns in ${E(p.county)}`, townsHTML + (more.length ? `<h3 style="margin-top:22px">More places</h3>${chips(more.map((n) => [n, `${countyPath(p.county)}/${slug(n)}`]))}` : "")));
    if (c.getting_there?.car || c.getting_there?.no_car || c.getting_there?.car_html || c.getting_there?.no_car_html) { const gt = c.getting_there, rt = (h, t) => (h ? sanitize(h) : t ? `<p>${E(t)}</p>` : "");
      parts.push(sec(`Getting around ${E(place)}`, `<div class="lp-split eq"><div class="lp-panel rich"><h3>By car</h3>${rt(gt.car_html, gt.car)}</div><div class="lp-panel rich"><h3>Without a car</h3>${rt(gt.no_car_html, gt.no_car)}</div></div>`)); }
  } else {
    parts.push(mapSection("Norfolk and Suffolk", events, listings));
    parts.push(howItWorks());
  }
  if (c.faqs?.length) parts.push(sec("Frequently asked questions", faqHTML(c.faqs), { id: "faqs" }));
  if (p.body_html) parts.push(sec("", `<div class="lp-prose rich">${sanitize(p.body_html)}</div>`));
  else if (p.body_md) parts.push(sec("", `<div class="lp-prose">${p.body_md.split(/\n\s*\n/).map((x) => `<p>${E(x.trim())}</p>`).join("")}</div>`));
  parts.push(newsletterHTML());

  const url = SITE + p.path;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) },
    { "@context": "https://schema.org", "@type": p.schema_type || "CollectionPage", name: p.meta_title || p.title, description: p.meta_description || p.intro, url,
      about: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressRegion: p.county || "East Anglia", addressLocality: p.town || undefined, addressCountry: "GB" } },
      mainEntity: { "@type": "ItemList", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/events/${e.slug}`, name: e.title })) } },
  ];
  if (!isHub && listings.length) ld.push({ "@context": "https://schema.org", "@type": "ItemList", name: `Car services in and near ${place}`, itemListElement: listings.slice(0, 20).map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/directory/${l.slug}`, name: l.name })) });
  const vs = venuesOf(events);
  if (vs.length) ld.push({ "@context": "https://schema.org", "@type": "ItemList", name: `Car meet venues in and near ${place}`, itemListElement: vs.map((v, i) => ({ "@type": "ListItem", position: i + 1,
    item: { "@type": "Place", name: v.name, address: { "@type": "PostalAddress", streetAddress: v.address_line || undefined, addressLocality: v.town || undefined, postalCode: v.postcode || undefined, addressRegion: v.county || undefined, addressCountry: "GB" },
      ...(v.approximate || v.lat == null ? {} : { geo: { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng } }) } })) });
  if (c.faqs?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([qq, a]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: a } })) });

  return shell({ title: p.meta_title || `${p.title} | Cars and Coffee UK`, description: p.meta_description || p.intro || "", path: p.path, image: p.og_image_path || p.hero_image_path, noindex: p.noindex, ld, main: parts.join("\n"), partners });
}
