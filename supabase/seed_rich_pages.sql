-- Starter content for event, news and guide pages. Edit in admin.carsandcoffee.uk.
update site.events set
  summary = 'Our monthly breakfast meet: coffee, bacon rolls and a car park full of everything from daily drivers to concours classics.',
  body_html = $h$<p>The Norfolk Breakfast Meet is the easiest way to try Cars and Coffee. Turn up, grab a coffee and a bacon roll, and wander the line-up. There's no theme and no entry fee: classics, hot hatches, supercars and project cars all park side by side.</p><h2>Who it's for</h2><p>Anyone who likes cars. Bring what you drive, or come along just to look. Families and first-timers are very welcome, and our marshals are happy to point you in the right direction.</p><h2>Display parking</h2><p>Display parking opens at 7:30 and fills up by about 8:30. If you'd like to show your car, arrive early and follow the marshals. Visitor parking is signed separately.</p><blockquote>Please arrive and leave quietly. No revving, no wheelspin. It's how we keep the venue.</blockquote>$h$,
  schedule = array['07:30 Display parking opens','08:00 Coffee and breakfast served','09:30 Club photo by the entrance','11:00 Meet winds down'],
  what_to_bring = array['A warm layer: mornings can be cold','Cash or card for breakfast','Your phone or camera','Your free RSVP'],
  accessibility = 'Step-free access across the main car park. Toilets on site. Blue-badge parking next to the café; ask a marshal on arrival.',
  meta_description = 'Free monthly breakfast car meet in Norfolk. Coffee, bacon rolls and every kind of car. Display parking from 7:30am. RSVP for free.'
where slug = 'norfolk-breakfast-meet-dec-2026';

update site.events set
  summary = 'Our Christmas meet: mince pies, festive lights and a charity raffle, with a prize for the best-dressed car.',
  body_html = $h$<p>Our last meet of the year, with a festive twist. Expect mince pies, hot chocolate and a charity raffle, plus a prize for the best-dressed car. Tinsel optional but encouraged.</p><h2>Tickets</h2><p>Tickets are £5 and every penny of ticket income above costs goes to our chosen local charity. Display spaces are limited, so please book ahead.</p><h2>Best-dressed car</h2><p>Members vote for their favourite on the day. The winner gets a detailing voucher from one of our partners and a spot in the January newsletter.</p>$h$,
  schedule = array['08:00 Display parking opens','08:30 Mince pies and hot drinks','10:30 Best-dressed car vote','11:15 Raffle draw','12:00 Meet closes'],
  what_to_bring = array['Your ticket on your phone','Something festive for the car (optional)','Cash for the raffle','A warm coat'],
  accessibility = 'Step-free access across the main car park. Toilets on site. Blue-badge parking next to the café.',
  meta_description = 'Festive Cars and Coffee meet in Norfolk: mince pies, a charity raffle and a best-dressed car prize. Tickets £5.'
where slug = 'festive-cars-and-coffee-2026';

update site.events set
  summary = 'Blow away the cobwebs with a guided run along the North Norfolk coast, finishing with lunch.',
  body_html = $h$<p>Start the year the right way: a relaxed guided run along the North Norfolk coast, with quiet lanes, sea views and a lunch stop at the end. It's a run, not a race, and the pace is set for classics.</p><h2>The route</h2><p>Around 60 miles over roughly two and a half hours, with a coffee stop halfway. You'll get route notes and a GPX file by email the week before. We run in small groups with a lead and sweep car.</p><h2>Who can join</h2><p>The run is open to classics and modern classics, generally 25 years old or more. If you're not sure your car counts, get in touch and ask. We say yes more often than not.</p>$h$,
  schedule = array['09:00 Meet and briefing','09:30 First group leaves','11:00 Coffee stop','12:30 Lunch at the finish'],
  what_to_bring = array['A full tank of fuel','Your ticket and driver briefing email','Phone mount for the route notes','Valid insurance, tax and MOT'],
  accessibility = 'The start and lunch venues have step-free access and toilets. Let us know about any access needs when you book.',
  meta_description = 'New Year''s Day classic car run along the North Norfolk coast. Around 60 miles of quiet lanes with lunch at the finish.'
where slug = 'new-years-day-classic-run-2027';

