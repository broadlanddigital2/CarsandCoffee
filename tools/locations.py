# Generates SQL for new location hub pages (saved as drafts). Run: python3 locations.py > /tmp/locations.sql
import json

# Shared drive images until real photos arrive (see the image brief)
IMG = {"coast": "homepage/ev-tour.webp", "rural": "homepage/com-3.webp", "forest": "homepage/gal-evening.webp"}

def clip(t, n):
    if len(t) <= n: return t
    t = t[:n].rsplit(' ', 1)[0].rstrip(',.')
    return t + '.'

def faqs(place, county, hub):
    return [
        [f"Are car meets in {place} free?", "Most of our breakfast meets are free to attend; we ask you to RSVP so we can plan parking. Tours, garage nights and race nights are ticketed, and the price is on each event."],
        ["Do I need a special car to come along?", "No. Classics, modern performance cars, track cars and daily drivers are all welcome, and so are people who come without a car to look around."],
        ["Where do I park?", "Each event page explains where display cars and visitors should park. Arrive within the arrival window and follow the marshals."],
        ["Are meets family-friendly?", "Yes. Our morning meets are relaxed and suitable for all ages. Please keep children close around moving cars."],
        [f"How do I hear about new meets near {place}?", f"Join the newsletter or the Cars and Coffee club and follow the {hub} hub. New dates are posted there first."],
        [f"How do I find a good garage or detailer in {place}?", f"Use the local services on this page. Every business in our directory is checked by our team, and members share their own recommendations in the {hub} hub in the club."],
        [f"Can my {place} business be listed here?", f"Yes. If you run a garage, detailer, restorer, wrap shop, parts supplier or other car business in or near {place}, list it in the directory and it will appear on this page."],
        [f"Can I sell car parts or products from {place}?", "Yes. Partner shops can sell through the Cars and Coffee UK shop with their own shop page. See Sell on Cars and Coffee UK for details."],
    ]

def page(slug, town, county, parent, intro_bits, scene, stats, drives, more, car, no_car, interests, kw_extra=None, focus=None):
    is_county = town is None
    place = county if is_county else town
    path = f"/{county.lower()}" + ("" if is_county else f"/{slug}")
    hub = county
    title = f"Car meets and car services in {place}"
    return {
        "path": path, "title": title, "h1": title,
        "meta_title": f"{place} Car Meets, Garages & Detailers | Cars and Coffee"[:60] if len(f"{place} Car Meets, Garages & Detailers | Cars and Coffee") <= 60 else f"{place} Car Meets, Garages & Detailers",
        "meta_description": f"Car meets in {place} plus trusted local garages, detailers, restorers and parts suppliers, and the best drives and car clubs nearby.",
        "focus_keyword": focus or f"car meets {place.lower()}",
        "secondary_keywords": [f"garages {place.lower()}", f"car detailing {place.lower()}", f"car parts {place.lower()}", f"cars and coffee {place.lower()}"] + (kw_extra or []),
        "intro": f"Your {place} car hub: car meets {'across the county' if is_county else 'in and around ' + place}, trusted local garages, detailers, restorers and parts suppliers, the best drives and the clubs to join, all in one place.",
        "county": county, "town": town, "parent": parent,
        "content": {"label": f"{place} car hub", "scene": scene, "stats": stats,
                    "drives": [{"title": d[0], "text": d[1], "distance": d[2], "image": IMG[d[3]]} for d in drives],
                    "interests": interests, "more_places": more, "getting_there": {"car": car, "no_car": no_car}},
    }

INT_N = ["Classic cars", "Track days", "Detailing and wraps", "Restoration and builds", "Car parts and tuning"]
INT_S = ["Classic cars", "Modern performance", "Detailing and wraps", "Restoration and builds", "Car parts and tuning"]
NO_CAR = "Some venues are near bus routes or a railway station. Event pages show the nearest stop and station where there is one, and members often share lifts in the club."

