import base64, json, datetime as dt, html, sys
sys.path.insert(0, '.')
from data import *

E = html.escape
MODE = sys.argv[1] if len(sys.argv) > 1 else "preview"   # preview = one self-contained file; prod = images as files
OUT = sys.argv[2] if len(sys.argv) > 2 else "index.html"
IMG = {}
def img(name):
    if MODE == "prod": return f"/homepage/{name}.webp"
    if name not in IMG:
        IMG[name] = "data:image/webp;base64," + base64.b64encode(open(f"../public/homepage/{name}.webp", "rb").read()).decode()
    return IMG[name]

def d(iso): return dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
def money(p): return "Free" if not p else f"£{p/100:.2f}".replace(".00", "")
def ukdate(x): return x.strftime("%a %-d %b %Y")
def hhmm(x): return x.strftime("%H:%M")

# sanity: weekday labels come from real dates
for e in EVENTS: d(e[3])

ARROW = '<svg class="ar" viewBox="0 0 20 12" aria-hidden="true"><path d="M0 6h17M12 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
def link(text, href, cls="more"): return f'<a class="{cls}" href="{href}">{text} {ARROW}</a>'
LOGO = open("logo.svg").read()

nxt = EVENTS[0]; nd = d(nxt[3]); ne = d(nxt[4])

def event_card(e):
    s, t, ty, st, en, venue, region, price, ts, im, alt = e
    a, b = d(st), d(en)
    when = ukdate(a) if a.date() == b.date() else f"{a.strftime('%-d %b')} – {ukdate(b)}"
    tcls = {"selling_fast": "hot", "sold_out": "out"}.get(ts, "")
    return f'''<article class="ev" data-type="{ty}"><a href="/events/{s}">
<div class="ph"><img src="{img(im)}" alt="{E(alt)}" width="600" height="250" loading="lazy"><span class="tag">{EVENT_TYPES[ty]}</span></div>
<div class="evb"><div class="date"><b>{a.strftime('%a')}</b><span>{a.strftime('%-d %b')}</span></div>
<div><h3>{E(t)}</h3><p class="meta">{E(venue)}</p><p class="meta">{when} · {hhmm(a)}–{hhmm(b)}</p>
<p class="price"><span>{money(price)}</span><span class="ts {tcls}">{TICKET[ts]}</span></p></div></div></a></article>'''

feat = ARTICLES[0]
def mini(a):
    s, t, c, ex, im, alt, m, f, p = a
    return f'''<li><a href="/news/{s}"><img src="{img(im)}" alt="{E(alt)}" width="120" height="76" loading="lazy">
<span><small>{c}</small><b>{E(t)}</b><em>{m} min read · <time datetime="{p}">{dt.date.fromisoformat(p).strftime('%-d %b')}</time></em></span></a></li>'''

def utm(u, medium, camp):
    return u if u.startswith('/') else f"{u}?utm_source=carsandcoffee&amp;utm_medium={medium}&amp;utm_campaign={camp}"

def partner_band(key, cls):
    f = next(x for x in PARTNER_FEATURES if x[1] == key)
    pslug, k, title, body, im, alt, c1, u1, c2, u2, cd, extra = f
    pn = next(p for p in PARTNERS if p[0] == pslug); pname = pn[1]
    count = ""
    if cd:
        lbl = "Challenge closes in" if key == "livery_of_week" else "Race night starts in"
        count = f'<div class="cd" data-to="{cd}" aria-label="{lbl}"><small>{lbl}</small><div><span><b data-u="d">–</b>days</span><span><b data-u="h">–</b>hrs</span><span><b data-u="m">–</b>mins</span></div></div>'
    ex = f'<p class="extra">{E(extra)}</p>' if extra else ""
    return f'''<section class="pband {cls}" id="{key.replace('_','-')}" aria-labelledby="{key}-h">
<img class="pbg" src="{img(im)}" alt="{E(alt)}" loading="lazy">
<div class="pin"><p class="plabel"><span class="badge">Partner</span><img class="plogo" src="/partners/{pn[5]}" alt="{E(pname)}" height="44"></p>
<h2 id="{key}-h">{E(title)}</h2><p>{E(body)}</p>{ex}
<div class="btns"><a class="btn red" href="{utm(u1, 'partner_block', pslug)}">{E(c1)} {ARROW}</a>
<a class="btn ghost" href="{utm(u2, 'partner_block', pslug)}">{E(c2)} {ARROW}</a></div></div>{count}</section>'''

