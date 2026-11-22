// Shop: /shop (home), /shop/<product>, /shop/category/<category>, /shop/sell, /shops (all partner shops),
// /shops/<shop> and /shops/<shop>/<category> (a partner's own storefront with its own navigation).
// Products with no shop are club products. Partner products appear in their storefront and in the main shop.
// Checkout isn't built yet: products link to the partner's own page (buy_url) or to an enquiry.
import { E, img, ARROW, q, money } from "./home.js";
import { shell, crumbsHTML, newsletterHTML } from "./pages.js";
import { sanitize, safeUrl } from "./sanitize.js";
import { galleryHTML, galleryOf, shareBar } from "./ui.js";

const SITE = "https://carsandcoffee.uk";
const P = "id,slug,name,price_pence,member_price_pence,compare_at_pence,badge,image_path,image_alt,shop_id,category_id,condition,stock_status,featured,brand,created_at,units_sold_30d,sort,summary";
const SHOP = "id,slug,name,tagline,logo_path,banner_path,town,county,featured,featured_order";
const STOCK = { in_stock: "In stock", low: "Low stock", out: "Out of stock", preorder: "Pre-order" };
const COND = { new: "New", used: "Used", refurbished: "Refurbished" };
const ld = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) });
const partnersQ = () => q("partners?select=slug,name,page_path,logo_path,logo_dark_path&order=sort").catch(() => []);
const catsQ = () => q("product_categories?select=id,slug,name,parent_id,description,image_path,sort,meta_title,meta_description&order=sort,name");
const shopsQ = () => q(`shops?select=${SHOP}&order=featured.desc,featured_order,name`).catch(() => []);
const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const logoHTML = (s, cls = "shp-logo") => s.logo_path ? `<img class="${cls}" src="${E(img(s.logo_path))}" alt="${E(s.name)} logo" loading="lazy">` : `<span class="${cls} mono" aria-hidden="true">${E(initials(s.name))}</span>`;
const link = (u) => { const v = String(u || "").trim(); return v ? safeUrl(/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v) ? "https://" + v : v) || "" : ""; };
const BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg>';
const sorter = (list) => list.sort((a, b) => (b.featured - a.featured) || (a.sort - b.sort) || String(b.created_at).localeCompare(String(a.created_at)));

export function productCard(p, shopsById = {}) {
  const s = p.shop_id ? shopsById[p.shop_id] : null;
  const tag = p.badge || (p.compare_at_pence > p.price_pence ? "Sale" : p.condition !== "new" ? COND[p.condition] : p.stock_status === "low" ? "Low stock" : p.stock_status === "preorder" ? "Pre-order" : "");
  return `<article class="prod shp-card" data-price="${p.price_pence || 0}" data-new="${E(p.created_at || "")}" data-shop="${E(s ? s.slug : "club")}" data-cond="${E(p.condition)}" data-pop="${p.units_sold_30d || 0}">
<a class="ph" href="/shop/${E(p.slug)}" tabindex="-1">${p.image_path ? `<img src="${E(img(p.image_path))}" alt="${E(p.image_alt || p.name)}" width="436" height="254" loading="lazy">` : `<span class="shp-noimg">${BAG}</span>`}${tag ? `<span class="tag">${E(tag)}</span>` : ""}</a>
<p class="shp-by">${s ? E(s.name) : "Cars and Coffee UK"}</p>
<h3><a href="/shop/${E(p.slug)}">${E(p.name)}</a></h3>
<p class="price"><b>${money(p.price_pence)}</b>${p.compare_at_pence > p.price_pence ? ` <s>${money(p.compare_at_pence)}</s>` : ""}${p.member_price_pence ? ` <span>Members ${money(p.member_price_pence)}</span>` : ""}${p.stock_status === "out" ? ` <em class="shp-out">Out of stock</em>` : ""}</p></article>`;
}
const grid = (list, byId, id) => list.length ? `<div class="prods shp-grid"${id ? ` id="${id}"` : ""}>${list.map((p) => productCard(p, byId)).join("")}</div>` : `<p class="lp-empty">No products here yet. Check back soon.</p>`;
const byIdOf = (shops) => Object.fromEntries(shops.map((s) => [s.id, s]));

