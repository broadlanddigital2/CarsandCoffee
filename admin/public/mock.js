// Test mode for checking admin screens without a real account: add ?mock=admin (or ?mock=signedout, ?mock=member) to any URL.
// Never used unless ?mock= is present; touches no real data. Data lives in memory only.
export function createMock(scenario) {
  const uid = "00000000-0000-0000-0000-0000000000aa";
  const now = Date.now(), day = 864e5, iso = (ms) => new Date(ms).toISOString();
  const role = scenario === "member" ? "member" : scenario === "moderator" ? "moderator" : "admin";
  const db = {
    public: {
      profiles: [{ id: uid, display_name: "Justin Revell", handle: "caddyman", status: "approved", role }],
      settings: [{ key: "signups_open", value: false }],
      signup_allowlist: [{ email: "justin@broadlanddigital.co.uk", note: "Owner", added_at: iso(now - 2 * day) }, { email: "tom@example.com", note: "Invited by Justin Revell (@caddyman)", added_at: iso(now - day) }],
      member_invites: [{ friend_name: "Tom", email: "tom@example.com", created_at: iso(now - day), inviter: uid }],
      email_outbox: [
        { id: 4, to_email: "justin@broadlanddigital.co.uk", template: "member_invite", status: "sent", attempts: 1, error: null, created_at: iso(now - 3600e3), sent_at: iso(now - 3590e3) },
        { id: 5, to_email: "bad@example", template: "application_received", status: "failed", attempts: 3, error: "SendGrid 400: invalid email", created_at: iso(now - 7200e3), sent_at: null },
      ],
    },
    site: {
      pages: [
        { id: "p1", path: "/car-meets/norfolk/norwich", page_type: "location", content: { label: "Norfolk · Norwich", stats: [["Monthly", "Breakfast meet"], ["Free", "Morning meets"]], scene: ["Norwich is the centre of the Norfolk car scene.", "Our Norwich meets are relaxed mornings."], interests: ["Classic cars", "Track days"], drives: [{ title: "North Norfolk coast", distance: "About 25 miles", text: "Coast road.", image: "homepage/ev-tour.webp" }], more_places: ["Wymondham"], getting_there: { car: "Ring road.", no_car: "Buses." }, faqs: [["Are meets free?", "Most are."]] }, title: "Car meets in Norwich", h1: "Car meets in Norwich", meta_title: "Car Meets in Norwich | Cars and Coffee UK", meta_description: "Find car meets in Norwich: monthly breakfast meets, evening garage nights and drives across Norfolk. Free to attend, all cars welcome.", focus_keyword: "car meets norwich", secondary_keywords: ["cars and coffee norwich"], intro: "Looking for car meets in Norwich? Cars and Coffee UK runs relaxed breakfast meets and garage nights in and around the city.", body_md: "## Upcoming car meets in Norwich\n\nOur next meet is at [The Workshop](/events/norfolk-breakfast-meet-dec-2026).\n\n## Where we meet\n\nMost meets are on the edge of Norwich with easy parking.\n\n- Breakfast meets every month\n- Garage nights\n\nSee [all Norfolk meets](/car-meets/norfolk).", county: "Norfolk", town: "Norwich", status: "draft", seo_score: 74, ads: {}, noindex: false, schema_type: "CollectionPage", updated_at: iso(now - 3600e3) },
        { id: "p2", path: "/go/norfolk-car-meets", page_type: "landing", title: "Norfolk car meets (Google Ads)", focus_keyword: "car meets norfolk", status: "published", seo_score: 61, noindex: true, ads: { headlines: ["Car Meets in Norfolk", "Free Breakfast Meets", "All Cars Welcome"], descriptions: ["Relaxed Sunday car meets across Norfolk. Free to attend, RSVP online.", "Classics, modern and track cars. Find your next meet today."], keywords: ["car meets norfolk"], utm_source: "google", utm_medium: "cpc", utm_campaign: "norfolk-meets" }, cta_label: "See upcoming meets", cta_url: "/events", updated_at: iso(now - day) },
      ],
      pages_loc: null,
      page_revisions: [{ id: 1, page_id: "p1" }, { id: 2, page_id: "p1" }],
      events: [{ id: "e0", slug: "old-meet", title: "Summer Meet (past)", event_type: "meet", starts_at: "2026-07-06T07:30:00Z", ends_at: "2026-07-06T11:30:00Z", venue: "The Workshop", price_pence: 0, ticket_status: "free_rsvp", published: true }, { id: "e1", slug: "norfolk-breakfast-meet-dec-2026", title: "Norfolk Breakfast Meet", event_type: "meet", starts_at: "2026-12-06T07:30:00Z", ends_at: "2026-12-06T11:30:00Z", venue: "The Workshop, Norfolk", region: "East Anglia", price_pence: 0, ticket_status: "free_rsvp", members_only: false, published: true, summary: "Our monthly breakfast meet.", body_html: "<p>The easiest way to try Cars and Coffee.</p><h2>Who it's for</h2><p>Anyone who likes cars.</p>", schedule: ["07:30 Display parking opens", "08:00 Coffee"], what_to_bring: ["A warm layer"] }],
      articles: [{ id: "a1", slug: "mk1-gti-new-life", title: "How a Mk1 GTI found a new life", category: "Restoration", status: "published", featured: true, published_at: "2026-11-20", body_html: "<p>When this Mk1 Golf GTI rolled into the workshop it had been off the road for over a decade.</p><h2>Starting with the shell</h2><p>Sills and floors needed <strong>new metal</strong>.</p><ul><li>Sills</li><li>Floor pans</li></ul>" }],
      guides: [{ id: "g1", slug: "your-first-car-meet", title: "Your first car meet: what to expect", intro: "Never been to a car meet before?", body_html: "<p>Car meets are friendly.</p><h2>Parking</h2><ul><li>Follow the marshals.</li></ul><blockquote>No revving.</blockquote>", sort: 10, status: "published", read_minutes: 5 }],
      faqs: [{ id: 1, question: "How do I join Cars and Coffee UK?", answer: "Tap Join…", sort: 0, published: true }],
      partners: [{ id: "pa1", slug: "le-man-cave", name: "Le Man Cave", tagline: "Racing simulators and Scalextric, Norwich", sort: 2, active: true }],
      partner_features: [{ id: "pf1", partner_id: "pa1", block_key: "race_night", title: "Race Night at Le Man Cave", starts_at: iso(now - day), active: true }],
      homepage_blocks: [{ key: "hero", title: "Hero: next meet", position: 20, enabled: true, settings: {} }, { key: "intro", title: "Intro", position: 30, enabled: true, settings: {} }, { key: "events", title: "Upcoming events", position: 40, enabled: true, settings: {} }, { key: "detail_of_month", title: "Detail of the Month", position: 60, enabled: true, settings: {} }, { key: "why_join", title: "Why join", position: 140, enabled: false, settings: {} }],
      venues: [{ id: "v1", slug: "le-man-cave", name: "Le Man Cave", town: "Norwich", county: "Norfolk", lat: 52.6309, lng: 1.2974, approximate: true, active: true }],
      community_highlights: [{ id: "c1", handle: "@norfolkseries", title: "Bringing a Series IIA back to life", posted_label: "3 days ago", image_path: "homepage/com-1.webp", sort: 0, active: true }],
      products: [{ id: "pr1", slug: "club-cap", name: "Cars and Coffee UK cap", price_pence: 2200, units_sold_30d: 40, image_path: "homepage/shop-cap.webp", active: true }],
      gallery_items: [{ id: "g1", slug: "dawn-run", title: "Dawn run", image_path: "homepage/com-3.webp", image_alt: "Classic cars", sort: 0, featured: true }],
      site_stats: [{ key: "members", label: "members", value: "1,240", is_sample: true }],
      directory_services: [{ id: 1, name: "Restoration", slug: "restoration", sort: 0 }],
      directory_regions: [{ id: 1, name: "Norwich", slug: "norwich", sort: 0 }],
      directory_listings: [{ id: "d1", slug: "coastline-detailing", name: "Coastline Detailing", services: ["Detailing"], town: "Norfolk", status: "published", featured: true, created_at: iso(now - day) }],
      sponsored_slots: [{ id: "s1", advertiser: "Sample advertiser", title: "Performance parts", starts_at: iso(now), ends_at: iso(now + 30 * day), status: "approved", impressions: 0, clicks: 0 }],
      newsletter_subscribers: [{ id: "n1", email: "fan@example.com", source: "homepage", created_at: iso(now - day), consent_text: "I'd like to receive emails…", unsubscribed_at: null }],
    },
  };
  const ok = (data, extra = {}) => Promise.resolve({ data, error: null, ...extra });
  function table(schema, name) {
    const rows = () => (db[schema][name] = db[schema][name] || []);
    let filters = [], single = false, head = false, countMode = null, op = "select", payload = null;
    const api = {
      select(_c, opts = {}) { if (opts.head) head = true; if (opts.count) countMode = opts.count; return api; },
      eq(k, v) { filters.push((r) => r[k] === v); return api; },
      gte(k, v) { filters.push((r) => (r[k] || "") >= v); return api; }, lt(k, v) { filters.push((r) => (r[k] || "") < v); return api; },
      order() { return api; }, limit() { return api; },
      maybeSingle() { single = true; return run(); }, single() { single = true; return run(); },
      insert(row) { op = "insert"; payload = row; return api; },
      update(row) { op = "update"; payload = row; return api; },
      delete() { op = "delete"; return api; },
      then(res, rej) { return run().then(res, rej); },
    };
    function run() {
      let list = rows().filter((r) => filters.every((f) => f(r)));
      if (op === "insert") { const r = { id: "new" + Math.random().toString(36).slice(2, 7), updated_at: new Date().toISOString(), ...payload }; rows().unshift(r); list = [r]; }
      if (op === "update") list.forEach((r) => Object.assign(r, payload, { updated_at: new Date().toISOString() }));
      if (op === "delete") { db[schema][name] = rows().filter((r) => !list.includes(r)); return ok(null); }
      if (head) return ok(null, { count: list.length });
      return ok(single ? list[0] || null : list);
    }
    return api;
  }
  const signedIn = scenario !== "signedout";
  return {
    auth: {
      getSession: () => ok({ session: signedIn ? { user: { id: uid, email: "justin@broadlanddigital.co.uk" } } : null }),
      signInWithOAuth: () => ok({}), signInWithOtp: () => ok({}), signOut: () => { location.search = "?mock=signedout"; return ok({}); },
    },
    from: (t) => table("public", t),
    storage: { from: () => ({ upload: () => ok({ path: "x" }), getPublicUrl: (p) => ({ data: { publicUrl: "https://auth.carsandcoffee.uk/storage/v1/object/public/site-images/" + p } }) }) },
    schema: (s) => ({ from: (t) => table(s, t) }),
    rpc: (name, args) => {
      const r = {
        admin_dashboard_stats: { reports_open: 1, posts_7d: 12, comments_7d: 30, pending_applications: 2, fast_track_waiting: 1, members: 1, new_members_7d: 1, emails_queued: 0, emails_failed: 1, emails_sent_7d: 4, pages_published: 1, pages_draft: 1, newsletter_subscribers: 1, invites_7d: 1 },
        get_application_queue: [
          { id: "q1", full_name: "Ellie Watson", email: "ellie@example.com", location: "Wymondham, Norfolk", favourite_series: ["Restoration and builds"], car: "1985 Golf GTI", heard_about: "A friend or member", fast_track: true, status: "pending", waiting_hours: 3.2, recommender_name: "Justin Revell", recommender_handle: "caddyman", recommender_approved_count: 4, recommender_removed_count: 0 },
          { id: "q2", full_name: "Marcus Hill", email: "marcus@example.com", location: "Ipswich, Suffolk", favourite_series: ["F1"], car: null, heard_about: "Instagram", fast_track: false, status: "pending", waiting_hours: 19.5 },
        ],
        get_reports: [{ id: 1, created_at: iso(now - 3600e3), reason: "spam", details: "Selling stuff", status: "open", reporter_name: "Ellie Watson", post_id: "pp1", comment_id: null, content_body: "Cheap alloys, DM me!!", content_status: "visible", content_photos: [], author_id: "u9", author_name: "Spammy Sid", author_handle: "sid", report_count: 2 }],
        admin_list_members: [{ id: uid, email: "justin@broadlanddigital.co.uk", display_name: "Justin Revell", handle: "caddyman", status: "approved", role: "admin", is_private: false, can_recommend: true, approved_at: iso(now - 2 * day), created_at: iso(now - 2 * day), last_sign_in_at: iso(now - 600e3), recommended_count: 0 },
          { id: "u2", email: "sam@example.com", display_name: "Sam Taylor", handle: "sam_mgb", status: "approved", role: "member", is_private: true, can_recommend: true, approved_at: iso(now - day), created_at: iso(now - day), last_sign_in_at: iso(now - 7200e3), recommended_count: 2 }],
      }[name];
      return ok(r ?? null);
    },
  };
}