events_html = "".join(event_card(e) for e in EVENTS)
news_html = f'''<article class="feat"><a href="/news/{feat[0]}"><div class="ph"><img src="{img(feat[4])}" alt="{E(feat[5])}" width="740" height="372" loading="lazy"><span class="tag">Feature</span></div>
<div><small>{feat[2]}</small><h3>{E(feat[1])}</h3><p>{E(feat[3])}</p><span class="more">Read the story {ARROW}</span></div></a></article>
<ul class="minis">{"".join(mini(a) for a in ARTICLES[1:])}</ul>'''
community_html = "".join(f'''<article class="post"><a href="/community/posts/{i}"><img src="{img(im)}" alt="{E(alt)}" width="580" height="366" loading="lazy">
<p class="who"><span class="av" aria-hidden="true">{h[1].upper()}</span>{E(h)} · {E(when)}</p><h3>{E(t)}</h3><p>{E(ex)}</p><span class="more">Read the post {ARROW}</span></a></article>'''
    for i, (h, t, ex, im, alt, when) in enumerate(COMMUNITY, 1))
shop_html = "".join(f'''<article class="prod"><div class="ph"><img src="{img(im)}" alt="{E(alt)}" width="436" height="254" loading="lazy">{f'<span class="tag">{b}</span>' if b else ''}</div>
<h3><a href="/shop/{s}">{E(n)}</a></h3><p class="price"><b>{money(p)}</b>{f' <span>Members {money(mp)}</span>' if mp else ''}</p>
<button class="add" type="button" data-name="{E(n)}">Add to basket</button></article>''' for s, n, p, mp, b, im, alt in PRODUCTS)
gallery_html = "".join(f'<a class="g g{i}" href="/galleries/{s}"><img src="{img(im)}" alt="{E(alt)}" loading="lazy"><span>{E(t)}</span></a>' for i, (s, t, im, alt) in enumerate(GALLERY))
slug = lambda x: x.lower().replace(" and ", "-").replace(" ", "-")
SVC_ICON = {
 "Restoration": '<path d="M14 6a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-2 2-2-1-1-2z"/>',
 "Servicing": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
 "Tuning": '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.5"/>',
 "Bodywork": '<path d="M3 15l2-5 4-2h6l4 4 2 1v2H3z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>',
 "Wraps and graphics": '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
 "Detailing": '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
 "Tyres": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
 "Storage": '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
}
dir_html = "".join(f'''<article class="biz"><a href="/directory/{s}"><div class="ph"><img src="{img(im)}" alt="{E(alt)}" width="600" height="300" loading="lazy"><span class="tag feat-tag">Featured</span></div>
<div class="bizb"><h3>{E(n)}</h3><p class="svc">{" · ".join(sv)}</p>
<p class="meta"><span class="loc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>{E(town)}</span>
<span class="ver"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>Checked by us</span></p>
<span class="more">View business {ARROW}</span></div></a></article>''' for s, n, sv, town, im, alt in DIRECTORY)
svc_tiles = "".join(f'<a class="svct" href="/directory/service/{slug(x)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">{SVC_ICON[x]}</svg><span>{x}</span></a>' for x in SERVICES)
svc_options = "".join(f'<option value="{slug(x)}">{x}</option>' for x in SERVICES)
regions = "".join(f'<a href="/directory/region/{slug(r)}">{r}</a>' for r in REGIONS)
faq_html = "".join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQS)
partners_strip = "".join(f'<a class="pl" href="{utm(u, "partner_strip", s)}" rel="noopener"><img src="/partners/{lg}" alt="{E(n)}" loading="lazy"><small>{E(t)}</small></a>' for s, n, t, u, lg, lgd in PARTNERS)
footer_partners = "".join(f'<a href="{utm(u, "footer", s)}" rel="noopener"><img src="/partners/{lgd}" alt="{E(n)}" loading="lazy"></a>' for s, n, t, u, lg, lgd in PARTNERS)
stats_html = "".join(f'<li><b>{n}</b>{l}</li>' for n, l in STATS)
chips = '<button type="button" class="chip on" data-f="all" aria-pressed="true">All events</button>' + "".join(
    f'<button type="button" class="chip" data-f="{k}" aria-pressed="false">{v}</button>' for k, v in {"meet":"Meets","race":"Race nights","tour":"Tours","garage":"Garage nights","watch":"Watch parties"}.items())
