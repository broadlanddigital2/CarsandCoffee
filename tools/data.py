# Single source of homepage content: feeds both index.html and the CRM seed SQL.
# All events, stories, businesses and figures are SAMPLE content for the preview.

EVENTS = [
    # slug, title, type, start (UTC ISO), end, venue, region, price_pence (0=free), ticket_status, image, alt
    ("norfolk-breakfast-meet-dec-2026", "Norfolk Breakfast Meet", "meet", "2026-12-06T07:30:00Z", "2026-12-06T11:30:00Z",
     "The Workshop, Norfolk", "East Anglia", 0, "free_rsvp", "ev-breakfast", "Classic cars lined up outside a brick workshop at a breakfast meet"),
    ("festive-cars-and-coffee-2026", "Festive Cars and Coffee", "meet", "2026-12-20T08:00:00Z", "2026-12-20T12:00:00Z",
     "The Workshop, Norfolk", "East Anglia", 500, "selling_fast", "ev-porsche", "Red classic sports car parked among visitors at a meet"),
    ("new-years-day-classic-run-2027", "New Year's Day Classic Run", "tour", "2027-01-01T09:00:00Z", "2027-01-01T14:00:00Z",
     "North Norfolk coast route", "East Anglia", 1500, "on_sale", "ev-tour", "Classic sports cars touring a country road"),
    ("norfolk-breakfast-meet-jan-2027", "Norfolk Breakfast Meet", "meet", "2027-01-03T07:30:00Z", "2027-01-03T11:30:00Z",
     "The Workshop, Norfolk", "East Anglia", 0, "free_rsvp", "whyjoin", "Friends chatting with coffee at a car meet"),
    ("garage-night-restoration-special-2027", "Garage Night: Restoration Special", "garage", "2027-01-16T18:00:00Z", "2027-01-16T21:00:00Z",
     "Riverside Performance, Suffolk", "East Anglia", 1000, "on_sale", "dir-1", "Mechanic working under the bonnet in a workshop"),
    ("le-mans-24-hours-watch-party-2027", "Le Mans 24 Hours Watch Party", "watch", "2027-06-12T13:00:00Z", "2027-06-13T15:00:00Z",
     "The Workshop, Norfolk", "East Anglia", 1200, "on_sale", "lemans", "Endurance prototype racing at night"),
]
EVENT_TYPES = {"meet": "Meet", "tour": "Tour", "garage": "Garage night", "watch": "Watch party"}
TICKET = {"free_rsvp": "Free · RSVP", "selling_fast": "Selling fast", "on_sale": "On sale", "sold_out": "Sold out"}

ARTICLES = [
    # slug, title, category, excerpt, image, alt, minutes, featured, published (ISO date)
    ("mk1-gti-new-life", "How a Mk1 GTI found a new life", "Restoration",
     "The simple, honest restoration keeping a ’70s icon on Norfolk roads.", "news-gti",
     "Owner working on the engine of an orange 1970s hatchback", 6, True, "2026-11-20"),
    ("le-mans-2027-dates", "Le Mans 2027: dates set for the 95th running", "WEC",
     "Race week runs 9–13 June, with the 24 Hours itself on 12–13 June.", "lemans",
     "Endurance prototype at night with fairground wheel behind", 3, False, "2026-11-18"),
    ("british-classics-on-the-road", "The enthusiasts keeping British classics on the road", "People",
     "Meet the owners who drive their cars all year round.", "news-2", "Smiling driver in an open-face helmet", 4, False, "2026-11-15"),
    ("carburettors-vs-injection", "Carburettors vs. injection: what’s right for your classic?", "Technical",
     "The honest pros and cons of converting.", "news-3", "Close-up of a classic engine with twin carburettors", 6, False, "2026-11-12"),
    ("winter-lay-up-checks", "Five checks before you lay up your classic for winter", "Technical",
     "Battery, tyres, fluids, covers and paperwork.", "gal-wheel", "Wood-rimmed steering wheel and dials", 5, False, "2026-11-09"),
]

COMMUNITY = [
    # handle, title, excerpt, image, alt, posted
    ("@norfolkseries", "Bringing a Series IIA back to life", "A slow, satisfying restoration, one weekend at a time.",
     "com-1", "Owner working on the front of an old green off-roader", "3 days ago"),
    ("@elliesgarage", "My first engine rebuild", "A steep learning curve, a few setbacks and a running engine at last.",
     "com-2", "Woman working on an engine under a raised bonnet", "5 days ago"),
    ("@aircooleduk", "A Norfolk dawn run with friends", "Crisp roads, good company and a reminder of why we do this.",
     "com-3", "Classic sports cars driving a country lane at sunrise", "1 week ago"),
]

PRODUCTS = [
    # slug, name, price_pence, member_price_pence, badge, image, alt
    ("club-cap", "Cars and Coffee UK cap", 2200, None, "Best seller", "shop-cap", "Black cap with red Cars and Coffee UK patch"),
    ("classic-logo-tee", "Classic logo T-shirt", 2800, 2400, "Member price", "shop-tee", "Cream T-shirt with red chest logo"),
    ("enamel-mug", "Enamel mug", 1200, None, "New", "shop-mug", "White enamel mug with red logo"),
    ("logo-sticker", "Logo sticker", 300, None, None, "shop-sticker", "Red and white Cars and Coffee UK sticker"),
]