// family of a category: itself plus children
const family = (cats, id) => [id, ...cats.filter((c) => c.parent_id === id).map((c) => c.id)];

// sort/filter bar, worked out in the browser
function tools(list, shops, { showShop = true } = {}) {
  const shopOpts = showShop ? [...new Set(list.map((p) => p.shop_id || "club"))].map((id) => id === "club" ? ["club", "Cars and Coffee UK"] : [shops[id]?.slug, shops[id]?.name]).filter((x) => x[0]) : [];
  const conds = [...new Set(list.map((p) => p.condition))];
  return `<div class="shp-tools" data-target="pgrid"><label>Sort<select data-sort><option value="">Featured</option><option value="pop">Most popular</option><option value="new">Newest</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option></select></label>
${shopOpts.length > 1 ? `<label>Shop<select data-shop><option value="">All shops</option>${shopOpts.map(([v, n]) => `<option value="${E(v)}">${E(n)}</option>`).join("")}</select></label>` : ""}
${conds.length > 1 ? `<label>Condition<select data-cond><option value="">Any</option>${conds.map((c) => `<option value="${E(c)}">${E(COND[c])}</option>`).join("")}</select></label>` : ""}<span class="shp-count" role="status">${list.length} product${list.length === 1 ? "" : "s"}</span></div>`;
}
const toolsJS = `<script>(function(){document.querySelectorAll('.shp-tools').forEach(function(t){var g=document.getElementById(t.dataset.target);if(!g)return;var orig=[].slice.call(g.children),c=t.querySelector('.shp-count');
function run(){var s=(t.querySelector('[data-sort]')||{}).value,sh=(t.querySelector('[data-shop]')||{}).value,co=(t.querySelector('[data-cond]')||{}).value,list=orig.slice(),n=0;
if(s==='lo')list.sort(function(a,b){return a.dataset.price-b.dataset.price;});if(s==='hi')list.sort(function(a,b){return b.dataset.price-a.dataset.price;});
if(s==='new')list.sort(function(a,b){return b.dataset.new.localeCompare(a.dataset.new);});if(s==='pop')list.sort(function(a,b){return b.dataset.pop-a.dataset.pop;});
list.forEach(function(el){var ok=(!sh||el.dataset.shop===sh)&&(!co||el.dataset.cond===co);el.hidden=!ok;if(ok)n++;g.appendChild(el);});c.textContent=n+' product'+(n===1?'':'s');}
t.addEventListener('change',run);});})();</script>`;

const sellCta = `<section class="lp-sec"><div class="wrap dir-cta"><div><h2>Sell on Cars and Coffee UK</h2><p>Open your own shop page with your logo and products, listed in front of thousands of UK car and motorsport fans. Simple monthly plan, small commission on sales.</p></div><a class="btn red" href="/shop/sell">Open a shop ${ARROW}</a></div></section>`;
const searchBox = (v = "") => `<form class="shp-search" action="/shop" method="get" role="search"><input name="q" value="${E(v)}" placeholder="Search parts, car care, clothing…" aria-label="Search the shop" maxlength="80"><button class="btn red" type="submit">Search</button></form>`;