update site.events set
  summary = 'An evening in the workshop with the team at Riverside Performance, with three restorations in progress and a Q&A.',
  body_html = $h$<p>Go behind the scenes at Riverside Performance for an evening of restoration talk. The team will walk you through three cars at different stages, from bare shell to final fettling, and answer your questions.</p><h2>What you'll see</h2><ul><li>A full bare-metal restoration in progress</li><li>Engine rebuild and carburettor set-up</li><li>Paint and finishing: what makes a concours finish</li></ul><p>Places are limited to keep groups small. Drinks and snacks are included in the ticket.</p>$h$,
  schedule = array['18:00 Doors open, drinks','18:30 Workshop tour in small groups','19:45 Q&A with the team','20:30 Close'],
  what_to_bring = array['Your ticket','Sensible shoes (it is a working workshop)','Your questions'],
  accessibility = 'Ground-floor workshop with step-free access. Please tell us about access needs when you book.',
  meta_description = 'Garage Night at Riverside Performance, Suffolk: a behind-the-scenes restoration evening with workshop tours and Q&A.'
where slug = 'garage-night-restoration-special-2027';

update site.events set
  summary = 'Members take to the simulators for a friendly race night, with timed qualifying, heats and a grand final.',
  body_html = $h$<p>Our monthly members' race night at Le Man Cave. Everyone gets timed qualifying, then heats and a grand final. Total beginners are welcome; the staff will get you set up.</p><h2>Format</h2><p>Qualifying sets the grid for the heats. The fastest drivers go through to the grand final, and there's a separate prize for the most improved driver.</p>$h$,
  schedule = array['19:00 Arrive and practise','19:30 Timed qualifying','20:15 Heats','21:15 Grand final and prizes'],
  what_to_bring = array['Your members'' ticket','Flat shoes for the pedals'],
  accessibility = 'Step-free access. Accessible toilet on site.',
  meta_description = 'Members'' sim race night at Le Man Cave, Norwich: qualifying, heats and a grand final. Beginners welcome.'
where slug = 'members-race-night-dec-2026';

update site.events set
  summary = 'Watch the start of the Le Mans 24 Hours on the big screens with fellow fans, plus sim challenges throughout.',
  body_html = $h$<p>Join us at Le Man Cave to watch the start of the 95th Le Mans 24 Hours on the big screens. Expect a proper race-day atmosphere, food and drink, and sim challenges on the Le Mans circuit throughout the afternoon.</p><h2>Sim challenge</h2><p>Set your best lap around La Sarthe. The fastest lap of the day wins a prize from our partners.</p>$h$,
  schedule = array['13:00 Doors open','15:00 Race start on the big screens','16:00 Sim challenge opens','20:00 Fastest lap prize'],
  what_to_bring = array['Your ticket','Your team colours'],
  accessibility = 'Step-free access. Accessible toilet on site.',
  meta_description = 'Le Mans 24 Hours watch party at Le Man Cave, Norwich. Big screens, food and a Le Mans sim challenge.'
where slug = 'le-mans-24-hours-watch-party-2027';

update site.articles set author = 'Cars and Coffee team', body_html = $h$<p>When this Mk1 Golf GTI rolled into the workshop it had been off the road for over a decade. The shell was solid in places and very much not in others, and the engine hadn't turned over since the early 2010s.</p><h2>Starting with the shell</h2><p>The first job was an honest assessment. Sills, floor pans and the rear valance all needed new metal, and the owner decided early on to do it properly rather than patch it.</p><h2>Back on the road</h2><p>Eighteen months later the GTI made its first appearance at our breakfast meet, and it drew a crowd all morning. The owner's advice to anyone thinking about a restoration: budget for the shell first, and everything else second.</p>$h$ where slug = 'mk1-gti-new-life';
update site.articles set author = 'Cars and Coffee team', body_html = $h$<p>The dates for the 95th running of the Le Mans 24 Hours have been confirmed, and race week will follow its familiar pattern of scrutineering, test day and qualifying before the race itself.</p><h2>Watching with us</h2><p>We'll be hosting a watch party at Le Man Cave in Norwich for the start of the race, with big screens and a sim challenge on the circuit. Tickets are on sale now.</p>$h$ where slug = 'le-mans-2027-dates';
update site.articles set author = 'Cars and Coffee team', body_html = $h$<p>Behind every classic at a Sunday meet is someone who keeps it running: owners, specialists and the friends who lend a hand on cold Saturday mornings.</p><p>We spoke to members across Norfolk and Suffolk about what keeps them going, from sourcing parts for cars that went out of production fifty years ago to passing skills on to the next generation.</p>$h$ where slug = 'british-classics-on-the-road';
update site.articles set author = 'Cars and Coffee team', body_html = $h$<p>It's one of the oldest debates in the classic car world: keep the original carburettors, or convert to fuel injection?</p><h2>The case for carburettors</h2><p>Originality, simplicity and the sound. A well set-up carburettor is reliable and easy to work on at the roadside.</p><h2>The case for injection</h2><p>Easier cold starts, better economy and smoother running in modern traffic. Modern aftermarket systems can be well hidden too.</p><p>The right answer depends on how you use the car. Talk to a specialist before you decide.</p>$h$ where slug = 'carburettors-vs-injection';
update site.articles set author = 'Cars and Coffee team', body_html = $h$<p>Laying up a classic for winter? A few simple jobs now will save you trouble in spring.</p><ol><li><strong>Fill the tank</strong> to reduce condensation, and consider a fuel stabiliser.</li><li><strong>Change the oil</strong> so old, acidic oil isn't sitting in the engine all winter.</li><li><strong>Look after the battery</strong> with a smart charger or by disconnecting it.</li><li><strong>Protect the tyres</strong> by raising the pressures slightly or moving the car now and then.</li><li><strong>Keep it dry and ventilated</strong> with a breathable cover rather than a plastic sheet.</li></ol>$h$ where slug = 'winter-lay-up-checks';