sp = SPONSORED

ld = [
    {"@context": "https://schema.org", "@type": "Organization", "name": "Cars and Coffee UK", "url": "https://www.carsandcoffee.uk/",
     "logo": "https://www.carsandcoffee.uk/logo.png"},
    {"@context": "https://schema.org", "@type": "WebSite", "name": "Cars and Coffee UK", "url": "https://www.carsandcoffee.uk/",
     "potentialAction": {"@type": "SearchAction", "target": "https://www.carsandcoffee.uk/search?q={q}", "query-input": "required name=q"}},
    {"@context": "https://schema.org", "@type": "ItemList", "name": "Upcoming events", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "item": {"@type": "Event", "name": e[1], "startDate": e[3], "endDate": e[4],
         "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode", "eventStatus": "https://schema.org/EventScheduled",
         "location": {"@type": "Place", "name": e[5], "address": {"@type": "PostalAddress", "addressRegion": e[6], "addressCountry": "GB"}},
         "offers": {"@type": "Offer", "price": f"{e[7]/100:.2f}", "priceCurrency": "GBP", "url": f"https://www.carsandcoffee.uk/events/{e[0]}"},
         "url": f"https://www.carsandcoffee.uk/events/{e[0]}"}} for i, e in enumerate(EVENTS)]},
    {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQS]},
]

page = open("template.html", encoding="utf-8").read()
for k, v in {
    "LOGO": LOGO, "HERO": img("hero"), "HERO_M": img("hero-m"), "ARROW": ARROW,
    "NEXT_TITLE": E(nxt[1]), "NEXT_SLUG": nxt[0], "NEXT_VENUE": E(nxt[5]), "NEXT_DATE": ukdate(nd),
    "NEXT_DOW": nd.strftime("%a"), "NEXT_DM": nd.strftime("%-d %b"), "NEXT_TIME": f"{hhmm(nd)}–{hhmm(ne)}", "NEXT_ISO": nxt[3],
    "BRANDLINE": img("brandline"), "EVENTS_LINK": link("View all events", "/events"), "CHIPS": chips, "EVENTS": events_html, "NEWS": news_html,
    "DREAM": partner_band("detail_of_month", "ao"), "COMMUNITY": community_html, "LIVERY": partner_band("livery_of_week", "rcg"),
    "SHOP": shop_html, "LEMANS": partner_band("race_night", "lmc"), "GALLERY": gallery_html, "DIRECTORY": dir_html,
    "REGIONS": regions, "SVC_TILES": svc_tiles, "SVC_OPTIONS": svc_options, "SP_ADV": E(sp[0]), "SP_TITLE": E(sp[1]), "SP_BODY": E(sp[2]), "SP_IMG": img(sp[3]),
    "SP_ALT": E(sp[4]), "SP_CTA": E(sp[5]), "SP_URL": sp[6], "WHY": img("whyjoin"), "STATS": stats_html,
    "PARTNERS": partners_strip, "FOOTER_PARTNERS": footer_partners, "FAQ": faq_html, "LD": json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"),
}.items():
    page = page.replace("{{" + k + "}}", v)
page = page.replace("{{SB}}", json.dumps({"url": "https://dipjypzrfigkzuarlsov.supabase.co", "key": "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF"}) if MODE == "prod" else "null")
if MODE == "prod":
    import re
    page = re.sub(r"/\*PREVIEW\*/.*?/\*END\*/\n", "", page, flags=re.S)
    page = page.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="preload" as="image" href="/homepage/hero.webp" media="(min-width:601px)"><link rel="preload" as="image" href="/homepage/hero-m.webp" media="(max-width:600px)"><link rel="preconnect" href="https://fonts.googleapis.com">')
    page = page.replace('<p class="sample">Preview build: events', '<p class="sample">Events')
