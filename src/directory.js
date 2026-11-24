// Business directory: /directory, /directory/<business>, /directory/service/<service>, /directory/services,
// /directory/region/<area> and /directory/list-your-business.
import { E, img, ARROW, q, bizCard, SVC_ICON, SVC_DEFAULT } from "./home.js";
import { shell, crumbsHTML, newsletterHTML, directions } from "./pages.js";
import { sanitize } from "./sanitize.js";
import { galleryHTML, galleryOf } from "./ui.js";

// simple generic icons for social links (not the networks' logos); the link label names the network
const SV = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ACT_ICON = {
  web: SV('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  phone: SV('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  mail: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
};
const SOC_ICON = {
  Instagram: SV('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/>'),
  Facebook: SV('<path d="M7 10v11M7 10H4v11h3M7 10l4-7c1.5 0 2.5 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7.4A2.5 2.5 0 0 1 16.8 21H7"/>'),
  YouTube: SV('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>'),
  TikTok: SV('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  X: SV('<path d="M5 5l14 14M19 5 5 19"/>'),
  LinkedIn: SV('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>'),
};

const SITE = "https://carsandcoffee.uk";
const enc = encodeURIComponent;
const slugify = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const partnersQ = () => q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort").catch(() => []);
const LIST = "slug,name,services,town,county,image_path,image_alt,featured,featured_until,summary,checked_at,lat,lng,approximate";
const svcMatch = (l, s) => (l.services || []).some((x) => { const a = x.toLowerCase(), b = s.name.toLowerCase(); return a === b || a.startsWith(b.split(" ")[0]) || b.startsWith(a.split(" ")[0]); });
const icon = (slug) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${SVC_ICON[slug] || SVC_DEFAULT}</svg>`;
const ld = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) });
const listCta = `<section class="lp-sec"><div class="wrap dir-cta"><div><h2>Run a car business?</h2><p>Garages, detailers, restorers, tuners, wrap shops, storage and more: get in front of thousands of local enthusiasts. Listing is free and every business is checked by our team.</p></div><a class="btn red" href="/directory/list-your-business">List your business free ${ARROW}</a></div></section>`;
const howWeCheck = `<div class="lp-panel dir-check"><h3>How we check businesses</h3><ul class="ticks"><li>We confirm the business is real and trading locally</li><li>We look at its reviews, website and previous work</li><li>We act on feedback from our members</li></ul><p class="small">Spotted a problem with a listing? <a href="/contact?topic=directory">Let us know</a>.</p></div>`;

function searchForm(services, v = {}) {
  return `<form class="dir-search" action="/directory" method="get" role="search">
    <label>What<input name="q" value="${E(v.q || "")}" placeholder="e.g. ceramic coating, MOT, BMW specialist"></label>
    <label>Service<select name="service"><option value="">Any service</option>${services.map((s) => `<option value="${E(s.slug)}" ${v.service === s.slug ? "selected" : ""}>${E(s.name)}</option>`).join("")}</select></label>
    <label>Where<input name="area" value="${E(v.area || "")}" placeholder="Town, e.g. Norwich"></label>
    <button class="btn red" type="submit">Search</button></form>`;
}
const svcTiles = (services, listings) => `<div class="svc-grid">${services.map((s) => { const n = listings.filter((l) => svcMatch(l, s)).length;
  return `<a class="svc-t${n ? "" : " none"}" href="/directory/service/${E(s.slug)}">${icon(s.slug)}<strong>${E(s.name)}</strong><span>${n ? `${n} business${n === 1 ? "" : "es"}` : "Coming soon"}</span></a>`; }).join("")}</div>`;

// ---------- /directory (and search results) ----------
export async function directoryHome(params = {}) {
  const [listings, services, regions, partners, hubs] = await Promise.all([
    q(`directory_listings?select=${LIST}&order=featured.desc,name&limit=300`), q("directory_services?select=name,slug&order=sort"), q("directory_regions?select=name,slug&order=sort"), partnersQ(),
    q("pages?select=path,town,county&page_type=eq.location&status=eq.published&county=not.is.null").catch(() => []),
  ]);
  const term = String(params.q || "").trim().toLowerCase().slice(0, 80), svc = services.find((s) => s.slug === params.service), area = String(params.area || "").trim().toLowerCase().slice(0, 60);
  const searching = !!(term || svc || area);
  let results = listings;
  if (svc) results = results.filter((l) => svcMatch(l, svc));
  if (area) results = results.filter((l) => [l.town, l.county].some((x) => String(x || "").toLowerCase().includes(area)));
  if (term) results = results.filter((l) => [l.name, l.summary, (l.services || []).join(" "), l.town].join(" ").toLowerCase().includes(term));
  const crumbs = [["Home", "/"], ["Directory", "/directory"]];
  const featured = listings.filter((l) => l.featured).slice(0, 6);
  const areaLinks = regions.map((r) => `<a href="/directory/region/${E(r.slug)}">${E(r.name)}</a>`).join("");
  const main = [crumbsHTML(crumbs),
    `<section class="dir-hero"><div class="wrap"><span class="eyebrow">Checked by our team</span><h1>Trusted local car businesses</h1><p>Garages, detailers, restorers, tuners and specialists across Norfolk and Suffolk, recommended by our community.</p>${searchForm(services, { q: params.q, service: params.service, area: params.area })}</div></section>`,
    searching
      ? `<section class="lp-sec"><div class="wrap"><h2>${results.length} result${results.length === 1 ? "" : "s"}${svc ? ` for ${E(svc.name.toLowerCase())}` : ""}${area ? ` in ${E(params.area)}` : ""}${term ? ` matching “${E(params.q)}”` : ""}</h2>
          ${results.length ? `<div class="bizs">${results.map(bizCard).join("")}</div>` : `<p class="lp-empty">No businesses match yet. Try a wider search, or <a href="/directory">browse everything</a>.</p>`}<p style="margin-top:16px"><a class="more" href="/directory">Clear search ${ARROW}</a></p></div></section>`
      : [`<section class="lp-sec"><div class="wrap"><h2>Browse by service</h2>${svcTiles(services, listings)}</div></section>`,
        featured.length ? `<section class="lp-sec"><div class="wrap"><h2>Featured businesses</h2><div class="bizs">${featured.map(bizCard).join("")}</div></div></section>` : "",
        `<section class="lp-sec"><div class="wrap dir-two"><div><h2>Browse by area</h2><div class="dir-areas">${areaLinks}</div>
          ${hubs.length ? `<p class="small" style="margin-top:14px">Or see meets, drives and businesses together on your <a href="/car-meets">local car hub</a>.</p>` : ""}</div>${howWeCheck}</div></section>`,
        `<section class="lp-sec"><div class="wrap"><div class="dir-allhead"><h2>All businesses</h2><button type="button" class="btn ghost small" id="nearme">📍 Sort by distance from me</button></div><p class="dir-nearmsg small" role="status"></p><div class="bizs" id="allbiz">${listings.map(bizCard).join("")}</div></div></section>
        <script>(function(){var b=document.getElementById('nearme');if(!b)return;b.onclick=function(){var m=document.querySelector('.dir-nearmsg');if(!navigator.geolocation){m.textContent='Your browser can\'t share your location.';return;}m.textContent='Finding you…';
          navigator.geolocation.getCurrentPosition(function(p){var g=document.getElementById('allbiz'),cards=[].slice.call(g.children),R=3958.8,r=Math.PI/180;
            cards.forEach(function(c){var la=parseFloat(c.dataset.lat),ln=parseFloat(c.dataset.lng),mi=Infinity;if(!isNaN(la)){var dl=(la-p.coords.latitude)*r,dn=(ln-p.coords.longitude)*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(p.coords.latitude*r)*Math.cos(la*r)*Math.sin(dn/2)*Math.sin(dn/2);mi=2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
              c.dataset.mi=mi;var t=c.querySelector('.dist-tag');if(!t){t=document.createElement('span');t.className='tag dist-tag';(c.querySelector('.ph')||c).appendChild(t);}t.textContent=mi===Infinity?'Distance unknown':mi<1?'Under a mile':Math.round(mi)+' miles';});
            cards.sort(function(a,b){return a.dataset.mi-b.dataset.mi;}).forEach(function(c){g.appendChild(c);});m.textContent='Sorted by distance from you (worked out on your device; your location isn\'t sent anywhere).';},
            function(){m.textContent='Couldn\'t get your location. Check your browser\'s location setting.';},{maximumAge:600000,timeout:10000});};})();</script>`].join("\n"),
    listCta, newsletterHTML()].join("\n");
  return shell({ title: searching ? "Search the directory | Cars and Coffee UK" : "Car Garages, Detailers and Specialists in Norfolk and Suffolk | Cars and Coffee", description: "Find trusted local car businesses in Norfolk and Suffolk: garages, detailers, restorers, tuners, wrap shops and more, checked by the Cars and Coffee team.",
    path: "/directory", noindex: searching, ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", name: "Car businesses in Norfolk and Suffolk", itemListElement: listings.slice(0, 30).map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/directory/${l.slug}`, name: l.name })) }], main, partners });
}