P = []
# ---------------- Suffolk (county) ----------------
P.append(page(None, None, "Suffolk", "/car-meets", "Free breakfast meets most months.",
  ["Suffolk is a county of quiet lanes, market towns and a long, unspoilt coast. From the Heritage Coast villages to the timber-framed streets of Lavenham, it rewards anyone who likes a proper drive with somewhere good to stop for a coffee.",
   "Ipswich, the county town, has a strong mix of independent garages, specialists and detailers, and the A14 puts Bury St Edmunds, Stowmarket and Newmarket within easy reach. Snetterton Circuit is just over the border in Norfolk for track days and club racing.",
   "Our Suffolk pages bring together meets, local car businesses, parts suppliers and the best drives, so whether you own a classic, a modern performance car or a daily driver, you can find your people nearby."],
  [["Free", "Most morning meets"], ["A12 and A14", "Main routes across the county"], ["Heritage Coast", "Some of the best drives in the region"], ["Under an hour", "From much of Suffolk to Snetterton"]],
  [("Suffolk Heritage Coast", "Woodbridge to Orford, Aldeburgh and Southwold on quiet B-roads, with heathland and estuary views.", "About 35 miles", "coast"),
   ("Wool towns loop", "Sudbury, Long Melford and Lavenham: timber-framed villages and rolling farmland.", "About 25 miles", "rural"),
   ("The Brecks from Bury", "North from Bury St Edmunds into the pine forests and heath around Thetford.", "About 30 miles", "forest")],
  ["Ipswich", "Bury St Edmunds", "Lowestoft", "Felixstowe", "Stowmarket", "Sudbury", "Newmarket", "Woodbridge", "Haverhill", "Beccles", "Framlingham", "Southwold", "Halesworth", "Hadleigh"],
  "The A12 runs north–south from the Essex border through Ipswich and up the coast towards Lowestoft, and the A14 crosses the county east–west from Felixstowe through Ipswich, Stowmarket, Bury St Edmunds and Newmarket.",
  NO_CAR, INT_S, ["classic cars suffolk", "car clubs suffolk"]))

# ---------------- Norfolk towns ----------------
P.append(page("kings-lynn", "King's Lynn", "Norfolk", "/norfolk", "Meets, services and drives in West Norfolk.",
  ["King's Lynn is the hub of West Norfolk: a historic port on the Great Ouse, with the Fens to the west and the Sandringham estate and the coast to the north-east.",
   "The town has a good spread of independent garages, body shops and specialists, and it's a natural meeting point for owners from across West Norfolk, the Fens and the north Norfolk coast.",
   "From King's Lynn it's a short run to Hunstanton and the coast road, or out across the flat, fast Fen roads. Our meets and partner businesses help you make the most of it."],
  [["Free", "Most morning meets"], ["A47, A10 and A17", "Main roads into town"], ["About 15 miles", "To Hunstanton and the coast"], ["About 40 miles", "To Snetterton Circuit"]],
  [("Hunstanton and the coast road", "North through the Sandringham estate area to Hunstanton, then east along the A149.", "About 20 miles", "coast"),
   ("Into the Fens", "Long, open roads west towards Wisbech and the Cambridgeshire border.", "About 30 miles", "rural"),
   ("Swaffham and the Brecks", "South-east on the A47 to Swaffham, then into the forest and heath of the Brecks.", "About 35 miles", "forest")],
  ["Downham Market", "Hunstanton", "Heacham", "Swaffham", "Terrington St Clement", "Dersingham"],
  "The A47 links King's Lynn with Swaffham, Dereham and Norwich to the east and Wisbech to the west; the A10 runs south to Downham Market and Ely, and the A17 heads west into Lincolnshire.",
  "King's Lynn railway station has direct trains to Cambridge and London. " + NO_CAR, INT_N))

