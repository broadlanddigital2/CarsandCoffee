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

// family of a category: itself plus every sub-category below it, at any depth
const family = (cats, id, seen = new Set()) => { if (seen.has(id)) return []; seen.add(id); return [id, ...cats.filter((c) => c.parent_id === id).flatMap((c) => family(cats, c.id, seen))]; };
// the chain from the top-level category down to this one
const ancestors = (cats, c) => { const out = []; const seen = new Set(); let x = c; while (x && !seen.has(x.id)) { seen.add(x.id); out.unshift(x); x = x.parent_id ? cats.find((k) => k.id === x.parent_id) : null; } return out; };
const catCrumbs = (cats, c) => ancestors(cats, c).map((x) => [x.name, `/shop/category/${x.slug}`]);
// Left-hand category tree. Branches on the way to the current category start open; others can be opened.
// counts: { categoryId: number of products in it and below }. Categories with nothing in them are left out when hideEmpty is set.
function catTree(cats, { counts = {}, current = null, href = (c) => `/shop/category/${c.slug}`, allHref = "/shop", allLabel = "All products", hideEmpty = false, title = "Categories", back = null } = {}) {
  const onPath = new Set(current ? ancestors(cats, current).map((x) => x.id) : []);
  const show = (c) => !hideEmpty || (counts[c.id] || 0) > 0;
  const branch = (parentId, depth) => {
    const kids = cats.filter((c) => (c.parent_id || null) === parentId && show(c));
    if (!kids.length) return "";
    return `<ul class="ct-l${depth}">${kids.map((c) => { const sub = depth < 8 ? branch(c.id, depth + 1) : ""; const here = current && c.id === current.id; const n = counts[c.id];
      const a = `<a href="${E(href(c))}"${here ? ' aria-current="page"' : ""}><span>${E(c.name)}</span>${n ? `<small>${n}</small>` : ""}</a>`;
      return `<li${onPath.has(c.id) ? ' class="on"' : ""}>${sub ? `<details${onPath.has(c.id) ? " open" : ""}><summary>${a}</summary>${sub}</details>` : a}</li>`; }).join("")}</ul>`;
  };
  const body = `${back ? `<a class="ct-back" href="${E(back[1])}">‹ ${E(back[0])}</a>` : ""}<a class="ct-all" href="${E(allHref)}"${current ? "" : ' aria-current="page"'}>${E(allLabel)}</a>${branch(null, 0)}`;
  return `<aside class="ct-side"><details class="ct-mob"><summary>${E(title)}${current ? `: ${E(current.name)}` : ""}</summary><nav class="ct-tree" aria-label="${E(title)}">${body}</nav></details><nav class="ct-tree ct-desk" aria-label="${E(title)}"><h2>${E(title)}</h2>${body}</nav></aside>`;
}
const countsOf = (cats, products) => { const out = {}; for (const p of products) { const c = cats.find((x) => x.id === p.category_id); for (const a of c ? ancestors(cats, c) : []) out[a.id] = (out[a.id] || 0) + 1; } return out; };

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
    fs ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Featured shop</h2><a class="more" href="/shops">All partner shops ${ARROW}</a></div><div class="shp-feat">
      <a class="shp-feat-card" href="/shops/${E(fs.slug)}"${fs.banner_path ? ` style="background-image:linear-gradient(90deg,rgba(18,10,7,.9),rgba(18,10,7,.55)),url('${E(img(fs.banner_path))}')"` : ""}>${logoHTML(fs)}<h2>${E(fs.name)}</h2>${fs.tagline ? `<p>${E(fs.tagline)}</p>` : ""}${fs.town ? `<p class="small">${E([fs.town, fs.county].filter(Boolean).join(", "))}</p>` : ""}<span class="btn red">Visit the shop ${ARROW}</span></a>
      <div class="prods shp-grid shp-two">${fsProducts.map((p) => productCard(p, byId)).join("")}</div></div></div></section>` : "",
    featured.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Featured products</h2></div>${grid(featured, byId)}</div></section>` : "",
    shops.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Partner shops</h2><a class="more" href="/shops">All shops ${ARROW}</a></div><div class="shp-shops">${shops.slice(0, 8).map(shopTile).join("")}</div></div></section>` : "",
    club.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>Club merch</h2><a class="more" href="/shop/category/clothing">See all ${ARROW}</a></div>${grid(club, byId)}</div></section>` : "",
    `<section class="lp-sec"><div class="wrap"><h2>New in</h2>${grid(latest, byId)}</div></section>`,
    sellCta, newsletterHTML()].join("\n");
  return shell({ title: "Shop: car parts, car care and clothing | Cars and Coffee UK", description: "Shop car parts, detailing products, tools, clothing and gifts from Cars and Coffee UK and trusted UK specialists.", path: "/shop", ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: [...featured, ...latest].filter((x, i, a) => a.findIndex((y) => y.slug === x.slug) === i).slice(0, 20).map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/shop/" + x.slug })) }], partners, main });
}
const shopTile = (s) => `<a class="shp-tile" href="/shops/${E(s.slug)}">${logoHTML(s)}<span><strong>${E(s.name)}</strong>${s.tagline ? `<small>${E(s.tagline)}</small>` : ""}</span></a>`;

// ---------- /shop/category/<slug> ----------
export async function categoryPage(slug) {
  const [cats, shops, partners] = await Promise.all([catsQ(), shopsQ(), partnersQ()]);
  const c = cats.find((x) => x.slug === slug);
  if (!c) return null;
  const kids = cats.filter((x) => x.parent_id === c.id);
  const ids = family(cats, c.id);
  const [products, allCats] = await Promise.all([q(`products?select=${P}&category_id=in.(${ids.join(",")})&limit=500`).then(sorter), q("products?select=category_id&limit=5000")]);
  const counts = countsOf(cats, allCats);
  const byId = byIdOf(shops);
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ...catCrumbs(cats, c)];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap shp-layout">${catTree(cats, { counts, current: c })}
    <div class="shp-col"><h1 class="shp-h1">${E(c.name)}</h1>${c.description ? `<p class="lp-lead">${E(c.description)}</p>` : ""}
    ${kids.length ? `<div class="lp-chips">${kids.map((k) => `<a class="lp-chip" href="/shop/category/${E(k.slug)}">${E(k.name)}${counts[k.id] ? ` <small>(${counts[k.id]})</small>` : ""}</a>`).join("")}</div>` : ""}
    ${products.length ? tools(products, byId) : ""}${grid(products, byId, "pgrid")}</div></div></section>${toolsJS}`, sellCta].join("\n");
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
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ...(cat ? catCrumbs(cats, cat) : []), [p.name, `/shop/${p.slug}`]];
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
    <div class="shp-pics">${pics.length ? `<div class="shp-mainwrap"><img class="shp-main" src="${E(pics[0].src)}" alt="${E(pics[0].alt)}" width="800" height="600">${pics.length > 1 ? `<button type="button" class="shp-nx prev" aria-label="Previous photo">‹</button><button type="button" class="shp-nx next" aria-label="Next photo">›</button><span class="shp-pc">1 / ${pics.length}</span>` : ""}</div>${pics.length > 1 ? `<div class="shp-thumbs">${pics.map((x, i) => `<button type="button" data-src="${E(x.src)}" data-alt="${E(x.alt)}" aria-label="Show photo ${i + 1}"${i ? "" : ' aria-current="true"'}><img src="${E(x.src)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}` : `<div class="shp-main shp-noimg big">${BAG}</div>`}</div>
    <div class="shp-info">
      ${shop ? `<a class="shp-seller" href="/shops/${E(shop.slug)}">${logoHTML(shop, "shp-logo sm")}<span>Sold by <strong>${E(shop.name)}</strong></span></a>` : `<p class="shp-seller"><span>Official <strong>Cars and Coffee UK</strong> merch</span></p>`}
      <h1>${E(p.name)}</h1>
      <p class="shp-price"><b>${money(p.price_pence)}</b>${p.compare_at_pence > p.price_pence ? ` <s>${money(p.compare_at_pence)}</s> <span class="shp-save">Save ${money(p.compare_at_pence - p.price_pence)}</span>` : ""}</p>
      ${p.member_price_pence ? `<p class="shp-member">Members pay <b>${money(p.member_price_pence)}</b>. <a href="https://club.carsandcoffee.uk/apply">Join the club</a></p>` : ""}
      <p class="shp-stock ${E(p.stock_status)}">${E(STOCK[p.stock_status])}${p.condition !== "new" ? ` · ${E(COND[p.condition])}` : ""}</p>
      ${p.summary ? `<p class="shp-sum">${E(p.summary)}</p>` : ""}
      <form class="shp-cart" data-basket-form novalidate>
      ${opts.map((o) => `<label class="shp-opt">${E(o.name)}<select data-opt="${E(o.name)}">${o.values.map((v) => `<option>${E(v)}</option>`).join("")}</select></label>`).join("")}
      ${p.stock_status === "out" ? `<div class="shp-buy"><a class="btn red" href="${E(ask)}">Ask when it’s back ${ARROW}</a></div>` : `<div class="shp-buy">
        <div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">−</button><input type="number" name="qty" data-qty value="1" min="1" max="${p.stock_qty && p.stock_qty > 0 ? Math.min(99, p.stock_qty) : 99}" inputmode="numeric" aria-label="Quantity"><button type="button" data-q="1" aria-label="One more">+</button></div>
        <button class="btn red" type="submit" data-item="${E(JSON.stringify({ slug: p.slug, name: p.name, price: p.price_pence || 0, member: p.member_price_pence || null, img: pics[0]?.src || "", seller, shop: shop ? shop.slug : "" }))}">Add to basket ${BAG}</button></div>`}
      </form>
      ${p.stock_status !== "out" ? `<p class="shp-alt">${buy ? `<a href="${E(buy)}" rel="noopener sponsored" target="_blank" data-track="buy">Or buy direct from ${E(seller)} ↗</a> · ` : ""}<a href="${E(ask)}">Ask a question</a></p>` : ""}
      <p class="small shp-note">Add to your basket and check out. ${shop ? E(shop.name) : "We"} confirm${shop ? "s" : ""} stock and delivery, then you get a secure link to pay.</p>
      ${facts.length ? `<dl class="shp-facts">${facts.map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join("")}</dl>` : ""}
      ${shareBar(`${SITE}/shop/${p.slug}`, p.name)}
    </div></div></section>`,
    p.body_html ? `<section class="lp-sec"><div class="wrap"><div class="art-body shp-body"><h2>Details</h2>${sanitize(p.body_html)}</div></div></section>` : "",
    pics.length > 2 ? `<section class="lp-sec"><div class="wrap">${galleryHTML(pics.map((x) => ({ src: x.src, alt: x.alt, caption: "" })), p.name)}</div></section>` : "",
    more.length ? `<section class="lp-sec"><div class="wrap"><div class="head"><h2>More from ${E(seller)}</h2>${shop ? `<a class="more" href="/shops/${E(shop.slug)}">Visit the shop ${ARROW}</a>` : ""}</div>${grid(more, byId)}</div></section>` : "",
    rel.length ? `<section class="lp-sec"><div class="wrap"><h2>You might also like</h2>${grid(rel, byId)}</div></section>` : "",
    `<script>(function(){var m=document.querySelector('.shp-main'),tb=[].slice.call(document.querySelectorAll('.shp-thumbs button')),pc=document.querySelector('.shp-pc'),i=0;if(!m||!tb.length)return;
  function show(n){i=(n+tb.length)%tb.length;var b=tb[i];m.src=b.dataset.src;m.alt=b.dataset.alt;tb.forEach(function(x){x.removeAttribute('aria-current');});b.setAttribute('aria-current','true');if(pc)pc.textContent=(i+1)+' / '+tb.length;}
  tb.forEach(function(b,n){b.onclick=function(){show(n);};});var p=document.querySelector('.shp-nx.prev'),nx=document.querySelector('.shp-nx.next');if(p)p.onclick=function(){show(i-1);};if(nx)nx.onclick=function(){show(i+1);};
  var x0=null;m.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});m.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)show(i+(dx<0?1:-1));x0=null;});})();</script>`].join("\n");
  return shell({ title: p.meta_title || (shop ? `${p.name} | ${shop.name} | Cars and Coffee UK shop` : `${p.name} | Cars and Coffee UK shop`), description: p.meta_description || p.summary || `${p.name} from ${seller}, ${money(p.price_pence)}.`, path: `/shop/${p.slug}`, image: pics[0]?.src, ld: [ld(crumbs), prodLd], partners, ogType: "product", main });
}

// ---------- /shops ----------
export async function shopsIndex() {
  const [shops, partners] = await Promise.all([shopsQ(), partnersQ()]);
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Partner shops", "/shops"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap"><h1 class="shp-h1">Partner shops</h1><p class="lp-lead">Specialists selling through Cars and Coffee UK. Every shop has its own page, and its products appear across the main shop too.</p>
    ${shops.length ? `<div class="shp-shops big">${shops.map(shopTile).join("")}</div>` : `<p class="lp-empty">Partner shops are coming soon.</p>`}</div></section>`, sellCta].join("\n");
  return shell({ title: "Partner shops | Cars and Coffee UK", description: "Car parts, detailing and specialist shops selling through Cars and Coffee UK.", path: "/shops", ld: [ld(crumbs), { "@context": "https://schema.org", "@type": "ItemList", itemListElement: shops.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/shops/" + x.slug })) }], partners, main });
}

// ---------- /shops/<shop>(/<category>) ----------
export async function storefront(slug, catSlug) {
  const [rows, cats, partners] = await Promise.all([q(`shops?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`), catsQ(), partnersQ()]);
  const s = rows[0];
  if (!s) return null;
  const all = sorter(await q(`products?select=${P}&shop_id=eq.${s.id}&limit=500`));
  const used = new Set(all.map((p) => p.category_id));
  const counts = countsOf(cats, all);
  const cur = catSlug ? cats.find((c) => c.slug === catSlug && counts[c.id]) : null;
  if (catSlug && !cur) return null;
  const list = cur ? all.filter((p) => family(cats, cur.id).includes(p.category_id)) : all;
  const byId = { [s.id]: s };
  const base = `/shops/${s.slug}`;
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Partner shops", "/shops"], [s.name, base], ...(cur ? ancestors(cats, cur).map((x) => [x.name, `${base}/${x.slug}`]) : [])];
  const socials = Object.entries(s.socials || {}).map(([k, v]) => [k, link(v)]).filter(([, v]) => v);
  const web = link(s.website);
  const nav = catTree(cats, { counts, current: cur, href: (c) => `${base}/${c.slug}`, allHref: base, allLabel: `All ${s.name} products`, hideEmpty: true, title: `${s.name} categories`, back: ["Back to the main shop", "/shop"] });
  const feat = !cur ? all.filter((p) => p.featured).slice(0, 4) : [];
  const main = [crumbsHTML(crumbs),
    `<section class="shp-front"${s.banner_path ? ` style="background-image:linear-gradient(90deg,rgba(18,10,7,.92),rgba(18,10,7,.6)),url('${E(img(s.banner_path))}')"` : ""}><div class="wrap shp-front-in">${logoHTML(s, "shp-logo lg")}<div><a class="shp-backlink" href="/shop">‹ Cars and Coffee shop</a><span class="eyebrow">Partner shop</span><h1>${E(s.name)}${cur ? `: ${E(cur.name)}` : ""}</h1>${s.tagline ? `<p>${E(s.tagline)}</p>` : ""}
      <p class="shp-meta">${s.town ? `<span>📍 ${E([s.town, s.county].filter(Boolean).join(", "))}</span>` : ""}${web ? `<a href="${E(web)}" rel="noopener" target="_blank">Website ↗</a>` : ""}${socials.map(([k, v]) => `<a href="${E(v)}" rel="noopener" target="_blank">${E(k[0].toUpperCase() + k.slice(1))} ↗</a>`).join("")}${s.directory_listing_id ? `<a href="/directory?q=${encodeURIComponent(s.name)}">In our directory</a>` : ""}</p></div></div></section>`,
    `<section class="lp-sec" style="border:0"><div class="wrap shp-layout">${nav}<div class="shp-col">
      ${feat.length && all.length > 4 ? `<h2>Featured</h2>${grid(feat, byId)}<div style="height:36px"></div>` : ""}
      <h2>${cur ? E(cur.name) : "All products"}</h2>${list.length ? tools(list, byId, { showShop: false }) : ""}${grid(list, byId, "pgrid")}</div></div></section>${toolsJS}`,
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

// ---------- /basket and /checkout ----------
// The basket lives in the visitor's browser. Checkout sends slugs, quantities and options; the database prices the order.
const steps = (n) => `<ol class="co-steps">${["Basket", "Your details", "Payment", "Done"].map((t, i) => `<li class="${i + 1 < n ? "done" : i + 1 === n ? "on" : ""}"><span>${i + 1}</span>${t}</li>`).join("")}</ol>`;
const basketJS = String.raw`var gbp=function(p){return '£'+(p/100).toFixed(2);},esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var optTxt=function(o){return Object.keys(o||{}).map(function(k){return esc(k)+': '+esc(o[k]);}).join(' · ');};
  function groupBy(items){var g={};items.forEach(function(it){(g[it.seller]=g[it.seller]||[]).push(it);});return g;}`;

export async function basketPage() {
  const partners = await partnersQ();
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Basket", "/basket"]];
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap">${steps(1)}<h1 class="shp-h1">Your basket</h1>
    <div id="bsk"><p class="lp-empty">Loading your basket…</p></div>
    <template id="bsk-empty"><div class="lp-empty"><p>Your basket is empty.</p><p><a class="btn red" href="/shop">Browse the shop ${ARROW}</a></p></div></template>
    <div class="bsk-grid" id="bsk-full" hidden><div><div id="bsk-items"></div><p><a class="more" href="/shop">‹ Continue shopping</a></p></div>
      <aside class="bsk-sum"><h2>Order summary</h2><div id="bsk-totals"></div><a class="btn red co-go" href="/checkout">Checkout ${ARROW}</a>
        <p class="ct-small">Secure checkout. You’ll add your delivery details on the next step.</p></aside></div></div></section>
  <script>document.addEventListener('DOMContentLoaded',function(){var B=window.CCB;if(!B)return;${basketJS}
    function draw(){var items=B.get(),box=document.getElementById('bsk'),full=document.getElementById('bsk-full');
      if(!items.length){box.innerHTML=document.getElementById('bsk-empty').innerHTML;box.hidden=false;full.hidden=true;return;}
      box.hidden=true;full.hidden=false;var g=groupBy(items),total=0;
      document.getElementById('bsk-items').innerHTML=Object.keys(g).map(function(sel){var sub=0;var rows=g[sel].map(function(it){var line=it.price*it.qty;sub+=line;var o=optTxt(it.opts);
        return '<div class="bsk-row" data-k="'+esc(it.k)+'"><a class="bsk-img" href="/shop/'+esc(it.slug)+'">'+(it.img?'<img src="'+esc(it.img)+'" alt="">':'<span></span>')+'</a><div class="bsk-info"><a href="/shop/'+esc(it.slug)+'"><strong>'+esc(it.name)+'</strong></a>'+(o?'<small>'+o+'</small>':'')+'<small>'+gbp(it.price)+' each</small></div>'+
          '<div class="qty sm" role="group" aria-label="Quantity"><button type="button" data-d="-1" aria-label="One fewer">−</button><input type="number" min="1" max="99" value="'+it.qty+'" data-set aria-label="Quantity"><button type="button" data-d="1" aria-label="One more">+</button></div><b class="bsk-line">'+gbp(line)+'</b><button type="button" class="bsk-rm" data-rm aria-label="Remove '+esc(it.name)+'">Remove</button></div>';}).join('');total+=sub;
        return '<div class="bsk-seller"><h2>Sold by '+esc(sel)+'</h2>'+rows+'<p class="bsk-sub">Subtotal <b>'+gbp(sub)+'</b></p></div>';}).join('');
      var n=items.reduce(function(a,b){return a+b.qty;},0);
      document.getElementById('bsk-totals').innerHTML='<dl class="co-tot"><div><dt>Items ('+n+')</dt><dd>'+gbp(total)+'</dd></div><div><dt>Delivery</dt><dd>Confirmed by the seller</dd></div><div class="grand"><dt>Total</dt><dd>'+gbp(total)+'</dd></div></dl>'+(Object.keys(g).length>1?'<p class="ct-small">Your basket has items from '+Object.keys(g).length+' sellers.</p>':'');}
    var wrap=document.getElementById('bsk-items');
    wrap.addEventListener('click',function(e){var r=e.target.closest('.bsk-row');if(!r)return;var k=r.dataset.k;if(e.target.closest('[data-rm]')){B.remove(k);draw();return;}var d=e.target.closest('[data-d]');if(d){var it=B.get().find(function(x){return x.k===k;});if(it){B.setQty(k,it.qty+Number(d.dataset.d));draw();}}});
    wrap.addEventListener('change',function(e){var r=e.target.closest('.bsk-row');if(r&&e.target.matches('[data-set]')){B.setQty(r.dataset.k,parseInt(e.target.value,10)||1);draw();}});
    draw();});</script>`].join("\n");
  return shell({ title: "Your basket | Cars and Coffee UK shop", description: "Your Cars and Coffee UK shop basket.", path: "/basket", noindex: true, ld: ld(crumbs), partners, main });
}

export async function checkoutPage() {
  const partners = await partnersQ();
  const crumbs = [["Home", "/"], ["Shop", "/shop"], ["Basket", "/basket"], ["Checkout", "/checkout"]];
  const f = (label, name, attrs = "", wide = false) => `<label${wide ? ' class="wide"' : ""}>${label}<input name="${name}" ${attrs}></label>`;
  const main = [crumbsHTML(crumbs), `<section class="lp-sec" style="border:0;padding-top:24px"><div class="wrap" id="co">${steps(2)}<h1 class="shp-h1">Checkout</h1>
    <div id="co-empty" hidden class="lp-empty"><p>Your basket is empty.</p><p><a class="btn red" href="/shop">Browse the shop ${ARROW}</a></p></div>
    <form class="bsk-grid" id="co-f" data-captcha novalidate hidden><div class="co-main">
      <fieldset class="co-box"><legend>Contact</legend><div class="co-row">${f("Full name", "name", 'autocomplete="name" required maxlength="120"')}${f("Email", "email", 'type="email" autocomplete="email" required maxlength="200"')}</div>
        ${f("Phone (for delivery questions)", "phone", 'type="tel" autocomplete="tel" maxlength="40"')}<p class="ct-small">We’ll send your order confirmation to this email.</p></fieldset>
      <fieldset class="co-box"><legend>Delivery address</legend>${f("Address line 1", "address_line1", 'autocomplete="address-line1" required maxlength="200"', true)}${f("Address line 2 (optional)", "address_line2", 'autocomplete="address-line2" maxlength="200"', true)}
        <div class="co-row">${f("Town or city", "town", 'autocomplete="address-level2" required maxlength="80"')}${f("County (optional)", "county", 'autocomplete="address-level1" maxlength="80"')}</div>
        <div class="co-row">${f("Postcode", "postcode", 'autocomplete="postal-code" required maxlength="10" autocapitalize="characters"')}<label>Country<input value="United Kingdom" disabled></label></div></fieldset>
      <fieldset class="co-box"><legend>Anything else?</legend><label class="wide">Order notes (optional)<textarea name="notes" rows="3" maxlength="1000" placeholder="Fitment questions, delivery instructions…"></textarea></label></fieldset>
      <fieldset class="co-box"><legend>Payment</legend><div class="co-pay"><p><strong>Pay securely once your order is confirmed.</strong> Each seller checks stock and delivery first, then we email you a secure payment link. Nothing is charged today.</p></div></fieldset>
      <label class="hb-hp" aria-hidden="true">Leave this blank<input name="cc_hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other"></label>
    </div>
    <aside class="bsk-sum"><h2>Order summary</h2><div id="co-items"></div><div id="co-tot"></div>
      <label class="co-agree"><input type="checkbox" name="agree"><span>I agree to the <a href="/terms" target="_blank">terms</a> and <a href="/privacy" target="_blank">privacy policy</a>, and I’m happy for my details to be shared with the sellers in my order.</span></label>
      <button class="btn red co-go" type="submit">Place order ${ARROW}</button><p class="ct-msg" role="status"></p><p class="ct-small"><a href="/basket">‹ Back to basket</a></p></aside></form>
    <div id="co-done" hidden></div></div></section>
  <script>document.addEventListener('DOMContentLoaded',async function(){var B=window.CCB;if(!B)return;${basketJS}
    function G(f,n){var a=f.querySelectorAll('[name="'+n+'"]');for(var i=0;i<a.length;i++){var v=(a[i].value||'').trim();if(v)return v;}return '';}
    var form=document.getElementById('co-f'),items=B.get();if(!items.length){document.getElementById('co-empty').hidden=false;return;}form.hidden=false;
    var note='';try{var r=await fetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slugs:items.map(function(i){return i.slug;})})});var j=await r.json();var by={};(j.items||[]).forEach(function(x){by[x.slug]=x;});
      var changed=false,gone=[];items.forEach(function(it){var q=by[it.slug];if(!q||!q.available||q.stock_status==='out'){gone.push(it);return;}if(q.price_pence!==it.price){it.price=q.price_pence;changed=true;}it.name=q.name;it.seller=q.seller;});
      if(gone.length){gone.forEach(function(g){B.remove(g.k);});note+='<p class="co-warn">'+gone.map(function(g){return esc(g.name);}).join(', ')+(gone.length>1?' are':' is')+' no longer available and has been removed.</p>';}
      items=B.get().map(function(it){var q=by[it.slug];if(q){it.price=q.price_pence;it.name=q.name;it.seller=q.seller;}return it;});try{localStorage.setItem('cc_basket',JSON.stringify(items));}catch(e){}
      if(changed)note+='<p class="co-warn">Some prices have changed since you added them. The summary shows the current prices.</p>';}catch(e){}
    if(!items.length){form.hidden=true;document.getElementById('co-empty').hidden=false;return;}
    var total=0,g=groupBy(items);document.getElementById('co-items').innerHTML=note+Object.keys(g).map(function(sel){return '<div class="co-sel"><h3>'+esc(sel)+'</h3>'+g[sel].map(function(it){total+=it.price*it.qty;var o=optTxt(it.opts);return '<div class="co-it">'+(it.img?'<img src="'+esc(it.img)+'" alt="">':'<span class="co-ph"></span>')+'<span class="co-n">'+esc(it.name)+(o?'<small>'+o+'</small>':'')+'<small>Qty '+it.qty+'</small></span><b>'+gbp(it.price*it.qty)+'</b></div>';}).join('')+'</div>';}).join('');
    document.getElementById('co-tot').innerHTML='<dl class="co-tot"><div><dt>Items</dt><dd>'+gbp(total)+'</dd></div><div><dt>Delivery</dt><dd>Confirmed by the seller</dd></div><div class="grand"><dt>Total</dt><dd>'+gbp(total)+'</dd></div></dl>';
    form.addEventListener('submit',async function(e){e.preventDefault();var m=form.querySelector('.ct-msg'),b=form.querySelector('[type=submit]');
      var miss=!G(form,'name')?'Please add your name.':!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(G(form,'email'))?'Please check your email address.':!G(form,'address_line1')||!G(form,'town')||!G(form,'postcode')?'Please add your delivery address, town and postcode.':!form.agree.checked?'Please tick the box to agree to the terms.':'';
      if(miss){m.textContent=miss;m.className='ct-msg bad';return;}
      b.disabled=true;m.className='ct-msg';m.textContent='Placing your order…';
      var cust={};['name','email','phone','address_line1','address_line2','town','county','postcode','notes'].forEach(function(n){cust[n]=G(form,n);});
      try{var r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer:cust,items:B.get().map(function(i){return {slug:i.slug,qty:i.qty,opts:i.opts};}),cc_hp:G(form,'cc_hp')})});var j=await r.json().catch(function(){return{};});
        if(!r.ok)throw new Error(j.error||'Sorry, we couldn\\'t place your order. Please try again.');B.clear();
        document.querySelector('.co-steps').outerHTML=${JSON.stringify(steps(3))};form.hidden=true;var d=document.getElementById('co-done');d.hidden=false;
        d.innerHTML='<div class="co-done"><span class="co-tick">✓</span><h2>Thank you, your order '+esc(j.ref)+' is placed</h2><p>We’ve emailed a confirmation to <strong>'+esc(cust.email)+'</strong>. The seller'+(Object.keys(g).length>1?'s':'')+' will confirm stock and delivery, then we’ll send you a secure link to pay. Nothing has been charged yet.</p><p class="co-total">Order total: <b>'+gbp(j.total)+'</b></p><p><a class="btn red" href="/shop">Back to the shop</a></p></div>';window.scrollTo(0,0);}
      catch(err){m.textContent=err.message;m.className='ct-msg bad';b.disabled=false;}});});</script>`].join("\n");
  return shell({ title: "Checkout | Cars and Coffee UK shop", description: "Checkout.", path: "/checkout", noindex: true, ld: ld(crumbs), partners, main });
}

export async function shopSitemap() {
  const [prods, cats, shops] = await Promise.all([q("products?select=slug,updated_at").catch(() => []), q("product_categories?select=slug").catch(() => []), q("shops?select=slug,updated_at").catch(() => [])]);
  const now = new Date().toISOString();
  return [["/shop", now, "daily", "0.8"], ["/shops", now, "weekly", "0.6"], ["/shop/sell", now, "monthly", "0.4"], ...cats.map((c) => [`/shop/category/${c.slug}`, now, "weekly", "0.6"]),
    ...shops.map((s) => [`/shops/${s.slug}`, s.updated_at, "weekly", "0.6"]), ...prods.map((p) => [`/shop/${p.slug}`, p.updated_at, "weekly", "0.6"])];
}

// ---------- JSON for the header mega menu and the as-you-type shop search ----------
export async function shopApi(path, url) {
  const json = (o, maxAge = 300) => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${maxAge}` } });
  if (path === "/api/shop-menu") {
    const [cats, shops, counts] = await Promise.all([catsQ(), shopsQ(), q("products?select=category_id&limit=5000").catch(() => [])]);
    const n = countsOf(cats, counts);
    const kids = (id) => cats.filter((c) => c.parent_id === id);
    const fs = shops.find((s) => s.featured);
    return json({
      cats: cats.filter((c) => !c.parent_id).map((c) => ({ name: c.name, href: `/shop/category/${c.slug}`, n: n[c.id] || 0, kids: kids(c.id).slice(0, 7).map((k) => ({ name: k.name, href: `/shop/category/${k.slug}`, n: n[k.id] || 0 })), more: kids(c.id).length > 7 })),
      shops: shops.slice(0, 6).map((s) => ({ name: s.name, href: `/shops/${s.slug}` })),
      featured: fs ? { name: fs.name, tagline: fs.tagline || "", href: `/shops/${fs.slug}`, logo: fs.logo_path ? img(fs.logo_path) : "", initials: initials(fs.name) } : null,
    });
  }
  if (path === "/api/shop-search") {
    const term = String(url.searchParams.get("q") || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().slice(0, 60);
    if (term.length < 2) return json({ products: [], cats: [], shops: [] }, 60);
    const words = term.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
    const like = (w) => `*${encodeURIComponent(w)}*`;
    const filter = `and=(${words.map((w) => `or(name.ilike.${like(w)},summary.ilike.${like(w)},brand.ilike.${like(w)},sku.ilike.${like(w)})`).join(",")})`;
    const [prods, cats, shops] = await Promise.all([
      q(`products?select=slug,name,price_pence,compare_at_pence,image_path,shop_id,stock_status&${filter}&order=featured.desc,units_sold_30d.desc&limit=8`).catch(() => []),
      catsQ(), shopsQ()]);
    const byId = byIdOf(shops), has = (s) => words.every((w) => String(s || "").toLowerCase().includes(w));
    return json({
      products: prods.map((p) => ({ name: p.name, href: `/shop/${p.slug}`, price: money(p.price_pence), was: p.compare_at_pence > p.price_pence ? money(p.compare_at_pence) : "", img: p.image_path ? img(p.image_path) : "", seller: p.shop_id ? byId[p.shop_id]?.name || "" : "Cars and Coffee UK", out: p.stock_status === "out" })),
      cats: cats.filter((c) => has(c.name)).slice(0, 5).map((c) => ({ name: ancestors(cats, c).map((x) => x.name).join(" › "), href: `/shop/category/${c.slug}` })),
      shops: shops.filter((s) => has(s.name)).slice(0, 3).map((s) => ({ name: s.name, href: `/shops/${s.slug}` })),
    }, 60);
  }
  return null;
}
