// Sector / interest page template v2 (/cars/...), from the "Sector Page Designs" brief.
// Used when a sector page has content.template === "v2". All copy comes from site.pages; events, specialists,
// products, guides, related interests and local hubs are live data. Bands with nothing real to show either
// collapse or show an honest empty state (never illustrative "sample" cards).
import { E, img, ARROW, q, eventCard, bizCard } from "./home.js";
import { shell, crumbsHTML, newsletterHTML } from "./pages.js";
import { productCard } from "./shop.js";
import { interestData, SECTOR_HERO } from "./standard.js";

const SITE = "https://carsandcoffee.uk";
const CLUB = "https://club.carsandcoffee.uk";
const GROUPS = { services: "Car services", activities: "Things to do", types: "Car types" };
const FALLBACK_IMG = ["sectors/card-garage.webp", "sectors/card-meet.webp", "sectors/card-livery.webp", "sectors/card-drive.webp"];

const paras = (t) => String(t || "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
const band = (id, title, inner, cls = "") => `<section class="sx-band ${cls}" id="${id}"><div class="wrap">${title ? `<h2>${E(title)}</h2>` : ""}${inner}</div></section>`;
const textCard = (h, t, extra = "") => `<div class="sx-card"><div class="pad">${h ? `<h3>${E(h)}</h3>` : ""}${t ? `<p>${E(t)}</p>` : ""}${extra}</div></div>`;
const imgCard = (href, src, alt, h, t) => `<article class="sx-card">${src ? `<img src="${E(img(src))}" alt="${E(alt || "")}" loading="lazy" width="400" height="300">` : ""}<div class="pad"><h3>${href ? `<a href="${E(href)}">${E(h)}</a>` : E(h)}</h3>${t ? `<p>${E(t)}</p>` : ""}</div></article>`;
const empty = (msg, action = "") => `<div class="sx-box sx-empty"><p>${msg}</p>${action}</div>`;

export async function renderSector(p) {
  const c = p.content || {};
  const g = c.group || "services";
  const groupName = c.label || GROUPS[g] || "Interests";
  const short = c.short || p.title;
  const [d, partners] = await Promise.all([interestData(p, c), q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort").catch(() => [])]);
  const { events, articles, guides, listings, products, shopsById, related, hubs, towns, firstCat, card, counts } = d;

  const crumbs = [["Home", "/"], ["Interests", "/cars"], [groupName, `/cars#${g}`], [short, p.path]];
  const nav = []; // [id, label] for the jump bar, in page order
  const out = [];
  const add = (id, label, html) => { if (!html) return; if (label) nav.push([id, label]); out.push(html); };

  // hero
  const btn = (pair, ghost) => (pair && pair[0] && pair[1] !== "#enquire" ? `<a class="btn ${ghost ? "ghost" : "red"}" href="${E(/^(#|\/|https?:)/.test(pair[1]) ? pair[1] : "#" + pair[1])}">${E(pair[0])}${ghost ? "" : " " + ARROW}</a>` : "");
  const heroImg = p.hero_image_path || SECTOR_HERO[g] || SECTOR_HERO.types;
  const hero = `<section class="phero sx-hero">${heroImg ? `<img class="bg" src="${E(img(heroImg))}" alt="${E(p.hero_image_alt || "")}" fetchpriority="high">` : ""}<div class="wrap"><span class="eyebrow">${E(groupName)}</span><h1>${E(p.h1 || p.title)}</h1>${c.strap || p.intro ? `<p>${E(c.strap || p.intro)}</p>` : ""}<div class="btns">${btn(c.primary)}${btn(c.secondary, true)}</div></div></section>`;

  // At a glance: live counts for this interest; each card jumps to its section (or somewhere useful when there's nothing yet)
  const ICON = {
    events: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 13h3v3H8z"/>',
    listings: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    products: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    hub: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 15.2c.8-.5 1.6-.7 2.5-.7 2.5 0 4 1.9 4 4.5"/>',
    reads: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5V5.5z"/><path d="M12 6v13.5"/>',
  };
  const glance = [
    counts.events ? ["events", counts.events, counts.events === 1 ? "Upcoming event" : "Upcoming events", "#events", "See the dates"] : ["events", "", "Upcoming events", "/events", "Browse all events", "New dates added often"],
    counts.listings ? ["listings", counts.listings, counts.listings === 1 ? "Local specialist" : "Local specialists", "#specialists", "Find a specialist"] : ["listings", "", "Local specialists", "/directory/list-your-business", "List your business free", "Be the first listed"],
    counts.products ? ["products", counts.products, counts.products === 1 ? "Shop product" : "Shop products", "#shop", "Shop the range"] : ["hub", "", `${short} hub`, "#hub", "Join the conversation", "Free for members"],
    counts.reads ? ["reads", counts.reads, counts.reads === 1 ? "Guide or story" : "Guides and stories", "#guides", "Start reading"] : ["reads", "", "Guides and stories", "/guides", "Browse all guides", "More on the way"],
  ];
  add("facts", "", band("facts", "At a glance", `<div class="sx-stats sx-glances">${glance.map(([k, n, label, href, cta, note]) => `<a class="sx-glance${n ? "" : " is-empty"}" href="${E(href)}">
      <span class="sx-gi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>
      <span class="sx-gn">${n ? E(String(n)) : E(note)}</span><span class="sx-gl">${E(label)}</span>
      <span class="sx-gc">${E(cta)} ${ARROW}</span></a>`).join("")}</div>`));

  const intro = paras(c.intro || p.body_md);
  if (intro.length) {
    const county = hubs[0];
    const local = [county ? `<a href="${E(county.path)}">Car meets in ${E(county.county)} ${ARROW}</a>` : `<a href="/car-meets">Find a car meet ${ARROW}</a>`, c.dir ? `<a href="/directory/service/${E(c.dir)}">Browse ${E((c.dir_label || short).toLowerCase())} specialists ${ARROW}</a>` : `<a href="/directory">Browse the directory ${ARROW}</a>`];
    add("intro", "", band("intro", "A quick introduction", `<div class="sx-split"><div class="sx-prose">${intro.map((x) => `<p>${E(x)}</p>`).join("")}</div><aside class="sx-box"><h3>Explore the local scene</h3><p>Find a meet, talk to owners and discover local businesses.</p><p class="sx-links">${local.join("<br>")}</p></aside></div>`));
  }

  if (c.types?.length) add("types", "Find your type", band("types", "Find your type", `<div class="sx-grid four">${c.types.map(([h, t, src, href]) => imgCard(href, src, h, h, t)).join("")}</div>`));
  if (c.know?.length) add("know", "", band("know", "What to know", `<div class="sx-grid">${c.know.map(([h, t]) => textCard(h, t)).join("")}</div>`));
  if (c.options?.length) {
    const ol = c.options_link || ["Find out more", "#events"];
    const chev = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    add("options", "Options", `<section class="sx-band sx-opts" id="options"><div class="wrap">
      <div class="sx-opts-head"><h2>${E(c.options_title || "Options")}</h2><a class="btn red" href="${E(ol[1])}">${E(ol[0])} ${ARROW}</a></div>
      <div class="sx-opt-grid">${c.options.map(([h, t], i) => `<a class="sx-opt" href="${E(ol[1])}"><span class="sx-opt-n">${String(i + 1).padStart(2, "0")}</span><span class="sx-opt-b"><strong>${E(h)}</strong><span>${E(t)}</span></span><span class="sx-opt-go">${chev}</span></a>`).join("")}</div>
    </div></section>`);
  }
  if (c.steps?.length) add("process", "", band("process", c.steps_title || "How it works", `<ol class="sx-steps">${c.steps.map(([h, t]) => `<li><strong>${E(h)}</strong>${E(t)}</li>`).join("")}</ol>`));
  if (c.cost?.length) {
    const title = c.cost_title || "What affects the cost?";
    const check = (c.cost_style || (/need|bring|take|pack/i.test(title) ? "check" : "factor")) === "check";
    const lead = c.cost_lead || (check ? "Pack these before you set off, and check the organiser's own list for anything extra. Tick them off as you go." : "Every job is different. These are the things that most often change the price, so mention them when you ask for a quote.");
    const tick = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const items = c.cost.map((t, i) => check
      ? `<li><label class="sx-ck"><input type="checkbox" data-i="${i}"><span class="sx-ck-box">${tick}</span><span class="sx-ck-t">${E(t)}</span></label></li>`
      : `<li><span class="sx-ck-n">${String(i + 1).padStart(2, "0")}</span><span class="sx-ck-t">${E(t)}</span></li>`).join("");
    const script = check ? `<script>(function(){var b=document.getElementById('cost'),k='sx-pack:'+location.pathname,s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')}catch(e){}var cb=b.querySelectorAll('.sx-ck input'),o=b.querySelector('.sx-ck-prog');function u(){var n=0;cb.forEach(function(x){if(x.checked)n++;});o.querySelector('b').textContent=n;o.querySelector('i').style.width=(100*n/cb.length)+'%';o.classList.toggle('done',n===cb.length);}cb.forEach(function(x){x.checked=!!s[x.dataset.i];x.addEventListener('change',function(){s[x.dataset.i]=x.checked;try{localStorage.setItem(k,JSON.stringify(s))}catch(e){}u();});});u();})();</script>` : "";
    add("cost", "", `<section class="sx-band sx-cost${check ? " is-check" : ""}" id="cost"><div class="wrap sx-cost-in">
      <div class="sx-cost-head"><span class="sx-kicker">${check ? "Checklist" : "Good to know"}</span><h2>${E(title)}</h2><p>${E(lead)}</p>
        ${check ? `<div class="sx-ck-prog" aria-live="polite"><span><b>0</b> of ${c.cost.length} ready</span><em><i></i></em></div>` : ""}</div>
      <ul class="sx-ck-list">${items}</ul></div>${script}</section>`);
  }

  add("events", "Events", band("events", "Upcoming events", events.length ? `<div class="evs">${events.map(eventCard).join("")}</div><p class="sx-after"><a class="sx-more" href="/events">View all events ${ARROW}</a></p>` : empty("No matching events coming up just yet.", `<a class="btn red small" href="/events">Browse all events</a>`)));

  const dirHref = c.dir ? `/directory/service/${E(c.dir)}` : "/directory";
  add("specialists", "Directory", band("specialists", "Local specialists", `${listings.length ? `<div class="bizs">${listings.map(bizCard).join("")}</div>` : empty("We're still checking local specialists for this. Run one? Listing is free.")}<div class="btns sx-after"><a class="btn red" href="${dirHref}">Browse directory</a><a class="btn ghost" href="/directory/list-your-business">List your business</a></div>`));

  if (products.length) add("shop", "Shop", band("shop", "From the shop", `<div class="prods shp-grid">${products.map((x) => productCard(x, shopsById)).join("")}</div><p class="sx-after"><a class="sx-more" href="${firstCat ? `/shop/category/${E(firstCat.slug)}` : "/shop"}">Visit the shop ${ARROW}</a></p>`));

  const gal = (c.gallery || []).filter((x) => x && x.src);
  add("gallery", "Gallery", band("gallery", "Community gallery", gal.length
    ? `<div class="sx-gallery">${gal.slice(0, 9).map((x, i) => `<button type="button" data-i="${i}" aria-label="Enlarge photo${x.credit ? " by " + E(x.credit) : ""}"><img src="${E(img(x.src))}" alt="${E(x.alt || "")}" loading="lazy"></button>`).join("")}</div><small class="sx-cap">Photos shared by members with their permission.</small>
      <dialog class="sx-lb" id="sx-lb"><form method="dialog"><button class="sx-x" aria-label="Close">×</button></form><img alt=""><p></p></dialog>
      <script>(function(){var G=${JSON.stringify(gal.slice(0, 9).map((x) => ({ s: img(x.src), a: x.alt || "", c: x.credit || "" }))).replace(/</g, "\\u003c")},d=document.getElementById('sx-lb');document.querySelectorAll('.sx-gallery button').forEach(function(b){b.addEventListener('click',function(){var x=G[+b.dataset.i];d.querySelector('img').src=x.s;d.querySelector('img').alt=x.a;d.querySelector('p').textContent=x.c?'Photo: '+x.c:'';d.showModal();});});d.addEventListener('click',function(e){if(e.target===d)d.close();});})();</script>`
    : empty("Members share their galleries inside the club. Sign in to explore them, or share your own.", `<a class="btn red small" href="${CLUB}/login">Sign in</a>`)));

  const quotes = (c.quotes || []).filter((x) => x && x.text && x.approved);
  if (quotes.length) add("quotes", "", band("quotes", "What members say", `<div class="sx-grid">${quotes.map((x) => `<figure class="sx-card sx-quote"><div class="pad"><blockquote>${E(x.text)}</blockquote>${x.name ? `<figcaption>${E(x.name)}</figcaption>` : ""}</div></figure>`).join("")}</div>`));

  add("hub", "Club", band("hub", `Join the ${short.toLowerCase()} hub`, `<p>Sign in to join the conversation, share your car or ask the club a question.</p><div class="btns"><a class="btn red" href="${CLUB}/${c.hub ? "hubs/" + E(c.hub) : "apply"}">Join the club</a><a class="btn ghost" href="${CLUB}/login">Sign in</a></div>`, "sx-dark"));

  const reads = [...guides.map((x) => card(`/guides/${x.slug}`, x.image_path, x.image_alt, "Guide", x.title, x.intro)), ...articles.map((a) => card(`/news/${a.slug}`, a.image_path, a.image_alt, a.category || "News", a.title, a.excerpt))];
  add("guides", "Guides", band("guides", "Guides and stories", reads.length ? `<div class="news-grid">${reads.slice(0, 6).join("")}</div>` : empty("We're writing guides for this topic now.", `<a class="btn red small" href="/guides">Browse all guides</a>`)));

  if (hubs.length) add("near", "", band("near", "Near you", `<div class="lp-chips">${[...hubs, ...towns].map((h) => `<a class="lp-chip" href="${E(h.path)}">${E(h.town || h.county)}</a>`).join("")}<a class="lp-chip" href="/car-meets">All areas</a></div>`));

  if (c.faqs?.length) add("faq", "FAQs", band("faq", "Frequently asked questions", `<div class="lp-faq">${c.faqs.map(([qq, a]) => `<details><summary>${E(qq)}</summary><p>${E(a)}</p></details>`).join("")}</div>`));

  if (related.length) add("related", "", band("related", "Related interests", `<div class="sx-grid four">${related.slice(0, 4).map((r, i) => imgCard(r.path, r.hero_image_path || FALLBACK_IMG[i % 4], r.hero_image_alt || r.title, r.title, `Explore ${r.title.toLowerCase()}`)).join("")}</div><p class="sx-after"><a class="sx-more" href="/cars">All interests ${ARROW}</a></p>`));

  nav.push(["newsletter", "Newsletter"]);
  const jump = `<nav class="sx-jump" aria-label="On this page"><div class="wrap">${nav.map(([id, l]) => `<a href="#${id}">${E(l)}</a>`).join("")}<select aria-label="Jump to a section" onchange="if(this.value){var t=document.getElementById(this.value);if(t)t.scrollIntoView({behavior:'smooth'});this.value='';}"><option value="">Jump to…</option>${nav.map(([id, l]) => `<option value="${id}">${E(l)}</option>`).join("")}</select></div></nav>
    <script>document.addEventListener('DOMContentLoaded',function(){var nav=document.querySelector('.sx-jump');if(!nav)return;var links=[].slice.call(nav.querySelectorAll('a[href^="#"]')),secs=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));}),cur=null,tick=false;
      function spy(){tick=false;var off=(nav.getBoundingClientRect().bottom||0)+40,on=-1;for(var i=0;i<secs.length;i++){if(secs[i]&&secs[i].getBoundingClientRect().top<=off)on=i;}
        if(on>=0&&secs[on].getBoundingClientRect().bottom<off-40&&on===secs.length-1)on=-1;var a=on>=0?links[on]:null;if(a===cur)return;if(cur){cur.classList.remove('on');cur.removeAttribute('aria-current');}cur=a;if(a){a.classList.add('on');a.setAttribute('aria-current','location');}}
      addEventListener('scroll',function(){if(!tick){tick=true;setTimeout(spy,60);}},{passive:true});addEventListener('resize',spy);spy();});</script>`;

  const main = [`<div class="sx">`, crumbsHTML(crumbs), hero, jump, ...out, `</div>`, newsletterHTML()].join("\n");

  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) },
    { "@context": "https://schema.org", "@type": p.schema_type || "CollectionPage", name: p.meta_title || p.title, description: p.meta_description || c.strap || p.intro || "", url: SITE + p.path, dateModified: p.updated_at,
      ...(p.hero_image_path ? { image: SITE + img(p.hero_image_path) } : {}),
      ...(events.length || listings.length ? { mainEntity: { "@type": "ItemList", itemListElement: [...events.map((e) => ({ url: `${SITE}/events/${e.slug}`, name: e.title })), ...listings.map((l) => ({ url: `${SITE}/directory/${l.slug}`, name: l.name }))].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })) } } : {}) },
  ];
  if (c.faqs?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([qq, a]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: a } })) });

  return shell({ title: p.meta_title || `${p.title} | Cars and Coffee UK`, description: p.meta_description || c.strap || p.intro || "", path: p.path, image: p.og_image_path || p.hero_image_path, noindex: p.noindex, ld, main, partners });
}