P.append(page("great-yarmouth", "Great Yarmouth", "Norfolk", "/norfolk", "Meets, services and drives on the East Norfolk coast.",
  ["Great Yarmouth sits on the East Norfolk coast where the rivers of the Broads meet the sea. It's a seaside town with a long seafront and a busy working port.",
   "The area has plenty of independent garages, tyre and MOT centres and specialists, and it's a natural base for owners across East Norfolk and the Broads.",
   "Head inland for Broads villages and quiet lanes, or north up the coast towards Winterton and Sea Palling. Our meets and directory help you find what's on and who to trust."],
  [["Free", "Most morning meets"], ["A47", "To Norwich and Lowestoft"], ["About 20 miles", "To Norwich"], ["About 45 miles", "To Snetterton Circuit"]],
  [("Acle Straight and the Broads", "West across the marshes to Acle, then out to Broads villages on quiet lanes.", "About 25 miles", "rural"),
   ("North along the coast", "Caister, Winterton and Sea Palling, with dunes and big skies.", "About 20 miles", "coast"),
   ("South to Lowestoft", "Down the coast into Suffolk and on towards Beccles.", "About 25 miles", "coast")],
  ["Gorleston-on-Sea", "Caister-on-Sea", "Acle", "Martham", "Hemsby", "Bradwell"],
  "The A47 links Great Yarmouth with Norwich (via the Acle Straight) and runs south to Lowestoft. The A149 heads north along the coast.",
  "Great Yarmouth railway station has trains to Norwich. " + NO_CAR, INT_N))

P.append(page("thetford", "Thetford", "Norfolk", "/norfolk", "Close to Snetterton Circuit and Thetford Forest.",
  ["Thetford is in the heart of the Brecks, surrounded by Thetford Forest, one of the largest lowland pine forests in the country. It's also one of the closest towns to Snetterton Circuit.",
   "That makes it a great base for track-day regulars and anyone who likes a forest drive. The town and surrounding villages have garages, specialists and tuners worth knowing.",
   "With the A11 on the doorstep, Norwich, Bury St Edmunds and Newmarket are all within easy reach for meets and events."],
  [["About 10 miles", "To Snetterton Circuit"], ["A11", "To Norwich and Cambridge"], ["Thetford Forest", "On the doorstep"], ["Free", "Most morning meets"]],
  [("Thetford Forest roads", "Pine forest and open heath on the roads around Brandon and Mundford.", "About 25 miles", "forest"),
   ("Snetterton and back", "Up the A11 to the circuit, returning through quiet villages.", "About 25 miles", "rural"),
   ("Swaffham run", "North on the A1065 through the forest to Swaffham.", "About 20 miles", "forest")],
  ["Brandon", "Watton", "Attleborough", "East Harling", "Mundford", "Diss"],
  "The A11 links Thetford with Norwich, Snetterton and Cambridge. The A134 runs to Bury St Edmunds and the A1066 heads east to Diss.",
  "Thetford railway station is on the line between Norwich and Cambridge. " + NO_CAR, INT_N))

P.append(page("dereham", "Dereham", "Norfolk", "/norfolk", "Meets, services and drives in Mid Norfolk.",
  ["Dereham is a market town in the middle of Norfolk, about 15 miles west of Norwich on the A47. It's surrounded by farmland and quiet country roads.",
   "Mid Norfolk has a strong rural motoring scene, from farm-based workshops and restorers to independent garages and detailers, and Dereham is a natural meeting point for it.",
   "From here it's easy to reach Norwich, Swaffham, Fakenham and the north Norfolk coast, so it suits owners who like a long drive to a meet."],
  [["About 15 miles", "To Norwich"], ["A47", "Main road"], ["About 20 miles", "To Snetterton Circuit"], ["Free", "Most morning meets"]],
  [("North to the coast", "Up through Fakenham to Wells-next-the-Sea and the coast road.", "About 30 miles", "coast"),
   ("Mid Norfolk lanes", "Country lanes towards Reepham and Aylsham.", "About 25 miles", "rural"),
   ("Brecks via Swaffham", "West on the A47 to Swaffham, then south into the forest.", "About 35 miles", "forest")],
  ["Swaffham", "Watton", "Reepham", "Shipdham", "Mattishall", "Fakenham"],
  "The A47 links Dereham with Norwich to the east and Swaffham and King's Lynn to the west. The B1110 and B1146 head north towards Holt and Fakenham.",
  NO_CAR, INT_N))