// ---------- /shop ----------
export async function shopHome(params = {}) {
  const [products, cats, shops, partners] = await Promise.all([q(`products?select=${P}&order=sort,name&limit=500`), catsQ(), shopsQ(), partnersQ()]);
  const byId = byIdOf(shops), term = String(params.q || "").trim().toLowerCase().slice(0, 80);
  const crumbs = [["Home", "/"], ["Shop", "/shop"]];
  if (term) {
    const words = term.split(/\s+/).filter(Boolean), catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    const hits = sorter(products.filter((p) => { const hay = [p.name, p.summary, p.brand, catName[p.category_id], byId[p.shop_id]?.name].join(" ").toLowerCase(); return words.every((w) => hay.includes(w)); }));
    return shell({ title: `Shop search: ${params.q} | Cars and Coffee UK`, description: "Search the Cars and Coffee UK shop.", path: "/shop", noindex: true, ld: ld(crumbs), partners,
      main: [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0"><div class="wrap"><h1 class="shp-h1">Shop search</h1>${searchBox(params.q)}<h2>${hits.length} result${hits.length === 1 ? "" : "s"} for “${E(params.q)}”</h2>${grid(hits, byId)}<p style="margin-top:16px"><a class="more" href="/shop">Back to the shop ${ARROW}</a></p></div></section>`].join("\n") });
  }
  const tops = cats.filter((c) => !c.parent_id);
  const count = (c) => { const f = family(cats, c.id); return products.filter((p) => f.includes(p.category_id)).length; };
  const fs = shops.find((s) => s.featured);
  const fsProducts = fs ? sorter(products.filter((p) => p.shop_id === fs.id)).slice(0, 4) : [];
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const latest = [...products].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  const club = products.filter((p) => !p.shop_id).slice(0, 4);
  const main = [crumbsHTML(crumbs),
    `<section class="dir-hero shp-hero"><div class="wrap"><span class="eyebrow">The Cars and Coffee shop</span><h1>Parts, car care, clothing and more</h1><p>Club merch and products from trusted UK specialists, all in one place.</p>${searchBox()}</div></section>`,
    `<section class="lp-sec"><div class="wrap"><h2>Shop by category</h2><div class="shp-cats">${tops.map((c) => { const n = count(c); return `<a class="shp-cat" href="/shop/category/${E(c.slug)}">${c.image_path ? `<img src="${E(img(c.image_path))}" alt="" loading="lazy">` : ""}<strong>${E(c.name)}</strong><span>${n ? `${n} product${n === 1 ? "" : "s"}` : "Coming soon"}</span></a>`; }).join("")}</div></div></section>`,
    fs ? `<section class="lp-sec"><div class="wrap"><span class="eyebrow" style="color:var(--red2)">Featured shop</span><div class="shp-feat">
      <a class="shp-feat-card" href="/shops/${E(fs.slug)}"${fs.banner_path ? ` style="background-image:linear-gradient(90deg,rgba(18,10,7,.9),rgba(18,10,7,.55)),url('${E(img(fs.banner_path))}')"` : ""}>${logoHTML(fs)}<h2>${E(fs.name)}</h2>${fs.tagline ? `<p>${E(fs.tagline)}</p>` : ""}${fs.town ? `<p class="small">${E([fs.town, fs.county].filter(Boolean).join(", "))}</p>` : ""}<span class="btn red">Visit the shop ${ARROW}</span></a>
      <div class="prods shp-grid shp-two">${fsProducts.map((p) => productCard(p, byId)).join("")}</div></div></div></section>` : "",
    featured.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Featured products</h2></div>${grid(featured, byId)}</div></section>` : "",
    shops.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Partner shops</h2><a class="more" href="/shops">All shops ${ARROW}</a></div><div class="shp-shops">${shops.slice(0, 8).map(shopTile).join("")}</div></div></section>` : "",
    club.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Club merch</h2><a class="more" href="/shop/category/clothing">See all ${ARROW}</a></div>${grid(club, byId)}</div></section>` : "",
    `<section class="lp-sec"><div class="wrap"><h2>New in</h2>${grid(latest, byId)}</div></section>`,
    sellCta, newsletterHTML()].join("\n");
  return shell({ title: "Shop: car parts, car care and clothing | Cars and Coffee UK", description: "Shop car parts, detailing products, tools, clothing and gifts from Cars and Coffee UK and trusted UK specialists.", path: "/shop", ld: ld(crumbs), partners, main });
}
const shopTile = (s) => `<a class="shp-tile" href="/shops/${E(s.slug)}">${logoHTML(s)}<span><strong>${E(s.name)}</strong>${s.tagline ? `<small>${E(s.tagline)}</small>` : ""}</span></a>`;

// ---------- /shop/category/<slug> ----------
export async function categoryPage(slug) {
  const [cats, shops, partners] = await Promise.all([catsQ(), shopsQ(), partnersQ()]);
  const c = cats.find((x) => x.slug === slug);
  if (!c) return null;
  const parent = c.parent_id ? cats.find((x) => x.id === c.parent_id) : null;
  const kids = cats.filter((x) => x.parent_id === c.id);
  const ids = family(cats, c.id);
  const products = sorter(await q(`products?select=${P}&category_id=in.(${ids.join(",")})&limit=500`));
  const byId = byIdOf(shops);
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ...(parent ? [[parent.name, `/shop/category/${parent.slug}`]] : []), [c.name, `/shop/category/${c.slug}`]];
  const siblings = parent ? cats.filter((x) => x.parent_id === parent.id) : [];
  const chips = kids.length ? kids : siblings;
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap"><h1 class="shp-h1">${E(c.name)}</h1>${c.description ? `<p class="lp-lead">${E(c.description)}</p>` : ""}
    ${chips.length ? `<div class="lp-chips">${parent ? `<a class="lp-chip" href="/shop/category/${E(parent.slug)}">All ${E(parent.name.toLowerCase())}</a>` : ""}${chips.map((k) => `<a class="lp-chip${k.id === c.id ? " on" : ""}" href="/shop/category/${E(k.slug)}">${E(k.name)}</a>`).join("")}</div>` : ""}
    ${products.length ? tools(products, byId) : ""}${grid(products, byId, "pgrid")}</div></section>${toolsJS}`, sellCta].join("\n");
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: products.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/shop/${p.slug}` })) };
  return shell({ title: c.meta_title || `${c.name} | Cars and Coffee UK shop`, description: c.meta_description || c.description || `Shop ${c.name.toLowerCase()} from Cars and Coffee UK and trusted UK specialists.`, path: `/shop/category/${c.slug}`, ld: [ld(crumbs), itemList], partners, main });
}

// ---------- /shop/<product> ----------
export async function productPage(slug) {
  const [rows, cats, shops, partners] = await Promise.all([q(`products?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`), catsQ(), shopsQ(), partnersQ()]);
  const p = rows[0];
  if (!p) return null;
  const byId = byIdOf(shops);
  const shop = p.shop_id ? (await q(`shops?select=*&id=eq.${p.shop_id}&limit=1`))[0] : null;
  const cat = cats.find((c) => c.id === p.category_id), parent = cat?.parent_id ? cats.find((c) => c.id === cat.parent_id) : null;
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ...(parent ? [[parent.name, `/shop/category/${parent.slug}`]] : []), ...(cat ? [[cat.name, `/shop/category/${cat.slug}`]] : []), [p.name, `/shop/${p.slug}`]];
  const [more, related] = await Promise.all([
    p.shop_id ? q(`products?select=${P}&shop_id=eq.${p.shop_id}&id=neq.${p.id}&order=featured.desc,sort&limit=4`) : q(`products?select=${P}&shop_id=is.null&id=neq.${p.id}&limit=4`),
    cat ? q(`products?select=${P}&category_id=in.(${family(cats, parent ? parent.id : cat.id).join(",")})&id=neq.${p.id}&order=featured.desc&limit=8`) : Promise.resolve([])]);
  const rel = related.filter((r) => !more.some((m) => m.id === r.id)).slice(0, 4);
  const pics = [...(p.image_path ? [{ src: img(p.image_path), alt: p.image_alt || p.name }] : []), ...galleryOf(p.gallery)];
  const buy = link(p.buy_url);
  const seller = shop ? shop.name : "Cars and Coffee UK";
  const ask = `/contact?topic=shop&about=${encodeURIComponent(p.name + (shop ? ` (${shop.name})` : ""))}`;
  const opts = (Array.isArray(p.options) ? p.options : []).filter((o) => o && o.name && Array.isArray(o.values) && o.values.length);
  const facts = [p.brand && ["Brand", p.brand], ["Condition", COND[p.condition]], ["Availability", STOCK[p.stock_status]], p.sku && ["Part number", p.sku], cat && ["Category", cat.name]].filter(Boolean);
  const avail = { in_stock: "InStock", low: "LimitedAvailability", out: "OutOfStock", preorder: "PreOrder" }[p.stock_status];
  const prodLd = { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.summary || undefined, sku: p.sku || undefined, image: pics.map((x) => x.src.startsWith("http") ? x.src : SITE + x.src),
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined, category: cat?.name,
    offers: { "@type": "Offer", url: `${SITE}/shop/${p.slug}`, priceCurrency: "GBP", price: ((p.price_pence || 0) / 100).toFixed(2), availability: `https://schema.org/${avail}`, itemCondition: `https://schema.org/${{ new: "NewCondition", used: "UsedCondition", refurbished: "RefurbishedCondition" }[p.condition]}`, seller: { "@type": "Organization", name: seller } } };
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:20px"><div class="wrap shp-prod">
    <div class="shp-pics">${pics.length ? `<img class="shp-main" src="${E(pics[0].src)}" alt="${E(pics[0].alt)}" width="800" height="600">${pics.length > 1 ? `<div class="shp-thumbs">${pics.map((x, i) => `<button type="button" data-src="${E(x.src)}" data-alt="${E(x.alt)}" aria-label="Show photo ${i + 1}"${i ? "" : ' aria-current="true"'}><img src="${E(x.src)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}` : `<div class="shp-main shp-noimg big">${BAG}</div>`}</div>
    <div class="shp-info">
      ${shop ? `<a class="shp-seller" href="/shops/${E(shop.slug)}">${logoHTML(shop, "shp-logo sm")}<span>Sold by <strong>${E(shop.name)}</strong></span></a>` : `<p class="shp-seller"><span>Official <strong>Cars and Coffee UK</strong> merch</span></p>`}
      <h1>${E(p.name)}</h1>
      <p class="shp-price"><b>${money(p.price_pence)}</b>${p.compare_at_pence > p.price_pence ? ` <s>${money(p.compare_at_pence)}</s> <span class="shp-save">Save ${money(p.compare_at_pence - p.price_pence)}</span>` : ""}</p>
      ${p.member_price_pence ? `<p class="shp-member">Members pay <b>${money(p.member_price_pence)}</b>. <a href="https://club.carsandcoffee.uk/apply">Join the club</a></p>` : ""}
      <p class="shp-stock ${E(p.stock_status)}">${E(STOCK[p.stock_status])}${p.condition !== "new" ? ` · ${E(COND[p.condition])}` : ""}</p>
      ${p.summary ? `<p class="shp-sum">${E(p.summary)}</p>` : ""}
      ${opts.map((o) => `<label class="shp-opt">${E(o.name)}<select>${o.values.map((v) => `<option>${E(v)}</option>`).join("")}</select></label>`).join("")}
      <div class="shp-buy">${p.stock_status === "out" ? `<a class="btn ghost" href="${E(ask)}">Ask when it’s back ${ARROW}</a>` : buy ? `<a class="btn red" href="${E(buy)}" rel="noopener sponsored" target="_blank" data-track="buy">Buy from ${E(seller)} ${ARROW}</a>` : `<a class="btn red" href="${E(ask)}">Ask about this ${ARROW}</a>`}</div>
      <p class="small shp-note">${buy ? `You’ll finish your order on ${E(seller)}’s website.` : `Send us a message and ${shop ? `${E(shop.name)} will` : "we’ll"} get back to you with availability and delivery.`} Online checkout is coming soon.</p>
      ${facts.length ? `<dl class="shp-facts">${facts.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join("")}</dl>` : ""}
      ${shareBar(`${SITE}/shop/${p.slug}`, p.name)}
    </div></div></section>`,
    p.body_html ? `<section class="lp-sec"><div class="wrap"><div class="art-body shp-body"><h2>Details</h2>${sanitize(p.body_html)}</div></div></section>` : "",
    pics.length > 2 ? `<section class="lp-sec"><div class="wrap">${galleryHTML(pics.map((x) => ({ src: x.src, alt: x.alt, caption: "" })), p.name)}</div></section>` : "",
    more.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>More from ${E(seller)}</h2>${shop ? `<a class="more" href="/shops/${E(shop.slug)}">Visit the shop ${ARROW}</a>` : ""}</div>${grid(more, byId)}</div></section>` : "",
    rel.length ? `<section class="lp-sec"><div class="wrap"><h2>You might also like</h2>${grid(rel, byId)}</div></section>` : "",
    `<script>(function(){var m=document.querySelector('.shp-main');document.querySelectorAll('.shp-thumbs button').forEach(function(b){b.onclick=function(){m.src=b.dataset.src;m.alt=b.dataset.alt;document.querySelectorAll('.shp-thumbs button').forEach(function(x){x.removeAttribute('aria-current');});b.setAttribute('aria-current','true');};});})();</script>`].join("\n");
  return shell({ title: p.meta_title || `${p.name} | ${seller} | Cars and Coffee UK shop`, description: p.meta_description || p.summary || `${p.name} from ${seller}, ${money(p.price_pence)}.`, path: `/shop/${p.slug}`, image: pics[0]?.src, ld: [ld(crumbs), prodLd], partners, ogType: "product", main });
}

// ---------- /shops ----------
export async function shopsIndex() {
  const [shops, partners] = await Promise.all([shopsQ(), partnersQ()]);
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Partner shops", "/shops"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap"><h1 class="shp-h1">Partner shops</h1><p class="lp-lead">Specialists selling through Cars and Coffee UK. Every shop has its own page, and its products appear across the main shop too.</p>
    ${shops.length ? `<div class="shp-shops big">${shops.map(shopTile).join("")}</div>` : `<p class="lp-empty">Partner shops are coming soon.</p>`}</div></section>`, sellCta].join("\n");
  return shell({ title: "Partner shops | Cars and Coffee UK", description: "Car parts, detailing and specialist shops selling through Cars and Coffee UK.", path: "/shops", ld: ld(crumbs), partners, main });
}

// ---------- /shops/<shop>(/<category>) ----------
export async function storefront(slug, catSlug) {
  const [rows, cats, partners] = await Promise.all([q(`shops?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`), catsQ(), partnersQ()]);
  const s = rows[0];
  if (!s) return null;
  const all = sorter(await q(`products?select=${P}&shop_id=eq.${s.id}&limit=500`));
  const used = new Set(all.map((p) => p.category_id));
  const navCats = cats.filter((c) => used.has(c.id) || cats.some((k) => k.parent_id === c.id && used.has(k.id)));
  const cur = catSlug ? navCats.find((c) => c.slug === catSlug) : null;
  if (catSlug && !cur) return null;
  const list = cur ? all.filter((p) => family(cats, cur.id).includes(p.category_id)) : all;
  const byId = { [s.id]: s };
  const base = `/shops/${s.slug}`;
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Partner shops", "/shops"], [s.name, base], ...(cur ? [[cur.name, `${base}/${cur.slug}`]] : [])];
  const socials = Object.entries(s.socials || {}).map(([k, v]) => [k, link(v)]).filter(([, v]) => v);
  const web = link(s.website);
  const tops = navCats.filter((c) => !c.parent_id || !navCats.some((x) => x.id === c.parent_id));
  const nav = `<nav class="shp-nav" aria-label="${E(s.name)} categories"><div class="wrap"><a href="${E(base)}"${cur ? "" : ' aria-current="page"'}>All products</a>${tops.map((c) => `<a href="${E(base)}/${E(c.slug)}"${cur?.id === c.id ? ' aria-current="page"' : ""}>${E(c.name)}</a>${navCats.filter((k) => k.parent_id === c.id).map((k) => `<a class="sub" href="${E(base)}/${E(k.slug)}"${cur?.id === k.id ? ' aria-current="page"' : ""}>${E(k.name)}</a>`).join("")}`).join("")}</div></nav>`;
  const feat = !cur ? all.filter((p) => p.featured).slice(0, 4) : [];
  const main = [crumbsHTML(crumbs),
    `<section class="shp-front"${s.banner_path ? ` style="background-image:linear-gradient(90deg,rgba(18,10,7,.92),rgba(18,10,7,.6)),url('${E(img(s.banner_path))}')"` : ""}><div class="wrap shp-front-in">${logoHTML(s, "shp-logo lg")}<div><span class="eyebrow">Partner shop</span><h1>${E(s.name)}${cur ? `: ${E(cur.name)}` : ""}</h1>${s.tagline ? `<p>${E(s.tagline)}</p>` : ""}
      <p class="shp-meta">${s.town ? `<span>📍 ${E([s.town, s.county].filter(Boolean).join(", "))}</span>` : ""}${web ? `<a href="${E(web)}" rel="noopener" target="_blank">Website ↗</a>` : ""}${socials.map(([k, v]) => `<a href="${E(v)}" rel="noopener" target="_blank">${E(k[0].toUpperCase() + k.slice(1))} ↗</a>`).join("")}${s.directory_listing_id ? `<a href="/directory?q=${encodeURIComponent(s.name)}">In our directory</a>` : ""}</p></div></div></section>`,
    nav,
    feat.length && all.length > 4 ? `<section class="lp-sec" style="border:0"><div class="wrap"><h2>Featured</h2>${grid(feat, byId)}</div></section>` : "",
    `<section class="lp-sec"${feat.length && all.length > 4 ? "" : ' style="border:0"'}><div class="wrap"><h2>${cur ? E(cur.name) : "All products"}</h2>${list.length ? tools(list, byId, { showShop: false }) : ""}${grid(list, byId, "pgrid")}</div></section>${toolsJS}`,
    !cur && s.about_html ? `<section class="lp-sec"><div class="wrap shp-about"><h2>About ${E(s.name)}</h2><div class="art-body">${sanitize(s.about_html)}</div><p><a class="btn ghost" href="/contact?topic=shop&about=${encodeURIComponent(s.name)}">Contact the shop ${ARROW}</a></p></div></section>` : ""].join("\n");
  const storeLd = { "@context": "https://schema.org", "@type": "Store", name: s.name, url: SITE + base, description: s.tagline || undefined, logo: s.logo_path ? SITE + img(s.logo_path) : undefined, address: s.town ? { "@type": "PostalAddress", addressLocality: s.town, addressRegion: s.county || undefined, addressCountry: "GB" } : undefined, sameAs: [web, ...socials.map(([, v]) => v)].filter(Boolean) };
  return shell({ title: s.meta_title && !cur ? s.meta_title : `${cur ? `${cur.name} from ` : ""}${s.name} | Cars and Coffee UK shop`, description: s.meta_description || s.tagline || `Shop ${s.name} on Cars and Coffee UK.`, path: cur ? `${base}/${cur.slug}` : base, image: s.banner_path || s.logo_path, ld: [ld(crumbs), storeLd], partners, main });
}

// ---------- /shop/sell ----------
export async function sellPage() {
  const partners = await partnersQ();
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Sell with us", "/shop/sell"]];
  const main = [crumbsHTML(crumbs), `<section class="dir-hero shp-hero"><div class="wrap"><span class="eyebrow">For businesses</span><h1>Sell to UK car and motorsport fans</h1><p>Open your own shop on Cars and Coffee UK: your logo, your products, your own shop page, and every product listed in our main shop too.</p><a class="btn red" href="/contact?topic=shop&about=Opening%20a%20shop">Talk to us about a shop ${ARROW}</a></div></section>`,
    `<section class="lp-sec"><div class="wrap"><h2>What you get</h2><div class="ab-cards">${[["Your own shop page", "A storefront with your logo, banner, about section, links and your own product navigation."], ["Listed across the shop", "Your products appear in the main shop, in categories, in search and on related products."], ["You stay in control", "Log in to add products, prices, photos and stock whenever you like."], ["Simple pricing", "A monthly plan plus a small commission on sales made through the site. No set-up fee."]].map(([h, t]) => `<div class="lp-card"><div class="pad"><h3>${E(h)}</h3><p>${E(t)}</p></div></div>`).join("")}</div></div></section>`,
    `<section class="lp-sec"><div class="wrap"><h2>Good fits</h2><p>Parts suppliers, detailing brands, garages selling servicing kits, wrap and graphics studios, clothing and gift makers, model and print sellers. If car people would buy it, talk to us.</p><p><a class="btn red" href="/contact?topic=shop&about=Opening%20a%20shop">Get in touch ${ARROW}</a></p></div></section>`].join("\n");
  return shell({ title: "Sell on Cars and Coffee UK | Open a partner shop", description: "Open a partner shop on Cars and Coffee UK. Your own shop page, products listed across the shop, simple monthly plan plus commission.", path: "/shop/sell", ld: ld(crumbs), partners, main });
}

export async function shopSitemap() {
  const [prods, cats, shops] = await Promise.all([q("products?select=slug,updated_at").catch(() => []), q("product_categories?select=slug").catch(() => []), q("shops?select=slug,updated_at").catch(() => [])]);
  const now = new Date().toISOString();
  return [["/shop", now, "daily", "0.8"], ["/shops", now, "weekly", "0.6"], ["/shop/sell", now, "monthly", "0.4"], ...cats.map((c) => [`/shop/category/${c.slug}`, now, "weekly", "0.6"]),
    ...shops.map((s) => [`/shops/${s.slug}`, s.updated_at, "weekly", "0.6"]), ...prods.map((p) => [`/shop/${p.slug}`, p.updated_at, "weekly", "0.6"])];
}
