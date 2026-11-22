// Editable pages from site.pages that aren't location hubs: legal pages, About, Contact, interest pages (/cars/...),
// ad landing pages (/go/...) and any other page the team creates in Admin → Marketing → All SEO pages.
import { E, img, ARROW, q, eventCard, bizCard, fmt } from "./home.js";
import { shell, crumbsHTML, newsletterHTML } from "./pages.js";
import { sanitize } from "./sanitize.js";

const SITE = "https://carsandcoffee.uk";
const CLUB = "https://club.carsandcoffee.uk";
const enc = encodeURIComponent;
const plain = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const faqHTML = (faqs) => `<div class="lp-faq">${faqs.map(([qq, a]) => `<details><summary>${E(qq)}</summary><p>${E(a)}</p></details>`).join("")}</div>`;

export async function renderStandard(p) {
  const c = p.content || {};
  const kind = c.kind || (p.page_type === "sector" ? "interest" : p.page_type === "landing" ? "landing" : "page");
  const partners = await q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort").catch(() => []);
  const crumbs = [["Home", "/"]];
  if (kind === "interest") crumbs.push(["Cars", "/cars"]);
  crumbs.push([p.title, p.path]);

  let body = p.body_html ? sanitize(p.body_html) : p.body_md ? p.body_md.split(/\n\s*\n/).map((x) => `<p>${E(x.trim())}</p>`).join("") : "";
  // contents list for long pages (legal pages, guides-style)
  const heads = [...body.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m, i) => ({ id: "s" + (i + 1), text: plain(m[1]) }));
  let n = 0; body = body.replace(/<h2>/g, () => `<h2 id="s${++n}">`);
  const toc = heads.length >= 4 ? `<nav class="guide-toc" aria-label="On this page"><strong>On this page</strong><ol>${heads.map((h) => `<li><a href="#${h.id}">${E(h.text)}</a></li>`).join("")}</ol></nav>` : "";
  const updated = p.updated_at ? fmt(p.updated_at, { day: "numeric", month: "long", year: "numeric" }) : "";

  const header = p.hero_image_path
    ? `<section class="phero"><img class="bg" src="${E(img(p.hero_image_path))}" alt="${E(p.hero_image_alt || "")}"><div class="wrap">${c.label ? `<span class="eyebrow">${E(c.label)}</span>` : ""}<h1>${E(p.h1 || p.title)}</h1>${p.intro ? `<p>${E(p.intro)}</p>` : ""}
        ${p.cta_label && p.cta_url ? `<div class="btns"><a class="btn red" href="${E(p.cta_url)}">${E(p.cta_label)} ${ARROW}</a></div>` : ""}</div></section>`
    : `<section class="lp-sec std-head"><div class="wrap">${c.label ? `<span class="eyebrow red">${E(c.label)}</span>` : ""}<h1 class="page-h1">${E(p.h1 || p.title)}</h1>${p.intro ? `<p class="lp-lead">${E(p.intro)}</p>` : ""}
        ${kind === "legal" && updated ? `<p class="std-updated">Last updated ${E(updated)}</p>` : ""}${p.cta_label && p.cta_url ? `<div class="btns"><a class="btn red" href="${E(p.cta_url)}">${E(p.cta_label)} ${ARROW}</a></div>` : ""}</div></section>`;

  const parts = [crumbsHTML(crumbs), header];
  if (p.path === "/contact") parts.push(contactSection(body));
  else if (body) parts.push(`<section class="lp-sec std-body"><div class="wrap ${toc ? "guide-grid" : "std-narrow"}">${toc}<div class="rich">${body}</div></div></section>`);
  if (p.path === "/cookies") parts.push(`<section class="lp-sec"><div class="wrap std-narrow"><button type="button" class="btn red" onclick="try{localStorage.removeItem('cac_consent')}catch(e){};location.reload()">Change my cookie settings</button></div></section>`);
  if (p.path === "/about") parts.push(await aboutExtras());
  if (kind === "interest") parts.push(...(await interestExtras(p, c)));
  if (c.faqs?.length) parts.push(`<section class="lp-sec" id="faqs"><div class="wrap"><h2>Frequently asked questions</h2>${faqHTML(c.faqs)}</div></section>`);
  if (kind !== "legal") parts.push(newsletterHTML());

  const type = p.path === "/about" ? "AboutPage" : p.path === "/contact" ? "ContactPage" : p.schema_type || "WebPage";
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) },
    { "@context": "https://schema.org", "@type": type, name: p.meta_title || p.title, description: p.meta_description || p.intro || "", url: SITE + p.path, dateModified: p.updated_at,
      ...(type === "AboutPage" || type === "ContactPage" ? { mainEntity: { "@type": "Organization", name: "Cars and Coffee UK", url: SITE, logo: `${SITE}/favicon.svg`, areaServed: ["Norfolk", "Suffolk"] } } : {}) },
  ];
  if (c.faqs?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([qq, a]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: a } })) });
  return shell({ title: p.meta_title || `${p.title} | Cars and Coffee UK`, description: p.meta_description || p.intro || "", path: p.path, image: p.og_image_path || p.hero_image_path, noindex: p.noindex, ld, main: parts.join("\n"), partners });
}