P.append(page("cromer", "Cromer", "Norfolk", "/norfolk", "Meets, services and drives on the North Norfolk coast.",
  ["Cromer is a classic seaside town on the North Norfolk coast, known for its pier and cliffs. It sits on one of the best driving roads in the region, the A149 coast road.",
   "Weekends bring a steady stream of classic and performance cars along the coast, and the area has garages, specialists and detailers who know how to look after them.",
   "Whether you're heading west to Wells and Holkham or inland to Holt and Aylsham, Cromer is a great place to start or finish a drive."],
  [["A149", "The coast road"], ["About 23 miles", "To Norwich"], ["North Norfolk coast", "Protected landscape"], ["Free", "Most morning meets"]],
  [("West along the coast", "Sheringham, Blakeney and Wells-next-the-Sea on the A149.", "About 20 miles", "coast"),
   ("Holt and the lanes", "Inland to Holt, then back on quiet B-roads.", "About 20 miles", "rural"),
   ("East coast villages", "Overstrand, Mundesley and Happisburgh.", "About 15 miles", "coast")],
  ["Sheringham", "Holt", "North Walsham", "Aylsham", "Mundesley", "Overstrand"],
  "The A140 links Cromer with Norwich, and the A149 runs along the coast to Sheringham and Wells in one direction and towards North Walsham in the other.",
  "Cromer is on the Bittern Line railway to Norwich. " + NO_CAR, INT_N))

P.append(page("wymondham", "Wymondham", "Norfolk", "/norfolk", "Near Lotus at Hethel and the A11.",
  ["Wymondham is a market town just south-west of Norwich on the A11, known for its twin-towered abbey. Lotus Cars is based at Hethel, only a few miles away.",
   "It's well placed for the whole Norfolk scene: Norwich is minutes away and Snetterton is a short run down the A11. The area has garages, specialists and restorers worth knowing.",
   "Our meets around Norwich and South Norfolk are an easy drive from Wymondham, and the lanes south of the town are perfect for a gentle Sunday run."],
  [["A few miles", "To Lotus at Hethel"], ["About 15 miles", "To Snetterton Circuit"], ["A11", "Main road"], ["Free", "Most morning meets"]],
  [("South Norfolk lanes", "Quiet roads through villages towards Hingham and Attleborough.", "About 20 miles", "rural"),
   ("Down the A11 to the Brecks", "Past Snetterton into Thetford Forest.", "About 30 miles", "forest"),
   ("North Norfolk coast", "Through Norwich and up the A140 to Cromer.", "About 35 miles", "coast")],
  ["Hethersett", "Attleborough", "Hingham", "Mulbarton", "Cringleford", "Wicklewood"],
  "The A11 runs past Wymondham, linking it with Norwich to the north-east and Snetterton, Thetford and Cambridge to the south-west.",
  "Wymondham railway station is on the line between Norwich and Cambridge. " + NO_CAR, INT_N))

# ---------------- Suffolk towns ----------------
P.append(page("ipswich", "Ipswich", "Suffolk", "/suffolk", "Free breakfast meets and trusted local specialists.",
  ["Ipswich is Suffolk's county town, on the Orwell estuary, and the centre of the Suffolk car scene. It has a wide mix of independent garages, performance specialists, detailers, body shops and parts suppliers.",
   "With the A12 and A14 meeting here, owners from across Suffolk and north Essex can reach Ipswich easily, which makes it a natural place for meets and garage nights.",
   "Head out to the Shotley peninsula, along the Deben to Woodbridge or south into Constable Country for some of the best drives in East Anglia."],
  [["A12 and A14", "Meet at Ipswich"], ["Orwell Bridge", "Gateway to the coast"], ["About 40 miles", "To Snetterton Circuit"], ["Free", "Most morning meets"]],
  [("Shotley peninsula", "Out along the Orwell estuary to Shotley Gate, with river views all the way.", "About 25 miles", "coast"),
   ("Constable Country", "South to the Stour valley and Dedham Vale on quiet lanes.", "About 30 miles", "rural"),
   ("Woodbridge and the Deben", "North-east to Woodbridge, then on to Orford.", "About 30 miles", "coast")],
  ["Woodbridge", "Felixstowe", "Hadleigh", "Needham Market", "Kesgrave", "Martlesham"],
  "The A14 crosses Ipswich on the Orwell Bridge, linking Felixstowe with Stowmarket and Bury St Edmunds. The A12 runs south to Colchester and north towards Woodbridge and Lowestoft.",
  "Ipswich railway station has fast trains to London, Norwich and Cambridge. " + NO_CAR, INT_S))

