// Test mode for checking screens without a real account: add ?mock=<scenario> to any club URL.
// Scenarios: signedout, apply, pending, fasttrack, moreinfo, rejected, reapply, banned, member, admin.
// Never used unless ?mock= is present; it touches no real data.
export function createMock(scenario) {
  const uid = "00000000-0000-0000-0000-000000000001";
  const now = Date.now(), day = 864e5;
  const signedIn = scenario !== "signedout";
  const profile = { id: uid, handle: null, display_name: "Sam Taylor", location: null, bio: null, status: "pending", role: "member", is_private: false, approved_at: null };
  let application = { id: "app-1", user_id: uid, full_name: "Sam Taylor", location: "Norwich, Norfolk", favourite_series: ["Classic cars", "Track days"], car: "1972 MGB GT", heard_about: "A Cars and Coffee meet", invite_code_used: null, fast_track: false, guidelines_accepted: true, newsletter_opt_in: true, status: "pending", message_to_applicant: null, decided_at: null, created_at: new Date(now - 5 * 3600e3).toISOString() };
  switch (scenario) {
    case "apply": application = null; break;
    case "fasttrack": application.fast_track = true; break;
    case "moreinfo": application.status = "more_info"; application.message_to_applicant = "Thanks Sam! Could you tell us a bit more about your MGB, and which meets you've been to?"; break;
    case "rejected": application.status = "rejected"; application.decided_at = new Date(now - 10 * day).toISOString(); application.message_to_applicant = "We couldn't verify your details this time."; break;
    case "reapply": application.status = "rejected"; application.decided_at = new Date(now - 95 * day).toISOString(); break;
    case "banned": profile.status = "banned"; break;
    case "member": Object.assign(profile, { status: "approved", handle: "sam_mgb", location: "Norwich, Norfolk", approved_at: new Date(now - 2 * day).toISOString() }); application.status = "approved"; break;
    case "admin": Object.assign(profile, { status: "approved", role: "admin", handle: "justin", display_name: "Justin", approved_at: new Date(now - 30 * day).toISOString() }); break;
  }
  const queue = [
    { id: "q1", full_name: "Ellie Watson", email: "ellie@example.com", location: "Wymondham, Norfolk", favourite_series: ["Restoration and builds", "Classic cars"], car: "1985 Golf GTI", heard_about: "A friend or member", fast_track: true, status: "pending", waiting_hours: 3.2, recommender_name: "Sam Taylor", recommender_handle: "sam_mgb", recommender_approved_count: 4, recommender_removed_count: 0 },
    { id: "q2", full_name: "Marcus Hill", email: "marcus@example.com", location: "Ipswich, Suffolk", favourite_series: ["F1", "Sim racing"], car: null, heard_about: "Instagram", fast_track: false, status: "pending", waiting_hours: 19.5 },
    { id: "q3", full_name: "Priya Shah", email: "priya@example.com", location: "Cromer, Norfolk", favourite_series: ["Track days"], car: "Toyota GR86", heard_about: "Google search", fast_track: false, status: "more_info", waiting_hours: 40 },
  ];
  const allow = [{ email: "justin@broadlanddigital.co.uk", note: "Owner – first admin" }, { email: "jusrev@gmail.com", note: "Owner – Google sign-in (admin)" }];
  const settings = { signups_open: false };
  const cars = [{ id: "car1", owner_id: uid, make: "MG", model: "MGB GT", year: 1972, nickname: "Bluebell", colour: "Teal blue", engine: "1.8 B-series", usage: "classic", description: "Bought from a barn in Holt in 2019. Three summers of weekends later she's on the road.", mods: "Electronic ignition\nStainless exhaust", photo_paths: [], sort: 0 }];
  const tables = { garage_cars: () => cars, profiles: () => profile, applications: () => application, signup_allowlist: () => allow, settings: () => ({ value: settings.signups_open }) };
  const ok = (data) => Promise.resolve({ data, error: null });
  function q(table) {
    const api = {
      select: () => api, eq: () => api, order: () => api, then: (res, rej) => ok(tables[table]()).then(res, rej),
      maybeSingle: () => { const v = tables[table](); return ok(Array.isArray(v) && table === "garage_cars" ? v[0] : v); }, single: () => ok(tables[table]()),
      insert: (row) => { if (table === "applications") application = { ...application, ...row, id: "app-1", status: "pending", created_at: new Date().toISOString() }; else allow.unshift(row); return ok(null); },
      update: (row) => { if (table === "applications") Object.assign(application, row, { status: application.status === "more_info" ? "pending" : application.status }); if (table === "profiles") Object.assign(profile, row); if (table === "settings") settings.signups_open = row.value; return { eq: () => ok(null) }; },
      delete: () => ({ eq: () => ok(null) }),
    };
    return api;
  }
  const rpcs = {
    get_my_membership: () => [{ invite_code: "a1b2c3d4", can_recommend: true, status: profile.status, role: profile.role, is_private: profile.is_private, recommendations_last_30_days: 3, recommendation_limit: 10 }],
    get_my_recommendations: () => [{ first_name: "Ellie", status: "pending", applied_at: new Date(now - 3 * 3600e3).toISOString() }, { first_name: "Tom", status: "approved", applied_at: new Date(now - 9 * day).toISOString() }],
    get_application_queue: () => queue,
    get_profile: () => [{ id: uid, handle: "sam_mgb", display_name: "Sam Taylor", avatar_path: null, bio: "Classic MG owner from Norwich.", location: "Norwich, Norfolk", instagram: "sam_mgb", approved_at: new Date(now - 30 * day).toISOString(), is_private: false, can_see: true, friendship: scenario === "member" ? "none" : "friends", friend_count: 3, car_count: 1, is_me: false }],
    get_my_friends: () => [{ user_id: "u2", handle: "ellie_gti", display_name: "Ellie Watson", avatar_path: null, location: "Wymondham, Norfolk", state: "incoming" }, { user_id: "u3", handle: "tom_rs", display_name: "Tom Reed", avatar_path: null, location: "Ipswich, Suffolk", state: "friend" }],
    send_friend_request: () => "requested", respond_friend_request: () => null, remove_friend: () => null,
    decide_application: () => null,
    get_my_invites: () => [{ friend_name: "Dan", email: "dan@example.com", sent_at: new Date(now - day).toISOString(), joined: false }],
    send_member_invite: () => ({ status: "sent", message: "Invite sent." }),
  };
  return {
    auth: {
      getSession: () => ok({ session: signedIn ? { user: { id: uid, email: "sam@example.com", user_metadata: { full_name: "Sam Taylor" } } } : null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: () => ok({}), signInWithOAuth: () => ok({}), signOut: () => ok({}),
    },
    from: q,
    rpc: (name) => ok(rpcs[name] ? rpcs[name]() : null),
  };
}