// ---------- Contact ----------
function contactSection(body) {
  return `<section class="lp-sec"><div class="wrap ct-grid">
    <div class="ct-form-wrap"><h2>Send us a message</h2>
      <form class="ct-form" id="ctf" novalidate>
        <div class="ct-row"><label>Your name<input name="name" autocomplete="name" required maxlength="120"></label><label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label></div>
        <label>What's it about?<select name="topic"><option value="general">General question</option><option value="events">Events and tickets</option><option value="club">The members' club</option><option value="directory">Business directory and listings</option><option value="advertising">Advertising and partnerships</option><option value="other">Something else</option></select></label>
        <label>Message<textarea name="message" rows="6" required maxlength="4000" placeholder="How can we help?"></textarea></label>
        <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
        <p class="ct-small">We'll only use your details to reply to you. See our <a href="/privacy">privacy policy</a>.</p>
        <button class="btn red" type="submit">Send message ${ARROW}</button>
        <p class="ct-msg" role="status"></p>
      </form>
      <script>(function(){var f=document.getElementById('ctf');var t=new URLSearchParams(location.search).get('topic');if(t&&f.topic.querySelector('option[value="'+t+'"]'))f.topic.value=t;
        f.addEventListener('submit',async function(e){e.preventDefault();var m=f.querySelector('.ct-msg'),b=f.querySelector('[type=submit]');
          if(!f.name.value.trim()||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(f.email.value.trim())||f.message.value.trim().length<5){m.textContent='Please add your name, a valid email address and a message.';m.className='ct-msg bad';return;}
          b.disabled=true;m.className='ct-msg';m.textContent='Sending…';
          try{var r=await fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name.value,email:f.email.value,topic:f.topic.value,message:f.message.value,cc_hp:f.cc_hp.value,page:'/contact'})});var j=await r.json().catch(function(){return{};});
            if(!r.ok)throw new Error(j.error||'Sorry, that didn\\'t send. Please try again.');
            f.outerHTML='<div class="ct-sent"><h3>Thanks, your message is on its way.</h3><p>We\\'ll reply by email, usually within a day or two.</p></div>';}
          catch(err){m.textContent=err.message;m.className='ct-msg bad';b.disabled=false;}});})();</script>
    </div>
    <aside class="ct-side">
      ${body ? `<div class="rich ct-intro">${body}</div>` : ""}
      <div class="lp-panel"><h3>Quick answers</h3><ul class="ct-links"><li><a href="/events">Upcoming events and tickets</a></li><li><a href="/guides/your-first-car-meet">Your first car meet</a></li><li><a href="${CLUB}/apply">Joining the members' club</a></li><li><a href="/directory/list-your-business">Listing your business</a></li><li><a href="/advertise">Advertising with us</a></li></ul>
        <p class="ct-small">You can also ask our help chat (bottom right) any time.</p></div>
    </aside></div></section>`;
}

// ---------- About ----------
async function aboutExtras() {
  const [stats, partners] = await Promise.all([q("site_stats?select=key,label,value,is_sample").catch(() => []), q("partners?select=slug,name,page_path,logo_path&active=is.true&order=sort").catch(() => [])]);
  const real = stats.filter((s) => !s.is_sample);
  return `${real.length ? `<section class="lp-sec"><div class="wrap"><div class="lp-stats">${real.slice(0, 4).map((s) => `<div class="lp-stat"><strong>${E(s.value)}</strong><span>${E(s.label)}</span></div>`).join("")}</div></div></section>` : ""}
    <section class="lp-sec"><div class="wrap"><h2>Get involved</h2><div class="ab-cards">
      <a class="ab-card" href="/events"><strong>Come to a meet</strong><span>Free breakfast meets most months across Norfolk and Suffolk.</span><em>See events ${ARROW}</em></a>
      <a class="ab-card" href="${CLUB}/apply"><strong>Join the club</strong><span>Share your car, find friends and get first dibs on events.</span><em>Join ${ARROW}</em></a>
      <a class="ab-card" href="/directory/list-your-business"><strong>List your business</strong><span>Garages, detailers and specialists checked by our team.</span><em>Get listed ${ARROW}</em></a>
      <a class="ab-card" href="/contact?topic=advertising"><strong>Partner with us</strong><span>Reach thousands of local car enthusiasts.</span><em>Talk to us ${ARROW}</em></a>
    </div></div></section>
    ${partners.length ? `<section class="lp-sec"><div class="wrap"><h2>Our partners</h2><div class="ab-partners">${partners.map((pn) => `<a href="${E(pn.page_path || "#")}" rel="noopener">${pn.logo_path ? `<img src="${E(img(pn.logo_path))}" alt="${E(pn.name)}" loading="lazy">` : `<b>${E(pn.name)}</b>`}</a>`).join("")}</div></div></section>` : ""}`;
}