assert "{{" not in page, page[page.index("{{"):page.index("{{") + 40]
open(OUT, "w", encoding="utf-8").write(page)
print(OUT, len(page) // 1024, "KB")

# ---------- CRM SQL ----------
def q(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list): return "array[" + ",".join(q(x) for x in v) + "]::text[]"
    return "'" + str(v).replace("'", "''") + "'"
def r2(n): return f"homepage/{n}.webp"
seed = []
seed.append("insert into cac.homepage_blocks (key,title,position) values " + ",".join(f"({q(k)},{q(t)},{i*10})" for i, (k, t) in enumerate(BLOCKS, 1)) + ";")
seed.append("insert into cac.events (slug,title,event_type,starts_at,ends_at,venue,region,price_pence,ticket_status,image_path,image_alt) values " +
            ",".join(f"({q(e[0])},{q(e[1])},{q(e[2])},{q(e[3])},{q(e[4])},{q(e[5])},{q(e[6])},{e[7]},{q(e[8])},{q(r2(e[9]))},{q(e[10])})" for e in EVENTS) + ";")
seed.append("insert into cac.articles (slug,title,category,excerpt,image_path,image_alt,read_minutes,featured,published_at) values " +
            ",".join(f"({q(a[0])},{q(a[1])},{q(a[2])},{q(a[3])},{q(r2(a[4]))},{q(a[5])},{a[6]},{q(a[7])},{q(a[8])})" for a in ARTICLES) + ";")
seed.append("insert into cac.community_highlights (handle,title,excerpt,image_path,image_alt,sort) values " +
            ",".join(f"({q(c[0])},{q(c[1])},{q(c[2])},{q(r2(c[3]))},{q(c[4])},{i})" for i, c in enumerate(COMMUNITY)) + ";")
seed.append("insert into cac.products (slug,name,price_pence,member_price_pence,badge,image_path,image_alt,units_sold_30d) values " +
            ",".join(f"({q(p[0])},{q(p[1])},{p[2]},{q(p[3])},{q(p[4])},{q(r2(p[5]))},{q(p[6])},{40-i*8})" for i, p in enumerate(PRODUCTS)) + ";")
seed.append("insert into cac.gallery_items (slug,title,image_path,image_alt,sort) values " +
            ",".join(f"({q(g[0])},{q(g[1])},{q(r2(g[2]))},{q(g[3])},{i})" for i, g in enumerate(GALLERY)) + ";")
seed.append("insert into cac.directory_regions (name,slug,sort) values " + ",".join(f"({q(r)},{q(slug(r))},{i})" for i, r in enumerate(REGIONS)) + ";")
seed.append("insert into cac.directory_services (name,slug,sort) values " + ",".join(f"({q(s)},{q(slug(s))},{i})" for i, s in enumerate(SERVICES)) + ";")
seed.append("insert into cac.directory_listings (slug,name,services,town,region,image_path,image_alt,featured) values " +
            ",".join(f"({q(b[0])},{q(b[1])},{q(b[2])},{q(b[3])},{q('East Anglia')},{q(r2(b[4]))},{q(b[5])},true)" for b in DIRECTORY) + ";")
seed.append("insert into cac.partners (slug,name,tagline,page_path,logo_path,sort) values " + ",".join(f"({q(p[0])},{q(p[1])},{q(p[2])},{q(p[3])},{q('partners/'+p[4])},{i})" for i, p in enumerate(PARTNERS)) + ";")
for f in PARTNER_FEATURES:
    seed.append("insert into cac.partner_features (partner_id,block_key,title,body,extra,image_path,image_alt,cta_label,cta_url,cta2_label,cta2_url,countdown_to) "
                f"select id,{q(f[1])},{q(f[2])},{q(f[3])},{q(f[11])},{q(r2(f[4]))},{q(f[5])},{q(f[6])},{q(f[7])},{q(f[8])},{q(f[9])},{q(f[10])} from cac.partners where slug={q(f[0])};")
seed.append(f"insert into cac.sponsored_slots (advertiser,title,body,image_path,image_alt,cta_label,cta_url,starts_at,ends_at) values ({q(sp[0])},{q(sp[1])},{q(sp[2])},{q(r2(sp[3]))},{q(sp[4])},{q(sp[5])},{q(sp[6])},now(),now()+interval '30 days');")
seed.append("insert into cac.faqs (question,answer,sort) values " + ",".join(f"({q(a)},{q(b)},{i})" for i, (a, b) in enumerate(FAQS)) + ";")
seed.append("insert into cac.site_stats (key,label,value,is_sample) values " + ",".join(f"({q(l.replace(' ','_'))},{q(l)},{q(n)},true)" for n, l in STATS) + ";")
open("../supabase/seed_homepage.sql", "w").write("\n".join(seed) + "\n")
print("seed.sql ok")
