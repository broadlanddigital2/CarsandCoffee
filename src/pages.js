// Renders content pages (location pages for now) from site.pages, inside the homepage's header and footer.
import TEMPLATE from "./home-template.html";
import { E, img, utm, ARROW, q, eventCard, bizCard } from "./home.js";

const SITE = "https://www.carsandcoffee.uk";
const CLUB = "https://club.carsandcoffee.uk";
const INTEREST_LINKS = { "Classic cars": "classic-cars", "Track days": "track-days", "Detailing and wraps": "detailing-wraps", "Sim racing": "sim-racing",
  "Restoration and builds": "restoration-builds", "JDM": "jdm", "American": "american", "EV and hybrid": "ev-hybrid", "Modern performance and supercars": "modern-performance", "Rally": "rally", "F1": "f1" };
const slug = (x) => String(x).toLowerCase().replace(/[’']/g, "").replace(/ and /g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const enc = (s) => encodeURIComponent(s);

// The page shell: the homepage template with its <main>, title and meta swapped for this page's.
export function shell({ title, description, path, image, noindex, ld, main, partners }) {
  let html = TEMPLATE;
  const url = SITE + path;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${E(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${E(description)}">${noindex ? '<meta name="robots" content="noindex, follow">' : ""}`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${E(url)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${E(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${E(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${E(url)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${E(image ? (image.startsWith("http") ? image : SITE + img(image)) : SITE + "/og-home.jpg")}">`)
    .replace(/<link rel="preload" as="image"[^>]*>/g, "")
    .replace(/<main>[\s\S]*?<\/main>/, `<main>\n${main}\n</main>`)
    .replace("{{LD}}", JSON.stringify(ld).replace(/</g, "\\u003c"))
    .replace("{{FOOTER_PARTNERS}}", (partners || []).map((p) => `<a href="${utm(p.page_path, "footer", p.slug)}" rel="noopener"><img src="${E(img(p.logo_dark_path || p.logo_path))}" alt="${E(p.name)}" loading="lazy"></a>`).join(""))
    .replace(/\{\{ARROW\}\}/g, ARROW)
    .replace(/\{\{[^}]+\}\}/g, "");
  return html;
}

const sec = (heading, body, opts = {}) => `<section class="lp-sec"${opts.id ? ` id="${opts.id}"` : ""}><div class="wrap">${heading ? `<h2>${heading}</h2>` : ""}${opts.lead ? `<p class="lp-lead">${opts.lead}</p>` : ""}${body}</div></section>`;
const chips = (items) => `<div class="lp-chips">${items.map(([label, href]) => `<a class="lp-chip" href="${E(href)}">${E(label)}</a>`).join("")}</div>`;
const card = ({ href, image, alt, small, title, text }) => `<${href ? `a href="${E(href)}"` : "div"} class="lp-card">${image ? `<img src="${E(img(image))}" alt="${E(alt || title)}" loading="lazy" width="600" height="375">` : ""}<div class="pad">${small ? `<small>${E(small)}</small>` : ""}<h3>${E(title)}</h3>${text ? `<p>${E(text)}</p>` : ""}</div></${href ? "a" : "div"}>`;
const faqHTML = (faqs) => `<div class="lp-faq">${faqs.map(([qq, a]) => `<details><summary>${E(qq)}</summary><p>${E(a)}</p></details>`).join("")}</div>`;
const crumbsHTML = (items) => `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${items.map(([name, href], i) => `<li>${i < items.length - 1 ? `<a href="${E(href)}">${E(name)}</a>` : `<span aria-current="page">${E(name)}</span>`}</li>`).join("")}</ol></nav>`;
const newsletterHTML = () => `<section class="band news-band" aria-labelledby="nl-h" id="newsletter"><div class="wrap"><h2 id="nl-h">Get the next meet in your inbox</h2><p>Meet dates, stories and guides from Cars and Coffee UK, every week.</p>
<form id="nl" novalidate><input type="email" id="nl-email" name="email" autocomplete="email" placeholder="Your email address" aria-label="Email address" required><button class="btn red" type="submit">Subscribe</button>
<label><input type="checkbox" id="nl-consent" required> <span>I’d like to receive emails from Cars and Coffee UK, including events, news and partner offers. I can unsubscribe at any time. See our <a href="/privacy" style="text-decoration:underline">privacy policy</a>.</span></label><p class="msg" id="nl-msg" role="status"></p></form></div></section>`;

export async function loadPage(path) {
  const rows = await q(`pages?select=*&path=eq.${enc(path)}&status=eq.published&limit=1`);
  return rows[0] || null;
}

export async function renderLocation(p) {
  const c = p.content || {};
  const now = new Date().toISOString();
  const isHub = !p.county, isTown = !!p.town;
  const place = p.town || p.county || "East Anglia";
  const [eventsAll, listings, children, parentRows, siblings, partners] = await Promise.all([
    q(`events?select=*&ends_at=gte.${now}&order=starts_at&limit=12`),
    isHub ? Promise.resolve([]) : q(`directory_listings?select=slug,name,services,town,county,image_path,image_alt,featured,featured_until&county=eq.${enc(p.county)}&order=featured.desc,name&limit=6`),
    q(`pages?select=path,title,town,county,hero_image_path,intro,content&parent_id=eq.${p.id}&status=eq.published&order=title`),
    p.parent_id ? q(`pages?select=path,title,county,town&id=eq.${p.parent_id}`) : Promise.resolve([]),
    p.parent_id && isTown ? q(`pages?select=path,title,town,hero_image_path,intro&parent_id=eq.${p.parent_id}&status=eq.published&id=neq.${p.id}&order=title&limit=6`) : Promise.resolve([]),
    q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort"),
  ]);
  const parent = parentRows[0];
  // events: this town first, then the rest of the county, then everything (hub)
  let events = isHub ? eventsAll : eventsAll.filter((e) => e.county === p.county);
  if (isTown) events = [...events.filter((e) => e.town === p.town), ...events.filter((e) => e.town !== p.town)];
  const nearbyNote = !isHub && !events.length;
  if (nearbyNote) events = eventsAll;
  events = events.slice(0, 6);

  const crumbs = [["Home", "/"], ["Car meets", "/car-meets"]];
  if (parent && parent.path !== "/car-meets") crumbs.push([parent.county || parent.title, parent.path]);
  if (!isHub) crumbs.push([p.town || p.county, p.path]); else crumbs.pop(), crumbs.push(["Car meets", "/car-meets"]);

  const hero = `<section class="phero">${p.hero_image_path ? `<img class="bg" src="${E(img(p.hero_image_path))}" alt="${E(p.hero_image_alt || "")}">` : `<img class="bg" src="/homepage/hero.webp" alt="">`}
    <div class="wrap">${c.label ? `<span class="eyebrow">${E(c.label)}</span>` : ""}<h1>${E(p.h1 || p.title)}</h1>${p.intro ? `<p>${E(p.intro)}</p>` : ""}
    <div class="btns"><a class="btn red" href="#events">Upcoming meets ${ARROW}</a><a class="btn ghost" style="color:#fff;border-color:#fff" href="${CLUB}/apply">Join the community</a></div></div></section>`;

  const parts = [crumbsHTML(crumbs), hero];
  if (c.stats?.length) parts.push(sec("At a glance", `<div class="lp-stats">${c.stats.map(([n, l]) => `<div class="lp-stat"><strong>${E(n)}</strong><span>${E(l)}</span></div>`).join("")}</div>`));

  if (isHub) {
    const counties = children.filter((x) => x.county && !x.town);
    parts.push(sec("Choose a county", counties.length ? `<div class="lp-cards">${counties.map((x) => card({ href: x.path, image: x.hero_image_path || "homepage/ev-breakfast.webp", title: x.title, text: x.intro ? x.intro.split(". ")[0] + "." : "" })).join("")}</div>` : `<p class="lp-empty">County pages are coming soon.</p>`));
    const linkFor = (county, town) => `/car-meets/${slug(county)}/${slug(town)}`;
    if (c.norfolk_towns?.length) parts.push(sec("Norfolk towns", chips(c.norfolk_towns.map((t) => [t, linkFor("Norfolk", t)]))));
    if (c.suffolk_towns?.length) parts.push(sec("Suffolk towns", chips(c.suffolk_towns.map((t) => [t, linkFor("Suffolk", t)]))));
    if (c.coming_soon) parts.push(sec("Coming soon", `<p>${E(c.coming_soon)}</p>`));
  }

  parts.push(sec(isHub ? "Next meets" : `Upcoming events in and near ${E(place)}`, events.length ? `${nearbyNote ? `<p class="lp-lead">Nothing in ${E(place)} just yet. Here are the nearest upcoming meets.</p>` : ""}<div class="evs">${events.map(eventCard).join("")}</div><div class="btns" style="margin-top:18px"><a class="btn red" href="/events">See all events ${ARROW}</a></div>` : `<p class="lp-empty">No meets scheduled yet. Join the newsletter to hear first.</p>`, { id: "events" }));

  if (!isHub) {
    if (c.scene?.length) {
      const interests = (c.interests || []).map((n) => [n, INTEREST_LINKS[n] ? `/cars/${INTEREST_LINKS[n]}` : "/cars"]);
      parts.push(sec(`The ${E(place)} car scene`, `<div class="lp-split"><div class="lp-prose">${c.scene.map((x) => `<p>${E(x)}</p>`).join("")}</div>
        <div class="lp-panel">${interests.length ? `<h3>Popular here</h3>${chips(interests)}` : ""}<h3>Useful guides</h3>${chips([["Your first car meet", "/guides/your-first-car-meet"], ["Before you buy a classic", "/guides/before-you-buy-a-classic"], ["Photographing cars at a meet", "/guides/photographing-cars-at-a-meet"]])}</div></div>`));
    }
    if (c.drives?.length) parts.push(sec(`Best drives from ${E(place)}`, `<div class="lp-drives">${c.drives.map((d) => card({ image: d.image, title: d.title, text: d.text, small: d.distance })).join("")}</div>`, { lead: "Favourite routes for a weekend run. Drive to the conditions and respect the villages you pass through." }));
    parts.push(sec("What to expect at a meet", `<div class="lp-split"><ol class="lp-steps">
        <li><h3>Arrive and park</h3><p>Display cars and visitors usually park separately. Follow the marshals and keep entrances clear.</p></li>
        <li><h3>Walk the line-up</h3><p>Take your time, ask owners about their cars, and ask before photographing people or number plates.</p></li>
        <li><h3>Leave quietly</h3><p>No revving, no wheelspin. How we leave decides whether we are welcome back.</p></li></ol>
      <div class="lp-panel"><h3>Bring with you</h3><ul class="ticks"><li>A warm layer: mornings can be cold</li><li>Your phone or camera</li><li>Cash or card for coffee and food</li><li>Your RSVP or ticket, if the event needs one</li></ul>
        <h3>Accessibility</h3><p>Each event page lists step-free access, toilets and blue-badge parking where available.</p></div></div>`));
    parts.push(sec(`Clubs and hubs near ${E(place)}`, `<div class="lp-cards">${[
      card({ href: `${CLUB}/hubs/${slug(p.county)}`, image: "homepage/com-1.webp", small: "Club hub", title: `${p.county} hub`, text: `Meets, drives and car news across ${p.county}.` }),
      card({ href: `${CLUB}/hubs/classic-cars`, image: "homepage/gal-aston.webp", small: "Club hub", title: "Classic cars", text: "Ownership, restoration and runs." }),
      card({ href: `${CLUB}/hubs/track-days`, image: "homepage/rcg.webp", small: "Club hub", title: "Track days", text: "Snetterton dates, set-up and lap times." })].join("")}</div>
      <div class="btns" style="margin-top:18px"><a class="btn red" href="${CLUB}/apply">Join the Cars and Coffee club ${ARROW}</a></div>`));
    parts.push(sec("Trusted local businesses", listings.length ? `<div class="bizs">${listings.map(bizCard).join("")}</div>` : `<p class="lp-empty">We're checking local businesses for ${E(place)}. Know a good one? Tell us.</p>`,
      { lead: `Restorers, detailers, wrap shops and garages in and around ${E(place)}, checked by our team.` }).replace("</div></section>", `<div class="btns" style="margin-top:18px"><a class="btn ghost" href="/directory/region/${slug(place)}">Browse the ${E(place)} directory</a><a class="btn ghost" href="/directory/list-your-business">List your business</a></div></div></section>`));
    const towns = isTown ? siblings : children;
    const townsHTML = towns.length ? `<div class="lp-cards">${towns.map((x) => card({ href: x.path, image: x.hero_image_path || "homepage/ev-breakfast.webp", title: x.town || x.title, text: x.intro ? x.intro.split(". ")[0] + "." : "" })).join("")}</div>` : "";
    const more = (c.more_places || []).filter((n) => !towns.some((x) => x.town === n));
    if (townsHTML || more.length) parts.push(sec(isTown ? "Nearby towns" : `Car meets by town in ${E(p.county)}`, townsHTML + (more.length ? `<h3 style="margin-top:22px">More places</h3>${chips(more.map((n) => [n, `/car-meets/${slug(p.county)}/${slug(n)}`]))}` : "")));
    if (c.getting_there?.car || c.getting_there?.no_car) parts.push(sec(`Getting to meets in ${E(place)}`, `<div class="lp-split eq"><div class="lp-panel"><h3>By car</h3><p>${E(c.getting_there.car || "")}</p></div><div class="lp-panel"><h3>Without a car</h3><p>${E(c.getting_there.no_car || "")}</p></div></div>`));
  } else {
    parts.push(sec("How our meets work", `<ol class="lp-steps"><li><h3>Find a meet</h3><p>Pick a date near you on this page or the events calendar.</p></li><li><h3>RSVP or book</h3><p>Most morning meets are free; we ask you to RSVP so we can plan parking.</p></li><li><h3>Turn up and enjoy</h3><p>Coffee, cars and conversation. Bring what you drive.</p></li></ol>`));
  }
  if (c.faqs?.length) parts.push(sec("Frequently asked questions", faqHTML(c.faqs)));
  if (p.body_md) parts.push(sec("", `<div class="lp-prose">${p.body_md.split(/\n\s*\n/).map((x) => `<p>${E(x.trim())}</p>`).join("")}</div>`));
  parts.push(newsletterHTML());

  const url = SITE + p.path;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) },
    { "@context": "https://schema.org", "@type": p.schema_type || "CollectionPage", name: p.meta_title || p.title, description: p.meta_description || p.intro, url,
      about: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressRegion: p.county || "East Anglia", addressLocality: p.town || undefined, addressCountry: "GB" } },
      mainEntity: { "@type": "ItemList", itemListElement: events.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/events/${e.slug}`, name: e.title })) } },
  ];
  if (c.faqs?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([qq, a]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: a } })) });

  return shell({ title: p.meta_title || `${p.title} | Cars and Coffee UK`, description: p.meta_description || p.intro || "", path: p.path, image: p.og_image_path || p.hero_image_path, noindex: p.noindex, ld, main: parts.join("\n"), partners });
}