// ---------- /directory/<business> ----------
const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= Math.round(n) ? "on" : ""}">★</span>`).join("")}</span>`;
function videoEmbed(url, poster, name) {
  if (!url) return "";
  let m, src = null;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/))) src = `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`;
  else if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d{5,12})/))) src = `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`;
  if (!src) return "";
  return `<div class="biz-video" data-src="${E(src)}" role="button" tabindex="0" aria-label="Play video about ${E(name)}" data-track="video">${poster ? `<img src="${E(img(poster))}" alt="" loading="lazy">` : ""}<span class="biz-play" aria-hidden="true">▶</span></div>`;
}
const socialHref = (v, base) => (!v ? null : /^https?:\/\//.test(v) ? v : base + v.replace(/^@/, ""));

export async function businessPage(slug) {
  const [rows, partners] = await Promise.all([q(`directory_listings?select=*&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const l = rows[0]; if (!l) return null;
  const [near, services, hubs, reviews] = await Promise.all([
    q(`directory_listings?select=${LIST}&slug=neq.${enc(slug)}${l.county ? `&county=eq.${enc(l.county)}` : ""}&limit=12`).catch(() => []),
    q("directory_services?select=name,slug&order=sort").catch(() => []),
    q(`pages?select=path,town,county&page_type=eq.location&status=eq.published&county=not.is.null`).catch(() => []),
    l.reviews_enabled ? q(`directory_reviews?select=id,name,rating,body,source,created_at,owner_reply&listing_id=eq.${l.id}&order=created_at.desc&limit=50`).catch(() => []) : [],
  ]);
  const related = near.filter((x) => (x.services || []).some((s) => (l.services || []).includes(s))).concat(near).filter((x, i, a) => a.findIndex((y) => y.slug === x.slug) === i).slice(0, 3);
  const hub = hubs.find((h) => h.town && h.town === l.town) || hubs.find((h) => !h.town && h.county === l.county);
  const svcOf = (name) => services.find((x) => svcMatch({ services: [name] }, x));
  const svcLink = (name) => { const s = svcOf(name); return s ? `<a class="lp-chip" href="/directory/service/${E(s.slug)}">${E(name)}</a>` : `<span class="lp-chip">${E(name)}</span>`; };
  const addr = [l.address_line, l.town, l.county, l.postcode].filter(Boolean).join(", ");
  const d = l.lat != null || l.town ? directions({ ...l, name: l.name }) : null;
  const web = l.website ? (/^https?:\/\//.test(l.website) ? l.website : "https://" + l.website) : null;
  const webUtm = web ? `${web}${web.includes("?") ? "&" : "?"}utm_source=carsandcoffee&utm_medium=directory&utm_campaign=${enc(l.slug)}` : null;
  const tel = l.phone ? l.phone.replace(/[^+\d]/g, "") : "";
  const showPhone = l.phone && l.show_phone !== false;
  const crumbs = [["Home", "/"], ["Directory", "/directory"], [l.name, `/directory/${l.slug}`]];
  const gallery = (Array.isArray(l.gallery) ? l.gallery : []).filter((x) => x && x.src);
  const offerings = (Array.isArray(l.offerings) ? l.offerings : []).filter((x) => x && x.name);
  const video = videoEmbed(l.video_url, l.image_path, l.name);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const realReviews = reviews.filter((r) => !/^\[sample/i.test(r.body || "")); // sample content is never sent to Google
  const realAvg = realReviews.length ? realReviews.reduce((n, r) => n + r.rating, 0) / realReviews.length : 0;
  const hours = l.hours && Object.keys(l.hours).length ? l.hours : null;
  const about = l.body_html ? sanitize(l.body_html) : l.summary ? `<p>${E(l.summary)}</p>` : `<p>More details about ${E(l.name)} coming soon.</p>`;
  const socials = [["Instagram", socialHref(l.instagram, "https://instagram.com/")], ["Facebook", socialHref(l.facebook, "https://facebook.com/")], ["YouTube", socialHref(l.youtube, "https://youtube.com/@")], ["TikTok", socialHref(l.tiktok, "https://tiktok.com/@")], ["X", socialHref(l.x_url, "https://x.com/")], ["LinkedIn", socialHref(l.linkedin, "https://www.linkedin.com/company/")]].filter(([, h]) => h);
  const phoneBtn = (cls) => showPhone ? `<button type="button" class="btn ${cls}" data-reveal="${E(tel)}" data-label="${E(l.phone)}" data-track="phone_reveal">Show number</button>` : "";
  const nav = [["About", "#about"], offerings.length && ["Services", "#offer"], gallery.length && ["Photos", "#photos"], video && ["Video", "#video"], l.reviews_enabled && ["Reviews", "#reviews"], l.enquiries_enabled && ["Enquire", "#enquire"], ["Location", "#location"]].filter(Boolean);
  const hoursHTML = hours ? `<table class="biz-hours" data-hours="${E(JSON.stringify(hours))}"><tbody>${DAYS.map(([k, n]) => { const h = hours[k] || {}; return `<tr data-day="${k}"><th>${n}</th><td>${h.closed || !h.open ? "Closed" : `${E(h.open)} to ${E(h.close)}`}</td></tr>`; }).join("")}</tbody></table>` : "";

  // related searches
  const town = l.town && !/^(norfolk|suffolk)$/i.test(l.town) ? l.town : null, place = town || l.county || "Norfolk";
  const rel = [];
  for (const s of (l.services || []).slice(0, 3)) { const sv = svcOf(s); if (!sv) continue; rel.push([`${sv.name} in ${place}`, town ? `/directory?service=${sv.slug}&area=${enc(town)}` : `/directory/service/${sv.slug}`]); rel.push([`${sv.name} in Norfolk and Suffolk`, `/directory/service/${sv.slug}`]); }
  if (hub) { rel.push([`Car meets in ${hub.town || hub.county}`, hub.path]); rel.push([`Car businesses in ${hub.town || hub.county}`, `${hub.path}#services`]); }
  rel.push(["All car services", "/directory/services"]);
  const relUnique = rel.filter((x, i, a) => a.findIndex((y) => y[0] === x[0]) === i).slice(0, 8);

  const main = [crumbsHTML(crumbs),
    `<section class="biz-hero"><div class="wrap biz-hero-in">
      <div class="biz-photo">${l.image_path ? `<img src="${E(img(l.image_path))}" alt="${E(l.image_alt || l.name)}">` : `<div class="biz-ph">${icon(services.find((s) => svcMatch(l, s))?.slug)}</div>`}${l.featured ? `<span class="tag feat-tag">Featured</span>` : ""}</div>
      <div class="biz-head">${l.logo_path ? `<img class="biz-logo" src="${E(img(l.logo_path))}" alt="">` : ""}<h1>${E(l.name)}</h1>
        <p class="biz-where"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>${E([l.town, l.county].filter((x, i, a) => x && a.indexOf(x) === i).join(", "))}
          ${hours ? `<span class="biz-open" data-open-status></span>` : ""}<span class="biz-dist" data-dist hidden></span></p>
        ${reviews.length ? `<a class="biz-rating" href="#reviews">${stars(avg)} <b>${avg.toFixed(1)}</b> · ${reviews.length} review${reviews.length === 1 ? "" : "s"}</a>` : ""}
        <div class="lp-chips">${(l.services || []).map(svcLink).join("")}</div>
        <p class="biz-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>Checked by Cars and Coffee${l.checked_at ? ` · ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(l.checked_at))}` : ""}</p>
        <div class="biz-acts">${webUtm ? `<a class="biz-act primary" href="${E(webUtm)}" target="_blank" rel="noopener" data-track="website">${ACT_ICON.web}<span><b class="biz-act-l">Visit website</b><small>${E(web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</small></span></a>` : ""}${showPhone ? `<button type="button" class="biz-act" data-reveal="${E(tel)}" data-label="${E(l.phone)}" data-track="phone_reveal">${ACT_ICON.phone}<span><b class="biz-act-l">Show number</b><small>Tap to reveal</small></span></button>` : ""}${l.enquiries_enabled ? `<a class="biz-act" href="#enquire">${ACT_ICON.mail}<span><b class="biz-act-l">Send an enquiry</b><small>Goes straight to them</small></span></a>` : ""}</div></div></div></section>`,
    `<nav class="hubnav" aria-label="On this page"><div class="wrap">${nav.map(([t, h]) => `<a href="${h}">${E(t)}</a>`).join("")}</div></nav>`,
    l.unclaimed ? `<section class="claim-ad" aria-labelledby="claim-h"><div class="wrap claim-ad-in">
      <div class="claim-ad-copy"><span class="claim-ad-tag">For the owner · Free</span>
        <h2 id="claim-h">Is ${E(l.name)} your business?</h2>
        <p>Car enthusiasts across Norfolk and Suffolk are finding local businesses here. Claim this page free and make it work for you.</p>
        <ul class="claim-ad-list">${[["Show off your work", "Photos, your logo and a gallery"], ["Get enquiries", "Messages come straight to your inbox"], ["List what you do", "Services, prices and opening times"], ["Build trust", "Reply to reviews and see your page views"]].map(([t, d]) => `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span><b>${t}</b>${d}</span></li>`).join("")}</ul></div>
      <div class="claim-ad-cta"><div class="claim-ad-price"><b>FREE</b><em>Listing</em><span>No catch, no contract</span></div>
        <a class="btn red claim-ad-btn" href="/directory/claim/${E(l.slug)}">Claim this business ${ARROW}</a>
        <p>Takes about two minutes. We check it's really yours, then it's over to you.</p></div>
    </div></section>` : "",
    `<section class="lp-sec"><div class="wrap ep-grid biz-grid"><div class="biz-main">
      <div id="about" class="biz-sec"><h2>About ${E(l.name)}</h2><div class="rich">${about}</div>${l.source === "companies_house" && l.unclaimed ? `<p class="ct-small">Basic company details from Companies House, licensed under the Open Government Licence v3.0. The owner hasn't added their own details yet.</p>` : ""}</div>
      ${offerings.length ? `<div id="offer" class="biz-sec"><h2>Services and products</h2><div class="biz-offer">${offerings.map((o) => `<div class="biz-off">${o.image ? `<img src="${E(img(o.image))}" alt="" loading="lazy">` : ""}<div><h3>${E(o.name)}</h3>${o.description ? `<p>${E(o.description)}</p>` : ""}${o.price ? `<p class="biz-price">${E(o.price)}</p>` : ""}</div></div>`).join("")}</div></div>` : ""}
      ${gallery.length ? `<div id="photos" class="biz-sec" data-track-gallery>${galleryHTML(galleryOf(gallery), l.name).replace('<h2 id="gal-h">Gallery', '<h2 id="gal-h">Photos')}</div>` : ""}
      ${video ? `<div id="video" class="biz-sec"><h2>Video</h2>${video}</div>` : ""}
      ${l.reviews_enabled ? `<div id="reviews" class="biz-sec"><h2>Reviews</h2>
        ${reviews.length ? `<div class="rv-sum">${stars(avg)}<strong>${avg.toFixed(1)} out of 5</strong><span>${reviews.length} review${reviews.length === 1 ? "" : "s"}</span></div>
          <ul class="rv-list">${reviews.map((r) => `<li>${stars(r.rating)}<p>${E(r.body)}</p><small>${E(r.name)} · ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(r.created_at))}${r.source !== "website" ? ` · via ${E(r.source)}` : ""}</small>${r.owner_reply ? `<div class="rv-reply"><strong>Reply from ${E(l.name)}</strong><p>${E(r.owner_reply)}</p></div>` : ""}</li>`).join("")}</ul>` : `<p class="lp-empty">No reviews yet. Used ${E(l.name)}? Be the first to review them.</p>`}
        <details class="rv-write"><summary class="btn ghost small">Write a review</summary>
          <form class="ct-form" id="rvf" novalidate><div class="rv-stars" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map((i) => `<label><input type="radio" name="rating" value="${i}"><span>★</span><b class="sr">${i} star${i > 1 ? "s" : ""}</b></label>`).join("")}</div>
            <div class="ct-row"><label>Your name (shown)<input name="name" autocomplete="name" maxlength="80" required></label><label>Email (not shown)<input name="email" type="email" autocomplete="email" maxlength="200" required></label></div>
            <label>Your review<textarea name="body" rows="4" maxlength="2000" required placeholder="What did they do for you, and how did it go?"></textarea></label>
            <p class="ct-small">Reviews are checked by our team before they appear. Please only review businesses you've used.</p>
            <button class="btn red" type="submit">Send review</button><p class="ct-msg" role="status"></p></form></details></div>` : ""}
      ${l.enquiries_enabled ? `<div id="enquire" class="biz-sec"><h2>Send ${E(l.name)} an enquiry</h2>
        <form class="ct-form" id="lead" novalidate><div class="ct-row"><label>Your name<input name="name" autocomplete="name" required maxlength="120"></label><label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label></div>
          <label>Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
          <div class="reg-box"><label for="lead-reg" style="margin:0">Your number plate (optional)</label><div class="reg-row"><input class="reg-in" id="lead-reg" maxlength="9" autocomplete="off" placeholder="AB12 CDE" aria-describedby="lead-reg-out"><button type="button" class="reg-find">Find my car</button></div><span class="reg-out" id="lead-reg-out" role="status"></span><input type="hidden" name="vehicle"></div>
          <label>Message<textarea name="message" rows="5" required maxlength="4000" placeholder="Tell them about your car and what you need."></textarea></label>
          <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
          <p class="ct-small">Your message and contact details go to ${E(l.name)} so they can reply. See our <a href="/privacy">privacy policy</a>.</p>
          <button class="btn red" type="submit">Send enquiry ${ARROW}</button><p class="ct-msg" role="status"></p></form></div>` : ""}
      ${hub ? `<div class="ep-first"><div><strong>More in ${E(hub.town || hub.county)}:</strong> meets, drives and other trusted businesses on the local car hub.</div><a class="btn ghost small" href="${E(hub.path)}">${E(hub.town || hub.county)} car hub</a></div>` : ""}
    </div>
    <aside class="ep-card biz-card-side" id="location"><h3>Contact and location</h3>
      ${l.lat != null && l.lng != null ? `<div class="biz-map" id="bizmap" role="region" aria-label="Map showing where ${E(l.name)} is" data-lat="${E(l.lat)}" data-lng="${E(l.lng)}" data-approx="${l.approximate ? 1 : 0}" data-name="${E(l.name)}"><p>Loading the map…</p></div><p class="biz-map-credit">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>
      <script>(function(){var el=document.getElementById('bizmap');if(!el)return;var started=false;
        function draw(){var lat=+el.dataset.lat,lng=+el.dataset.lng,ap=el.dataset.approx==='1';el.innerHTML='';var map=L.map(el,{scrollWheelZoom:false,zoomControl:true});
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
          if(ap){L.circle([lat,lng],{radius:600,color:'#c00d0d',weight:2,fillColor:'#c00d0d',fillOpacity:.12}).addTo(map);map.setView([lat,lng],13);}
          else{L.circleMarker([lat,lng],{radius:11,color:'#fff',weight:3,fillColor:'#c00d0d',fillOpacity:1}).addTo(map).bindTooltip(el.dataset.name,{direction:'top',offset:[0,-10]});map.setView([lat,lng],15);}}
        function start(){if(started)return;started=true;var c=document.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(c);
          var s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=draw;s.onerror=function(){el.innerHTML='<p>The map could not load. Use the directions below.</p>';};document.head.appendChild(s);}
        if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start();}},{rootMargin:'300px'});io.observe(el);}else start();})();</script>` : ""}
      ${addr ? `<p><strong>Address</strong><br>${E(addr)}</p>` : ""}
      ${showPhone ? `<p><strong>Phone</strong><br><button type="button" class="linkish" data-reveal="${E(tel)}" data-label="${E(l.phone)}" data-track="phone_reveal">Show number</button></p>` : ""}
      ${l.email ? `<p><strong>Email</strong><br><a href="mailto:${E(l.email)}" data-track="email">${E(l.email)}</a></p>` : ""}
      ${web ? `<p><strong>Website</strong><br><a href="${E(webUtm)}" target="_blank" rel="noopener" data-track="website">${E(web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a></p>` : ""}
      ${hours ? `<p><strong>Opening times</strong> <span class="biz-open" data-open-status></span></p>${hoursHTML}` : ""}
      ${l.opening_hours?.length ? `<ul class="biz-notes">${l.opening_hours.map((h) => `<li>${E(h)}</li>`).join("")}</ul>` : ""}
      ${socials.length ? `<p class="biz-social">${socials.map(([n, h]) => `<a href="${E(h)}" target="_blank" rel="noopener" data-track="social" aria-label="${E(l.name)} on ${n}" title="${n}">${SOC_ICON[n] || n}</a>`).join("")}</p>` : ""}
      ${d ? `<div class="lp-dir"><a class="btn red small" href="${E(d.google)}" target="_blank" rel="noopener" data-track="directions">Directions</a><a class="btn ghost small" href="${E(d.apple)}" target="_blank" rel="noopener" data-track="directions">Apple Maps</a></div>` : ""}
      ${l.lat != null ? `<p><button type="button" class="linkish" data-distance="${l.lat},${l.lng}">How far is it from me?</button></p>` : ""}
      ${l.approximate ? `<p class="small">Map location is approximate.</p>` : ""}
      <p class="small" style="margin-top:14px">Is this your business? <a href="/contact?topic=directory">Update your listing</a>.</p></aside></div></section>`,
    relUnique.length ? `<section class="lp-sec"><div class="wrap"><h2>Related searches</h2><div class="lp-chips rel-chips">${relUnique.map(([t, h]) => `<a class="lp-chip" href="${E(h)}">${E(t)}</a>`).join("")}</div></div></section>` : "",
    related.length ? `<section class="lp-sec"><div class="wrap"><h2>Similar businesses nearby</h2><div class="bizs">${related.map(bizCard).join("")}</div></div></section>` : "",
    listCta,
    `<div class="biz-bar">${showPhone ? `<button type="button" class="btn ghost" data-reveal="${E(tel)}" data-label="Call" data-track="phone_reveal">Call</button>` : ""}${l.enquiries_enabled ? `<a class="btn ghost" href="#enquire">Enquire</a>` : ""}${webUtm ? `<a class="btn red" href="${E(webUtm)}" target="_blank" rel="noopener" data-track="website">Website</a>` : ""}</div>`,
    bizScript(l.slug)].join("\n");
  const schema = { "@context": "https://schema.org", "@type": (l.services || []).some((s) => /servic|mot|tuning|repair|restor|bodywork/i.test(s)) ? "AutoRepair" : "AutomotiveBusiness", name: l.name, url: `${SITE}/directory/${l.slug}`, description: l.summary || undefined,
    image: l.image_path ? SITE + img(l.image_path) : undefined, telephone: l.phone || undefined, email: l.email || undefined, sameAs: [web, ...socials.map(([, h]) => h)].filter(Boolean),
    address: { "@type": "PostalAddress", streetAddress: l.address_line || undefined, addressLocality: l.town || undefined, addressRegion: l.county || undefined, postalCode: l.postcode || undefined, addressCountry: "GB" },
    ...(l.lat != null && !l.approximate ? { geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } } : {}),
    ...(hours ? { openingHoursSpecification: DAYS.filter(([k]) => hours[k] && !hours[k].closed && hours[k].open).map(([k, n]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: n, opens: hours[k].open, closes: hours[k].close })) } : {}),
    ...(realReviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: realAvg.toFixed(1), reviewCount: realReviews.length }, review: realReviews.slice(0, 5).map((r) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: r.rating }, author: { "@type": "Person", name: r.name }, reviewBody: r.body, datePublished: r.created_at.slice(0, 10) })) } : {}) };
  return shell({ title: l.meta_title || `${l.name}: ${(l.services || []).slice(0, 2).join(" and ")} in ${l.town || l.county || "Norfolk"} | Cars and Coffee`, description: l.meta_description || l.summary || `${l.name} in ${l.town || l.county}: ${(l.services || []).join(", ")}. Checked by Cars and Coffee UK.`,
    path: `/directory/${l.slug}`, image: l.image_path, ld: [ld(crumbs), schema], main, partners });
}

// tracking, number reveal, opening status, distance, video, review and enquiry forms
function bizScript(slug) {
  return `<script>(function(){function G(f,n){var a=f.querySelectorAll('[name="'+n+'"]');for(var i=0;i<a.length;i++){var v=(a[i].value||'').trim();if(v)return v;}return '';}var S=${JSON.stringify(slug)};
  function t(type){try{var b=JSON.stringify({slug:S,type:type});if(navigator.sendBeacon)navigator.sendBeacon('/api/track',new Blob([b],{type:'application/json'}));else fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true});}catch(e){}
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'directory_'+type,business:S});}catch(e){}}
  try{var k='cac-v-'+S;if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');t('view');}}catch(e){t('view');}
  document.addEventListener('click',function(e){var r=e.target.closest('[data-reveal]');
    if(r){e.preventDefault();var tel=r.getAttribute('data-reveal'),lab=r.getAttribute('data-label');document.querySelectorAll('[data-reveal]').forEach(function(x){var a=document.createElement('a');a.href='tel:'+tel;a.className=x.className;a.setAttribute('data-track','phone_call');if(x.classList.contains('biz-act')){a.innerHTML=x.innerHTML;a.querySelector('.biz-act-l').textContent=x.getAttribute('data-label');a.querySelector('small').textContent='Tap to call';a.classList.add('shown');}else a.textContent=x.getAttribute('data-label');x.replaceWith(a);});t('phone_reveal');return;}
    var a=e.target.closest('[data-track]');if(a&&a.getAttribute('data-track')!=='video')t(a.getAttribute('data-track'));
    if(e.target.closest('[data-track-gallery] .agal-t'))t('gallery');});
  // video: load the player only when asked (no third-party requests before)
  document.querySelectorAll('.biz-video').forEach(function(v){function play(){var f=document.createElement('iframe');f.src=v.getAttribute('data-src');f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.title='Video';v.innerHTML='';v.appendChild(f);v.classList.add('on');t('video');}
    v.addEventListener('click',play,{once:true});v.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}});});
  // open now / closed, in UK time
  var H=document.querySelector('[data-hours]');if(H){var hrs=JSON.parse(H.getAttribute('data-hours')),days=['sun','mon','tue','wed','thu','fri','sat'],names={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
    var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),o={};p.forEach(function(x){o[x.type]=x.value;});
    var di=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday),now=o.hour+':'+o.minute,today=days[di],h=hrs[today]||{},open=!h.closed&&h.open&&now>=h.open&&now<h.close,msg;
    var row=H.querySelector('[data-day="'+today+'"]');if(row)row.classList.add('today');
    if(open)msg='<b class="ok">Open now</b> · closes '+h.close;else{var nx=null;for(var i=0;i<8;i++){var dd=days[(di+i)%7],hh=hrs[dd]||{};if(!hh.closed&&hh.open&&(i>0||now<hh.open)){nx=(i===0?'today':i===1?'tomorrow':names[dd])+' '+hh.open;break;}}msg='<b class="no">Closed</b>'+(nx?' · opens '+nx:'');}
    document.querySelectorAll('[data-open-status]').forEach(function(x){x.innerHTML=msg;});}
  // distance from you (worked out in your browser; your location isn't sent anywhere)
  document.querySelectorAll('[data-distance]').forEach(function(b){b.addEventListener('click',function(){if(!navigator.geolocation){b.textContent='Your browser can\\'t share your location.';return;}
    b.textContent='Finding you…';navigator.geolocation.getCurrentPosition(function(pos){var ll=b.getAttribute('data-distance').split(',').map(Number),R=3958.8,r=Math.PI/180,dl=(ll[0]-pos.coords.latitude)*r,dn=(ll[1]-pos.coords.longitude)*r,
      x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(pos.coords.latitude*r)*Math.cos(ll[0]*r)*Math.sin(dn/2)*Math.sin(dn/2),mi=2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
      var txt=mi<1?'Less than a mile from you':'About '+Math.round(mi)+' miles from you';b.outerHTML='<span class="biz-distv">'+txt+' (in a straight line)</span>';var d=document.querySelector('[data-dist]');if(d){d.hidden=false;d.textContent=txt;}},
      function(){b.textContent='Couldn\\'t get your location. Check your browser\\'s location setting.';},{maximumAge:600000,timeout:10000});});});
  function send(form,url,data,okHtml){var m=form.querySelector('.ct-msg'),btn=form.querySelector('[type=submit]');btn.disabled=true;m.className='ct-msg';m.textContent='Sending…';
    fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(!r.ok)throw new Error(j.error||'Sorry, that didn\\'t send. Please try again.');form.outerHTML=okHtml;});})
      .catch(function(err){m.textContent=err.message;m.className='ct-msg bad';btn.disabled=false;});}
  var L=document.getElementById('lead');if(L)L.addEventListener('submit',function(e){e.preventDefault();var m=L.querySelector('.ct-msg');
    if(!G(L,'name')||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G(L,'email'))||G(L,'message').length<5){m.textContent='Please add your name, a valid email and a message.';m.className='ct-msg bad';return;}
    send(L,'/api/lead',{slug:S,name:G(L,'name'),email:G(L,'email'),phone:G(L,'phone'),message:(G(L,'vehicle')?'Car: '+G(L,'vehicle')+'\\n\\n':'')+G(L,'message'),cc_hp:G(L,'cc_hp')},'<div class="ct-sent"><h3>Enquiry sent.</h3><p>The business will reply to you directly by email or phone.</p></div>');});
  var R=document.getElementById('rvf');if(R)R.addEventListener('submit',function(e){e.preventDefault();var m=R.querySelector('.ct-msg'),rt=R.querySelector('[name=rating]:checked');
    if(!rt||!G(R,'name')||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G(R,'email'))||G(R,'body').length<10){m.textContent='Please choose a rating and add your name, email and a few words.';m.className='ct-msg bad';return;}
    send(R,'/api/review',{slug:S,name:G(R,'name'),email:G(R,'email'),rating:+rt.value,body:G(R,'body')},'<div class="ct-sent"><h3>Thanks for your review.</h3><p>Our team will check it and it will appear here soon.</p></div>');});
})();</script>`;
}

// ---------- /directory/service/<service> and /directory/services ----------
export async function servicePage(slug) {
  const [services, listings, partners] = await Promise.all([q("directory_services?select=name,slug&order=sort"), q(`directory_listings?select=${LIST}&order=featured.desc,name&limit=300`), partnersQ()]);
  const s = services.find((x) => x.slug === slug); if (!s) return null;
  const list = listings.filter((l) => svcMatch(l, s));
  const byCounty = ["Norfolk", "Suffolk"].map((c) => [c, list.filter((l) => l.county === c)]).filter(([, a]) => a.length);
  const crumbs = [["Home", "/"], ["Directory", "/directory"], [s.name, `/directory/service/${s.slug}`]];
  const name = s.name.toLowerCase();
  const main = [crumbsHTML(crumbs),
    `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">Directory</span><h1 class="page-h1">${E(s.name)} in Norfolk and Suffolk</h1><p class="lp-lead">${list.length ? `${list.length} trusted ${name} business${list.length === 1 ? "" : "es"}` : `Trusted ${name} businesses`}, checked by the Cars and Coffee team and recommended by local enthusiasts.</p>
      <div class="dir-svcnav">${services.map((x) => `<a class="${x.slug === slug ? "on" : ""}" href="/directory/service/${E(x.slug)}">${E(x.name)}</a>`).join("")}</div></div></section>`,
    list.length ? `<section class="lp-sec"><div class="wrap"><div class="bizs">${list.map(bizCard).join("")}</div>${byCounty.length > 1 ? `<p class="small" style="margin-top:14px">${byCounty.map(([c, a]) => `${a.length} in ${c}`).join(" · ")}</p>` : ""}</div></section>`
      : `<section class="lp-sec"><div class="wrap"><p class="lp-empty">We're still checking ${E(name)} businesses. Know a good one? <a href="/directory/list-your-business">Tell us</a> or <a href="/contact?topic=directory">recommend them</a>.</p></div></section>`,
    `<section class="lp-sec"><div class="wrap dir-two"><div><h2>Choosing a ${E(name)} specialist</h2><ul class="ticks"><li>Ask to see examples of similar work, ideally on cars like yours</li><li>Get a written quote and check what's included</li><li>Ask other owners: our members are always happy to share recommendations in the club</li></ul></div>${howWeCheck}</div></section>`,
    listCta].join("\n");
  return shell({ title: `${s.name} in Norfolk and Suffolk: Trusted Local Specialists | Cars and Coffee`, description: `Find trusted ${name} specialists in Norfolk and Suffolk, checked by the Cars and Coffee team and recommended by local car enthusiasts.`,
    path: `/directory/service/${s.slug}`, ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", name: `${s.name} in Norfolk and Suffolk`, itemListElement: list.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/directory/${l.slug}`, name: l.name })) }], main, partners });
}
export async function servicesIndex() {
  const [services, listings, partners] = await Promise.all([q("directory_services?select=name,slug&order=sort"), q(`directory_listings?select=${LIST}&limit=300`), partnersQ()]);
  const crumbs = [["Home", "/"], ["Directory", "/directory"], ["Services", "/directory/services"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">Directory</span><h1 class="page-h1">Car services</h1><p class="lp-lead">Pick a service to find trusted local specialists.</p>${svcTiles(services, listings)}</div></section>`, listCta].join("\n");
  return shell({ title: "Car services in Norfolk and Suffolk | Cars and Coffee UK", description: "Browse trusted local car services in Norfolk and Suffolk by type: restoration, servicing, tuning, bodywork, wraps, detailing, tyres and storage.", path: "/directory/services", ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: services.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/directory/service/" + x.slug })) }], main, partners });
}

// ---------- /directory/region/<area> ----------
export async function regionPage(slug) {
  const [regions, hubs] = await Promise.all([q("directory_regions?select=name,slug&order=sort"), q("pages?select=path,town,county&page_type=eq.location&status=eq.published&county=not.is.null").catch(() => [])]);
  const r = regions.find((x) => x.slug === slug);
  // forward to the local car hub when there is one for this area
  const hub = hubs.find((h) => slugify(h.town || h.county) === slug || (r && slugify(h.town || "") === slugify(r.name)) || (/^all-of-/.test(slug) && !h.town && slugify(h.county) === slug.replace(/^all-of-/, "")));
  if (hub) return { redirect: `${hub.path}#services` };
  const name = r ? r.name : slug === "east-anglia" ? "East Anglia" : null;
  if (!name) return null;
  const [listings, services, partners] = await Promise.all([q(`directory_listings?select=${LIST}&order=featured.desc,name&limit=300`), q("directory_services?select=name,slug&order=sort"), partnersQ()]);
  const n = name.toLowerCase().replace(/^all of /, "");
  const list = slug === "east-anglia" ? listings : listings.filter((l) => [l.town, l.county].some((x) => String(x || "").toLowerCase().includes(n)) || (n === "north norfolk" && l.county === "Norfolk"));
  const crumbs = [["Home", "/"], ["Directory", "/directory"], [name, `/directory/region/${slug}`]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">Directory</span><h1 class="page-h1">Car businesses in ${E(name.replace(/^All of /, ""))}</h1><p class="lp-lead">Trusted garages, detailers and specialists in and around ${E(name.replace(/^All of /, ""))}.</p></div></section>`,
    list.length ? `<section class="lp-sec"><div class="wrap"><div class="bizs">${list.map(bizCard).join("")}</div></div></section>` : `<section class="lp-sec"><div class="wrap"><p class="lp-empty">We're still checking businesses here. <a href="/directory">Browse the whole directory</a> or <a href="/directory/list-your-business">list yours</a>.</p></div></section>`,
    `<section class="lp-sec"><div class="wrap"><h2>Browse by service</h2>${svcTiles(services, list)}</div></section>`, listCta].join("\n");
  return shell({ title: `Car Garages and Specialists in ${name.replace(/^All of /, "")} | Cars and Coffee`, description: `Trusted car businesses in ${name.replace(/^All of /, "")}: garages, detailers, restorers and specialists checked by the Cars and Coffee team.`, path: `/directory/region/${slug}`, ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: list.slice(0, 30).map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/directory/" + x.slug })) }], main, partners });
}

// ---------- /directory/list-your-business ----------
export async function listYourBusiness() {
  const [services, partners] = await Promise.all([q("directory_services?select=name,slug&order=sort"), partnersQ()]);
  const crumbs = [["Home", "/"], ["Directory", "/directory"], ["List your business", "/directory/list-your-business"]];
  const main = [crumbsHTML(crumbs),
    `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">Free listing</span><h1 class="page-h1">List your business</h1><p class="lp-lead">Get in front of car enthusiasts across Norfolk and Suffolk. Listing is free. Start with the basics below, then sign in to build your full business profile. We check every business before it goes live, usually within a few days.</p></div></section>`,
    `<section class="lp-sec"><div class="wrap ct-grid"><form class="ct-form" id="lyb" novalidate>
      <h2 style="margin:0">Your business</h2>
      <label>Business name<input name="name" autocomplete="organization" required maxlength="120"></label>
      <fieldset class="lyb-svcs"><legend>Services you offer</legend>${services.map((s) => `<label class="lyb-chk"><input type="checkbox" name="services" value="${E(s.name)}"> ${E(s.name)}</label>`).join("")}<label class="lyb-chk lyb-other">Other<input name="other" autocomplete="off" maxlength="60" placeholder="e.g. MOT, paint protection film"></label></fieldset>
      <div class="ct-row"><label>Town<input name="town" autocomplete="address-level2" required maxlength="80" placeholder="e.g. Norwich"></label><label>County<select name="county" autocomplete="address-level1"><option>Norfolk</option><option>Suffolk</option><option>Cambridgeshire</option><option>Essex</option></select></label></div>
      <div class="ct-row"><label>Street address (optional)<input name="address" autocomplete="street-address" maxlength="200"></label><label>Postcode<input name="postcode" data-pc autocomplete="postal-code" maxlength="10" autocapitalize="characters"><input type="hidden" name="lat"><input type="hidden" name="lng"></label></div>
      <div class="ct-row"><label>Website<input name="website" type="text" inputmode="url" autocomplete="url" maxlength="200" placeholder="www.example.co.uk"></label><label>Public phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div>
      <label>Public email (optional)<input name="public_email" type="email" autocomplete="email" maxlength="200"></label>
      <label>About your business<textarea name="summary" rows="4" maxlength="600" placeholder="What you do, what you specialise in, and what makes you good at it."></textarea></label>
      <h2 style="margin:10px 0 0">About you</h2><p class="ct-small">Only our team sees these details. We use them to check your listing and contact you.</p>
      <div class="ct-row"><label>Your name<input name="contact_name" required maxlength="120" autocomplete="name"></label><label>Your email<input name="contact_email" type="email" required maxlength="200" autocomplete="email"></label></div>
      <label>Anything else we should know? (optional)<textarea name="notes" rows="2" maxlength="1000"></textarea></label>
      <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
      <label class="lyb-chk lyb-agree"><input type="checkbox" name="agree" required><span>I run or represent this business, and I agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</span></label>
      <button class="btn red" type="submit">Submit my listing ${ARROW}</button><p class="ct-msg" role="status"></p>
    </form>
    <script>(function(){var f=document.getElementById('lyb');function G(f,n){var a=f.querySelectorAll('[name="'+n+'"]');for(var i=0;i<a.length;i++){var v=(a[i].value||'').trim();if(v)return v;}return '';}f.addEventListener('submit',async function(e){e.preventDefault();var m=f.querySelector('.ct-msg'),b=f.querySelector('[type=submit]');
      var svcs=[].slice.call(f.querySelectorAll('[name=services]:checked')).map(function(x){return x.value;});if(G(f,'other'))svcs.push(G(f,'other'));
      var bad=!G(f,'name')?'Please add your business name.':!svcs.length?'Please choose at least one service.':!G(f,'town')?'Please add your town.':!G(f,'contact_name')?'Please add your name.':!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G(f,'contact_email'))?'Please check your email address.':!f.agree.checked?'Please confirm you represent the business.':'';
      if(bad){m.textContent=bad;m.className='ct-msg bad';return;}
      b.disabled=true;m.className='ct-msg';m.textContent='Sending…';
      var data={name:G(f,'name'),services:svcs,town:G(f,'town'),county:G(f,'county'),address:G(f,'address'),postcode:G(f,'postcode'),website:G(f,'website'),phone:G(f,'phone'),public_email:G(f,'public_email'),summary:G(f,'summary'),contact_name:G(f,'contact_name'),contact_email:G(f,'contact_email'),notes:G(f,'notes'),lat:G(f,'lat'),lng:G(f,'lng'),cc_hp:G(f,'cc_hp')};
      try{var r=await fetch('/api/listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});var j=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(j.error||'Sorry, that didn\\'t send. Please try again.');
        f.outerHTML='<div class="ct-sent lyb-next"><h3>Thanks, your business is registered.</h3><p><strong>Next: build your full profile.</strong> Add your services and prices, photos, logo, opening times and social links, and choose where enquiries go. Our team checks every listing before it goes live, usually within a few days.</p><p><a class="btn red" href="https://admin.carsandcoffee.uk">Build your business profile</a></p><p class="ct-small">Sign in with Google or an email link using <strong>'+data.contact_email.replace(/[<>&"]/g,'')+'</strong>, the address you just registered with. We\\'ve emailed you the link too.</p></div>';window.scrollTo(0,0);}
      catch(err){m.textContent=err.message;m.className='ct-msg bad';b.disabled=false;}});})();</script>
    <aside class="ct-side"><div class="lp-panel"><h3>How it works</h3><ol class="lyb-steps"><li><strong>Register the basics</strong><span>Two minutes: your business, services and town.</span></li><li><strong>Build your profile</strong><span>Sign in to add services and prices, a photo gallery, your logo, opening times and social links.</span></li><li><strong>We check it</strong><span>Our team checks every business, usually within a few days.</span></li><li><strong>Get found</strong><span>Enquiries come straight to you, customers leave reviews you can reply to, and you can see how many people view your page.</span></li></ol></div>
      <div class="lp-panel"><h3>Why list with us?</h3><ul class="ticks"><li>Free listing with your own business page</li><li>Shown on the local car hub for your town and on matching interest pages</li><li>Found by enthusiasts searching for your services</li><li>A "Checked by Cars and Coffee" badge</li></ul></div>
      <div class="lp-panel"><h3>Want more?</h3><p>Featured listings, sponsored slots and event partnerships put you in front of even more people.</p><a class="btn ghost small" href="/contact?topic=advertising">Ask about featured listings</a></div></aside></div></section>`].join("\n");
  return shell({ title: "List your car business free | Cars and Coffee UK", description: "List your garage, detailing, restoration, tuning or car business free in the Cars and Coffee directory for Norfolk and Suffolk.", path: "/directory/list-your-business", ld: [ld(crumbs)], main, partners });
}

// ---------- /directory/claim/<slug> ----------
export async function claimPage(slug) {
  const [rows, partners] = await Promise.all([q(`directory_listings?select=id,slug,name,town,county,unclaimed&slug=eq.${enc(slug)}&limit=1`), partnersQ()]);
  const l = rows[0]; if (!l) return null;
  const crumbs = [["Home", "/"], ["Directory", "/directory"], [l.name, `/directory/${l.slug}`], ["Claim", `/directory/claim/${l.slug}`]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">Free business profile</span><h1 class="page-h1">Claim ${E(l.name)}</h1><p class="lp-lead">Run ${E(l.name)}${l.town ? ` in ${E(l.town)}` : ""}? Claim the listing to build your full profile: photos, services and prices, opening times and contact details. You'll also see your enquiries and can reply to reviews. It's free.</p></div></section>`,
    l.unclaimed ? `<section class="lp-sec"><div class="wrap ct-grid"><form class="ct-form" id="clf" data-captcha novalidate>
      <div class="ct-row"><label>Your name<input name="name" autocomplete="name" required maxlength="120"></label><label>Your role<input name="role" maxlength="80" placeholder="e.g. Owner, Manager"></label></div>
      <div class="ct-row"><label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div>
      <p class="ct-small">Use your business email address if you have one (for example you@yourbusiness.co.uk). It helps us confirm you quickly. You'll sign in with this address.</p>
      <label>Anything that helps us check (optional)<textarea name="message" rows="3" maxlength="1000" placeholder="e.g. your website, or the best time to call the business"></textarea></label>
      <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
      <button class="btn red" type="submit">Send my claim ${ARROW}</button><p class="ct-msg" role="status"></p></form>
      <script>(function(){var f=document.getElementById('clf');function G(n){var a=f.querySelectorAll('[name="'+n+'"]');for(var i=0;i<a.length;i++){var v=(a[i].value||'').trim();if(v)return v;}return '';}
        f.addEventListener('submit',async function(e){e.preventDefault();var m=f.querySelector('.ct-msg'),b=f.querySelector('[type=submit]');
          var bad=!G('name')?'Please add your name.':!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G('email'))?'Please check your email address.':'';if(bad){m.textContent=bad;m.className='ct-msg bad';return;}
          b.disabled=true;m.className='ct-msg';m.textContent='Sending…';
          try{var r=await fetch('/api/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:${JSON.stringify(l.slug)},name:G('name'),role:G('role'),email:G('email'),phone:G('phone'),message:G('message'),cc_hp:G('cc_hp')})});var j=await r.json().catch(function(){return{};});
            if(!r.ok)throw new Error(j.error||'Sorry, that didn\\'t send. Please try again.');
            f.outerHTML='<div class="ct-sent"><h3>Thanks, we\\'ve got your claim.</h3><p>We\\'ll check you run the business, usually within a couple of days, then email you to sign in and build your profile.</p></div>';}
          catch(err){m.textContent=err.message;m.className='ct-msg bad';b.disabled=false;}});})();</script>
      <aside class="ct-side"><div class="lp-panel"><h3>What you get</h3><ul class="ticks"><li>Your own business page with photos, services and prices</li><li>Enquiries sent straight to you</li><li>Reviews you can reply to</li><li>See how many people view and contact you</li></ul></div></aside></div></section>`
    : `<section class="lp-sec"><div class="wrap"><p class="lp-empty">This business has already been claimed. If you think that's wrong, please <a href="/contact?topic=directory">contact us</a>.</p></div></section>`].join("\n");
  return shell({ title: `Claim ${l.name} | Cars and Coffee UK`, description: `Claim the free Cars and Coffee UK directory listing for ${l.name}.`, path: `/directory/claim/${l.slug}`, noindex: true, ld: [ld(crumbs)], main, partners });
}