// ---------- Interest pages (/cars/...) ----------
async function interestExtras(p, c) {
  const now = new Date().toISOString();
  const words = (c.match || [p.title]).map((w) => String(w).toLowerCase().replace(/[^a-z0-9 ]/g, "")).filter(Boolean).slice(0, 5);
  const ors = (cols) => "or=(" + words.flatMap((w) => cols.map((col) => `${col}.ilike.*${enc(w)}*`)).join(",") + ")";
  const [events, articles, guides, listings] = await Promise.all([
    words.length ? q(`events?select=*&ends_at=gte.${now}&${ors(["title", "summary", "event_type"])}&order=starts_at&limit=3`).catch(() => []) : [],
    words.length ? q(`articles?select=slug,title,excerpt,category,image_path,image_alt,published_at&${ors(["title", "excerpt", "category"])}&order=published_at.desc&limit=3`).catch(() => []) : [],
    words.length ? q(`guides?select=slug,title,intro,image_path,image_alt&${ors(["title", "intro", "body_html"])}&order=sort&limit=3`).catch(() => []) : [],
    (c.services || []).length ? q(`directory_listings?select=slug,name,services,town,image_path,image_alt,featured&or=(${c.services.map((s) => `services.cs.{${enc(s)}}`).join(",")})&limit=6`).catch(() => []) : [],
  ]);
  const card = (href, image, alt, small, title, text) => `<a class="news-card" href="${E(href)}">${image ? `<img src="${E(img(image))}" alt="${E(alt || "")}" loading="lazy" width="600" height="340">` : ""}<div class="pad"><small>${E(small)}</small><h3>${E(title)}</h3>${text ? `<p>${E(text)}</p>` : ""}<span class="more">Read more ${ARROW}</span></div></a>`;
  const out = [];
  out.push(`<section class="lp-sec"><div class="wrap"><h2>Upcoming events</h2>${events.length ? `<div class="evs">${events.map(eventCard).join("")}</div>` : `<p class="lp-empty">Nothing specific coming up yet. <a href="/events">See all events</a>.</p>`}</div></section>`);
  if (c.hub) out.push(`<section class="lp-sec"><div class="wrap ep-first"><div><strong>Talk ${E(p.title.toLowerCase())} with other enthusiasts.</strong> Join the ${E(p.title)} hub in the Cars and Coffee club.</div><a class="btn red small" href="${CLUB}/hubs/${E(c.hub)}">Open the hub</a></div></section>`);
  if (listings.length) out.push(`<section class="lp-sec"><div class="wrap"><h2>Specialists near you</h2><div class="bizs">${listings.map(bizCard).join("")}</div></div></section>`);
  const reads = [...guides.map((g) => card(`/guides/${g.slug}`, g.image_path, g.image_alt, "Guide", g.title, g.intro)), ...articles.map((a) => card(`/news/${a.slug}`, a.image_path, a.image_alt, a.category || "News", a.title, a.excerpt))];
  if (reads.length) out.push(`<section class="lp-sec"><div class="wrap"><h2>Guides and stories</h2><div class="news-grid">${reads.slice(0, 6).join("")}</div></div></section>`);
  return out;
}

// /cars: list of interest pages
export async function carsIndex() {
  const [pages, partners] = await Promise.all([q("pages?select=path,title,intro,hero_image_path,hero_image_alt&page_type=eq.sector&status=eq.published&order=title"), q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort").catch(() => [])]);
  const crumbs = [["Home", "/"], ["Cars", "/cars"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec std-head"><div class="wrap"><span class="eyebrow red">What you're into</span><h1 class="page-h1">Car interests</h1><p class="lp-lead">Events, guides, stories and specialists for the kind of motoring you love.</p>
    <div class="news-grid" style="margin-top:24px">${pages.map((x) => `<a class="news-card" href="${E(x.path)}">${x.hero_image_path ? `<img src="${E(img(x.hero_image_path))}" alt="${E(x.hero_image_alt || "")}" loading="lazy" width="600" height="340">` : ""}<div class="pad"><h3>${E(x.title)}</h3>${x.intro ? `<p>${E(x.intro)}</p>` : ""}<span class="more">Explore ${ARROW}</span></div></a>`).join("")}</div></div></section>`, newsletterHTML()].join("\n");
  return shell({ title: "Car interests: classics, track days, detailing and more | Cars and Coffee UK", description: "Events, guides and local specialists for classic cars, track days, detailing, restoration, sim racing and more across Norfolk and Suffolk.", path: "/cars", ld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Car interests", url: SITE + "/cars" }], main, partners });
}
