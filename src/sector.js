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
const TOPIC = { services: "directory", activities: "events", types: "club" };
const FALLBACK_IMG = ["sectors/card-garage.webp", "sectors/card-meet.webp", "sectors/card-livery.webp", "sectors/card-drive.webp"];
const ENQ_COPY = {
  services: "Tell us what you'd like done and where you're based. We'll pass your enquiry to a matching specialist or reply from the Cars and Coffee team.",
  activities: "Tell us which event or session you're considering and what you'd like to know. We can point you to the organiser.",
  types: "Ask the Cars and Coffee team about ownership, local meets or finding the right specialist.",
};

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
  const { events, articles, guides, listings, products, shopsById, related, hubs, towns, firstCat, card } = d;

  const crumbs = [["Home", "/"], ["Interests", "/cars"], [groupName, `/cars#${g}`], [short, p.path]];
  const nav = []; // [id, label] for the jump bar, in page order
  const out = [];
  const add = (id, label, html) => { if (!html) return; if (label) nav.push([id, label]); out.push(html); };

  // hero
  const btn = (pair, ghost) => (pair && pair[0] ? `<a class="btn ${ghost ? "ghost" : "red"}" href="${E(/^(#|\/|https?:)/.test(pair[1]) ? pair[1] : "#" + pair[1])}">${E(pair[0])}${ghost ? "" : " " + ARROW}</a>` : "");
  const heroImg = p.hero_image_path || SECTOR_HERO[g] || SECTOR_HERO.types;
  const hero = `<section class="phero sx-hero">${heroImg ? `<img class="bg" src="${E(img(heroImg))}" alt="${E(p.hero_image_alt || "")}" fetchpriority="high">` : ""}<div class="wrap"><span class="eyebrow">${E(groupName)}</span><h1>${E(p.h1 || p.title)}</h1>${c.strap || p.intro ? `<p>${E(c.strap || p.intro)}</p>` : ""}<div class="btns">${btn(c.primary)}${btn(c.secondary, true)}</div></div></section>`;

  if (c.facts?.length) add("facts", "", band("facts", "At a glance", `<div class="sx-stats">${c.facts.map(([v, l]) => `<div class="sx-card"><div class="pad"><strong>${E(v)}</strong><span>${E(l)}</span></div></div>`).join("")}</div>`));

  const intro = paras(c.intro || p.body_md);
  if (intro.length) {
    const county = hubs[0];
    const local = [county ? `<a href="${E(county.path)}">Car meets in ${E(county.county)} ${ARROW}</a>` : `<a href="/car-meets">Find a car meet ${ARROW}</a>`, c.dir ? `<a href="/directory/service/${E(c.dir)}">Browse ${E((c.dir_label || short).toLowerCase())} specialists ${ARROW}</a>` : `<a href="/directory">Browse the directory ${ARROW}</a>`];
    add("intro", "", band("intro", "A quick introduction", `<div class="sx-split"><div class="sx-prose">${intro.map((x) => `<p>${E(x)}</p>`).join("")}</div><aside class="sx-box"><h3>Explore the local scene</h3><p>Find a meet, talk to owners and discover local businesses.</p><p class="sx-links">${local.join("<br>")}</p></aside></div>`));
  }

  if (c.types?.length) add("types", "Find your type", band("types", "Find your type", `<div class="sx-grid four">${c.types.map(([h, t, src, href]) => imgCard(href, src, h, h, t)).join("")}</div>`));
  if (c.know?.length) add("know", "", band("know", "What to know", `<div class="sx-grid">${c.know.map(([h, t]) => textCard(h, t)).join("")}</div>`));
  if (c.options?.length) {
    const ol = c.options_link;
    add("options", "Options", band("options", c.options_title || "Options", `<div class="sx-grid">${c.options.map(([h, t]) => textCard(h, t, ol ? `<a class="sx-more" href="${E(ol[1])}">${E(ol[0])} ${ARROW}</a>` : "")).join("")}</div>`));
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

  add("enquire", "Enquire", band("enquire", "Ask or enquire", `<div class="sx-split"><div class="sx-prose"><p>${E(c.enquire_copy || ENQ_COPY[g] || ENQ_COPY.types)}</p><p class="ct-small">We use your details to reply. Read our <a href="/privacy">privacy policy</a>.</p></div>
    <form class="sx-form" id="sx-enq" data-captcha novalidate>
      <label>Name<input name="name" autocomplete="name" required maxlength="120"></label>
      <label>Email address<input name="email" type="email" autocomplete="email" required maxlength="200"></label>
      <label>What do you need?<textarea name="message" rows="4" required maxlength="4000"></textarea></label>
      <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
      <button class="btn red" type="submit">Send enquiry ${ARROW}</button><p class="ct-msg" role="status"></p>
    </form>
    <script>(function(){var f=document.getElementById('sx-enq');function G(n){var a=f.querySelectorAll('[name="'+n+'"]');for(var i=0;i<a.length;i++){var v=(a[i].value||'').trim();if(v)return v;}return '';}
      f.addEventListener('submit',async function(e){e.preventDefault();var m=f.querySelector('.ct-msg'),b=f.querySelector('[type=submit]');
        var miss=!G('name')?'Please add your name.':!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G('email'))?'Please check your email address.':G('message').length<5?'Please tell us a little about what you need.':'';if(miss){m.textContent=miss;m.className='ct-msg bad';return;}
        b.disabled=true;m.className='ct-msg';m.textContent='Sending…';
        try{var r=await fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:G('name'),email:G('email'),topic:${JSON.stringify(TOPIC[g] || "general")},message:${JSON.stringify("[" + short + "] ")}+G('message'),cc_hp:G('cc_hp'),page:location.pathname})});var j=await r.json().catch(function(){return{};});
          if(!r.ok)throw new Error(j.error||'Sorry, that didn\\'t send. Please try again.');
          f.outerHTML='<div class="sx-box"><h3>Thanks, your enquiry is on its way.</h3><p>We\\'ll reply by email, usually within a day or two.</p></div>';}
        catch(err){m.textContent=err.message;m.className='ct-msg bad';b.disabled=false;}});})();</script></div>`));

  nav.push(["newsletter", "Newsletter"]);
  const jump = `<nav class="sx-jump" aria-label="On this page"><div class="wrap">${nav.map(([id, l]) => `<a href="#${id}">${E(l)}</a>`).join("")}<select aria-label="Jump to a section" onchange="if(this.value){var t=document.getElementById(this.value);if(t)t.scrollIntoView({behavior:'smooth'});this.value='';}"><option value="">Jump to…</option>${nav.map(([id, l]) => `<option value="${id}">${E(l)}</option>`).join("")}</select></div></nav>`;

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