P.append(page("bury-st-edmunds", "Bury St Edmunds", "Suffolk", "/suffolk", "Meets, services and drives in West Suffolk.",
  ["Bury St Edmunds is a historic market town in West Suffolk, built around its abbey gardens and cathedral. It's surrounded by some of the prettiest villages in the county.",
   "The town and nearby villages have independent garages, specialists, restorers and detailers, and the A14 makes it easy to reach for owners from across Suffolk and Cambridgeshire.",
   "It's well placed for drives in every direction: south to the wool towns, north into the Brecks or west towards Newmarket."],
  [["A14", "Main road"], ["About 20 miles", "To Snetterton Circuit"], ["Wool towns", "On the doorstep"], ["Free", "Most morning meets"]],
  [("Lavenham and Long Melford", "South through timber-framed villages and rolling farmland.", "About 30 miles", "rural"),
   ("North into the Brecks", "Up the A134 towards Thetford Forest.", "About 25 miles", "forest"),
   ("Newmarket Heath", "West along quiet roads to Newmarket and the gallops.", "About 30 miles", "rural")],
  ["Lavenham", "Ixworth", "Thurston", "Clare", "Haverhill", "Mildenhall"],
  "The A14 links Bury St Edmunds with Ipswich to the east and Newmarket and Cambridge to the west. The A134 runs north to Thetford and south to Sudbury.",
  "Bury St Edmunds railway station is on the line between Ipswich and Cambridge. " + NO_CAR, INT_S))

P.append(page("lowestoft", "Lowestoft", "Suffolk", "/suffolk", "Meets, services and drives on the North Suffolk coast.",
  ["Lowestoft is the most easterly town in the UK, on the Suffolk coast at the southern edge of the Broads. It has a long seafront, a working harbour and a down-to-earth car scene.",
   "Owners here have garages, tyre and MOT centres, specialists and detailers close by, and it's an easy run to meets across North Suffolk and East Norfolk.",
   "Drive down the coast to Southwold, inland to Beccles and the Waveney valley, or north to Great Yarmouth."],
  [["Most easterly", "Town in the UK"], ["A47 and A12", "Main roads"], ["About 25 miles", "To Norwich"], ["Free", "Most morning meets"]],
  [("Southwold run", "South on the A12, then the coast roads into Southwold.", "About 25 miles", "coast"),
   ("Waveney valley", "Inland to Beccles and Bungay on quiet roads.", "About 25 miles", "rural"),
   ("North to Great Yarmouth", "Up the coast and back through the Broads.", "About 30 miles", "coast")],
  ["Beccles", "Oulton Broad", "Kessingland", "Bungay", "Southwold", "Carlton Colville"],
  "The A47 links Lowestoft with Great Yarmouth, the A146 runs to Beccles and Norwich, and the A12 heads south towards Ipswich.",
  "Lowestoft railway station has trains to Norwich and Ipswich. " + NO_CAR, INT_S))