GALLERY = [
    ("workshop-regulars", "Workshop regulars", "gal-aston", "Silver classic GT car outside the workshop"),
    ("paddock-liveries", "Liveries from the paddock", "rcg", "Blue and orange touring car at speed"),
    ("the-details", "The details", "gal-wheel", "Wood-rimmed steering wheel and gauges"),
    ("evening-meet", "The evening meet", "gal-evening", "Visitors walking among cars at sunset"),
    ("dawn-run", "Dawn run", "com-3", "Classic cars on a country lane at sunrise"),
]

DIRECTORY = [
    ("norfolk-restorations", "Norfolk Restorations", ["Restoration", "Bodywork", "Paint"], "Norfolk", "dir-1", "Mechanic restoring a car in a workshop"),
    ("riverside-performance", "Riverside Performance", ["Servicing", "Tuning", "MOT"], "Suffolk", "dir-2", "Stacked tyres in a performance garage"),
    ("coastline-detailing", "Coastline Detailing", ["Detailing", "Ceramic coating", "Paint correction"], "Norfolk", "gal-aston", "Gleaming silver classic car after a full detail"),
]
REGIONS = ["East Anglia", "South East", "London", "Midlands", "North", "Wales", "Scotland"]
SERVICES = ["Restoration", "Servicing", "Tuning", "Bodywork", "Wraps and graphics", "Detailing", "Tyres", "Storage"]

PARTNERS = [
    # slug, name, tagline, url
    ("auto-opulence", "Auto Opulence", "Luxury and performance cars", "/partners/auto-opulence"),
    ("race-car-graphics", "Race Car Graphics", "Motorsport liveries and wraps", "/partners/race-car-graphics"),
    ("le-mans-cave", "Le Mans Cave", "Endurance racing and Le Mans", "/partners/le-mans-cave"),
]
PARTNER_FEATURES = [
    # partner, block_key, title, body, image, alt, cta, cta_url, cta2, cta2_url, countdown_to, extra
    ("auto-opulence", "dream_garage", "Dream Garage",
     "Inside an extraordinary private collection, curated by Auto Opulence. This month: a 1960s grand tourer, restored to concours standard.",
     "dream", "Polished classic dashboard with wood-rimmed wheel", "Explore the collection", "/partners/auto-opulence/dream-garage",
     "Discuss in the community", "/community/hubs/dream-garage", None, None),
    ("race-car-graphics", "livery_of_week", "Livery of the Week",
     "This week’s standout is a blue and orange track-car livery for grassroots racing, designed by Race Car Graphics.",
     "rcg", "Blue and orange touring car with race number 66", "Enter the challenge", "/community/livery-challenge",
     "Get a livery quote", "/partners/race-car-graphics/quote", "2026-12-13T23:59:00Z", "December challenge: retro endurance. Winner featured on the homepage."),
    ("le-mans-cave", "road_to_le_mans", "Road to Le Mans",
     "Endurance stories, watch-party tickets and trip tips in the build-up to the 95th 24 Hours of Le Mans, 12–13 June 2027.",
     "lemans", "Endurance prototype racing at night", "Explore Road to Le Mans", "/partners/le-mans-cave/road-to-le-mans",
     "Join the Le Mans hub", "/community/hubs/wec-le-mans", "2027-06-12T14:00:00Z", "Le Mans Cave member offers announced soon."),
]

SPONSORED = ("Sample advertiser", "Performance parts for road and track", "Quality components, trusted by enthusiasts.",
             "sponsored", "Drilled brake disc and red calliper", "Shop now", "https://example.com")

FAQS = [
    ("How do I join Cars and Coffee UK?",
     "Tap Join, sign in with Google, Apple or your email, and fill in a short application. Our team reviews every application, usually within 24 hours. If a member recommended you, you go into the fast-track queue."),
    ("How do I recommend a friend?",
     "Once you’re a member, open your profile and tap Recommend a mate. Share your invite link or QR code by WhatsApp, email or text. When your friend is approved you’re automatically connected as friends."),
    ("Are meets free?",
     "Most breakfast meets are free; we just ask you to RSVP so we can plan parking. Tours, garage nights and watch parties are ticketed, and the price is shown on each event."),
    ("Do I have to own a particular type of car?",
     "No. Classics, modern performance cars, track cars, daily drivers, or no car at all: everyone who loves cars is welcome."),
    ("Are events open to non-members?",
     "Most events are open to everyone. Members-only events are clearly marked on the event page."),
    ("How do I list my business in the directory?",
     "Choose List your business in the directory, add your details and services, and we’ll check and publish your listing. Featured placements on the homepage are available as a paid upgrade."),
    ("How do I advertise with Cars and Coffee UK?",
     "Visit Advertise with us to see formats and rates, then start a campaign in the advertiser portal. Every ad is reviewed before it goes live."),
]

BLOCKS = [  # key, title, position
    ("header", "Header and navigation"), ("hero", "Hero: next meet"), ("intro", "Intro and quick actions"),
    ("events", "Upcoming events"), ("news", "Latest news"), ("dream_garage", "Auto Opulence: Dream Garage"),
    ("community", "From the community"), ("livery_of_week", "Race Car Graphics: Livery of the Week"),
    ("shop", "Shop best sellers"), ("road_to_le_mans", "Le Mans Cave: Road to Le Mans"),
    ("gallery", "Featured cars and galleries"), ("directory", "Business directory"), ("sponsored", "Sponsored slot"),
    ("why_join", "Why join"), ("partners", "Partners strip"), ("advertise", "Advertise with us"),
    ("newsletter", "Newsletter"), ("faqs", "FAQs"), ("footer", "Footer"),
]
STATS = [("1,240", "members"), ("48", "meets held"), ("3,600", "cars featured")]  # sample figures