insert into site.guides (slug, title, intro, image_path, image_alt, read_minutes, sort, meta_title, meta_description, status, body_html) values
('your-first-car-meet', 'Your first car meet: what to expect',
 'Never been to a car meet before? Here''s everything you need to know, from where to park to what to bring.',
 'homepage/ev-breakfast.webp', 'Cars lined up at a morning car meet', 5, 10,
 'Your first car meet: a beginner''s guide | Cars and Coffee UK',
 'Going to your first car meet? Our beginner''s guide covers when to arrive, where to park, meet etiquette, what to bring and how to leave.',
 'published',
 $h$<p>Car meets are some of the friendliest events going. Nobody cares what you drive or how much you know. If you like cars, you'll fit right in. This guide covers everything you need for your first one.</p>
<h2>Do I need a special car?</h2><p>No. You can come along in whatever you drive, or arrive on foot and just look. Most of our meets have separate display and visitor parking, so there's no pressure to show your car.</p>
<h2>Finding a meet</h2><p>Our <a href="/events">events page</a> lists every upcoming meet. Breakfast meets are the best place to start: they're free, relaxed and usually over by late morning. Most need a quick free RSVP so we can plan parking.</p>
<h2>When to arrive</h2><p>If you'd like to display your car, arrive when display parking opens, as the best spots go early. If you're just visiting, any time during the meet is fine. Mid-morning is usually busiest.</p>
<h2>Parking</h2><ul><li>Follow the marshals. They'll show you where to go.</li><li>Display cars park in the display area; everyone else uses visitor parking.</li><li>Keep entrances, exits and pavements clear.</li><li>Drive slowly on site. There are people, children and dogs everywhere.</li></ul>
<h2>Meet etiquette</h2><ul><li><strong>Look, don't touch.</strong> Never lean on, touch or open someone's car without asking.</li><li><strong>Talk to owners.</strong> Most people love talking about their car. Just ask.</li><li><strong>Ask before photographing people</strong> or close-ups of number plates.</li><li><strong>Keep children and dogs close</strong> around moving cars.</li><li><strong>Take your rubbish home</strong> or use the bins.</li></ul>
<h2>What to bring</h2><ul><li>A warm layer. Morning meets can be cold, even in summer.</li><li>Cash or card for coffee and food.</li><li>Your phone or camera.</li><li>Your RSVP or ticket, if the event needs one.</li></ul>
<h2>Leaving</h2><blockquote>No revving, no wheelspin, no burnouts. How we leave decides whether we're welcome back.</blockquote><p>Venues let us use their space because we look after it. Leave slowly and quietly, and save the spirited driving for a track day.</p>
<h2>Accessibility and families</h2><p>Each event page lists step-free access, toilets and blue-badge parking where available. Our morning meets are family-friendly. If you have a question about access, get in touch before the day and we'll help.</p>
<h2>Ready to go?</h2><p>Find your nearest meet on the <a href="/events">events page</a> or browse <a href="/car-meets">car meets by town</a>. See you there.</p>$h$)
on conflict (slug) do nothing;