P.append(page("felixstowe", "Felixstowe", "Suffolk", "/suffolk", "Meets, services and drives on the Suffolk coast.",
  ["Felixstowe is a seaside town at the mouth of the Orwell and Stour, home to the UK's biggest container port and a long, relaxed seafront.",
   "Being at the end of the A14 makes it easy to reach, and the town and nearby Ipswich have plenty of garages, specialists and detailers.",
   "The heaths and estuaries north of the town, around Woodbridge and Bawdsey, make for an easy and scenic Sunday drive."],
  [["A14", "Straight to Ipswich"], ["About 12 miles", "To Ipswich"], ["About 50 miles", "To Snetterton Circuit"], ["Free", "Most morning meets"]],
  [("Bawdsey and the Deben", "North to the Deben estuary and Bawdsey.", "About 20 miles", "coast"),
   ("Woodbridge and Sutton Heath", "Through Martlesham to Woodbridge and the heaths beyond.", "About 25 miles", "rural"),
   ("Shotley via Ipswich", "Round the Orwell to the Shotley peninsula.", "About 30 miles", "coast")],
  ["Trimley St Mary", "Walton", "Kirton", "Bucklesham", "Martlesham", "Ipswich"],
  "The A14 links Felixstowe with Ipswich, Stowmarket and Bury St Edmunds, with the A12 near Ipswich for Woodbridge and Colchester.",
  "Felixstowe has a branch railway line to Ipswich. " + NO_CAR, INT_S))

P.append(page("stowmarket", "Stowmarket", "Suffolk", "/suffolk", "Meets, services and drives in Mid Suffolk.",
  ["Stowmarket is a market town in the middle of Suffolk, right on the A14. It's a handy midpoint for meets, with Ipswich and Bury St Edmunds each about 15 miles away.",
   "Mid Suffolk has a strong rural car scene, with independent garages, farm-based workshops, restorers and detailers spread across the villages.",
   "Head north for quiet lanes towards Eye and Framlingham, or use the A14 to reach events across the county."],
  [["A14", "Main road"], ["About 15 miles", "To Ipswich and Bury"], ["About 30 miles", "To Snetterton Circuit"], ["Free", "Most morning meets"]],
  [("Framlingham and the castle", "East on country roads to Framlingham.", "About 20 miles", "rural"),
   ("North to Eye and Diss", "Quiet lanes up to the Norfolk border.", "About 20 miles", "rural"),
   ("Coast via Woodbridge", "Down to Woodbridge, then on to Orford.", "About 35 miles", "coast")],
  ["Needham Market", "Debenham", "Bacton", "Mendlesham", "Elmswell", "Eye"],
  "The A14 runs past Stowmarket, linking it with Ipswich to the south-east and Bury St Edmunds to the west. The A1120 heads east across Mid Suffolk.",
  "Stowmarket railway station is on the line between Ipswich and Norwich. " + NO_CAR, INT_S))

P.append(page("sudbury", "Sudbury", "Suffolk", "/suffolk", "Meets, services and drives in the Stour valley.",
  ["Sudbury is a market town in the Stour valley on the Suffolk–Essex border, the birthplace of the painter Thomas Gainsborough.",
   "It's surrounded by some of the best driving country in the region, and the town and its villages have garages, specialists and restorers who look after everything from classics to modern cars.",
   "Long Melford and Lavenham are a few miles north, and Dedham Vale is a short run to the east."],
  [["Stour valley", "On the Essex border"], ["A134 and A131", "Main roads"], ["About 35 miles", "To Snetterton Circuit"], ["Free", "Most morning meets"]],
  [("Wool towns", "Long Melford, Lavenham and Kersey.", "About 20 miles", "rural"),
   ("Dedham Vale", "East along the Stour valley into Constable Country.", "About 25 miles", "rural"),
   ("Clare and Cavendish", "West through the upper Stour valley.", "About 20 miles", "rural")],
  ["Long Melford", "Lavenham", "Great Cornard", "Clare", "Cavendish", "Boxford"],
  "The A134 links Sudbury with Bury St Edmunds to the north and Colchester to the south, and the A131 runs to Braintree and Chelmsford.",
  "Sudbury has a branch railway line to Marks Tey, for trains to Colchester and London. " + NO_CAR, INT_S))

P.append(page("newmarket", "Newmarket", "Suffolk", "/suffolk", "Meets, services and drives near the A14 and A11.",
  ["Newmarket is world-famous as the home of British horse racing, with the gallops and heath right on the edge of town.",
   "It sits where the A14 and A11 meet, so it's easy to reach from Cambridge, Bury St Edmunds and Norfolk. The area has garages, specialists and detailers serving owners across West Suffolk and East Cambridgeshire.",
   "From here you can head into the Brecks, out across the Fens towards Ely, or south into rolling Suffolk countryside."],
  [["A14 and A11", "Meet near Newmarket"], ["About 30 miles", "To Snetterton Circuit"], ["About 13 miles", "To Cambridge"], ["Free", "Most morning meets"]],
  [("Into the Brecks", "North-east on the A11 towards Thetford Forest.", "About 30 miles", "forest"),
   ("Fen edge to Ely", "Out across flat, open roads to Ely.", "About 25 miles", "rural"),
   ("South Suffolk villages", "Towards Clare and Cavendish on quiet lanes.", "About 30 miles", "rural")],
  ["Exning", "Mildenhall", "Kentford", "Moulton", "Lakenheath", "Soham"],
  "The A14 links Newmarket with Cambridge and Bury St Edmunds, and the A11 runs north to Thetford, Snetterton and Norwich.",
  "Newmarket railway station is on the line between Cambridge and Ipswich. " + NO_CAR, INT_S))

P.append(page("woodbridge", "Woodbridge", "Suffolk", "/suffolk", "Meets, services and drives near the Heritage Coast.",
  ["Woodbridge is a riverside town on the Deben, close to the Anglo-Saxon burial site at Sutton Hoo. It's the gateway to the Suffolk Heritage Coast.",
   "The town and nearby Martlesham and Ipswich have garages, specialists and detailers, and it's a favourite starting point for coastal drives.",
   "Orford, Aldeburgh, Snape and Southwold are all within easy reach on quiet roads through heath and forest."],
  [["A12", "Main road"], ["About 8 miles", "To Ipswich"], ["Heritage Coast", "On the doorstep"], ["Free", "Most morning meets"]],
  [("Orford and Aldeburgh", "Through Rendlesham Forest to Orford, then up to Aldeburgh.", "About 30 miles", "coast"),
   ("Snape and Southwold", "North on the A12 and coast roads to Southwold.", "About 35 miles", "coast"),
   ("Framlingham loop", "Inland to Framlingham and back on quiet lanes.", "About 25 miles", "rural")],
  ["Martlesham", "Melton", "Wickham Market", "Framlingham", "Orford", "Kesgrave"],
  "The A12 bypasses Woodbridge, linking it with Ipswich to the south-west and Saxmundham and Lowestoft to the north.",
  "Woodbridge railway station is on the East Suffolk line between Ipswich and Lowestoft. " + NO_CAR, INT_S))

def q(v): return "$q$" + v + "$q$" if v is not None else "null"
out = []
for p in P:
    out.append(f"""insert into site.pages (path, page_type, title, h1, meta_title, meta_description, focus_keyword, secondary_keywords, intro, schema_type, county, town, parent_id, cta_label, cta_url, status, noindex, content)
values ({q(p['path'])}, 'location', {q(p['title'])}, {q(p['h1'])}, {q(p['meta_title'])}, {q(p['meta_description'])}, {q(p['focus_keyword'])}, {q('{' + ','.join(json.dumps(k) for k in p['secondary_keywords']) + '}')}::text[], {q(p['intro'])}, 'CollectionPage', {q(p['county'])}, {q(p['town'])},
  (select id from site.pages where path = {q(p['parent'])}), 'See all events', '/events', 'draft', false, {q(json.dumps(p['content'], ensure_ascii=False, separators=(',', ':')))}::jsonb)
on conflict (path) do nothing;""")
tpl = json.dumps(faqs("{P}", "{C}", "{C}"), ensure_ascii=False, separators=(',', ':'))
paths = ",".join("'" + p['path'] + "'" for p in P)
out.append(f"""update site.pages set content = content || jsonb_build_object('faqs', replace(replace({q(tpl)}, '{{P}}', coalesce(town, county)), '{{C}}', county)::jsonb) where path in ({paths}) and not (content ? 'faqs');""")
print("\n".join(out))
