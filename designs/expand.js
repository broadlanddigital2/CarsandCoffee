// ===== Expanded content (Claude, 22 Nov 2026) =====
// Richer sections for the pages that were short of content. Uses the same helpers and photos as above.
const stats=(items)=>'<div class="stats">'+items.map(([n,l])=>'<div class="stat"><strong>'+n+'</strong><span>'+l+'</span></div>').join('')+'</div>';
const steps=(items)=>'<ol class="steps">'+items.map(([h,p])=>'<li><h3>'+h+'</h3><p>'+p+'</p></li>').join('')+'</ol>';
const tiles=(items)=>'<div class="tiles">'+items.map(([h,p,id])=>'<a class="tile" href="#'+id+'"><strong>'+h+'</strong><span>'+p+'</span></a>').join('')+'</div>';
const quote=(q,who)=>'<figure class="quote"><blockquote>'+q+'</blockquote><figcaption>'+who+'</figcaption></figure>';
const list=(items)=>'<ul class="ticks">'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
const prose=(paras)=>'<div class="prose">'+paras.map(p=>'<p>'+p+'</p>').join('')+'</div>';
const note='<p class="meta sample">Sample content for design review. Venues, figures and quotes are illustrative until confirmed.</p>';

const venues=[['meet','The Workshop breakfast meet','First Sunday of the month · 08:00–11:00 · Free',2,'Monthly'],['club','Le Man Cave race night','Selected Thursdays · 19:00–22:00 · Ticketed',25,'Race night'],['garage','Garage night at a local specialist','Seasonal · 18:00–21:00 · Ticketed',2,'Garage night']];
const drives=[['drive','North Norfolk coast','Cromer to Wells-next-the-Sea along the A149, with flint villages and sea views.',14,'About 25 miles'],['lineup','The Broads loop','Through Wroxham and Horning, then back on quiet B-roads.',14,'About 30 miles'],['race','Thetford Forest and the Brecks','Pine forest and open heath south-west of Norwich, past Snetterton.',14,'About 40 miles']];
const clubs=[['club','Classic and vintage owners','Monthly runs and garage visits for older cars.',12,'Club'],['livery','Track day regulars','Car sharing, set-up advice and Snetterton dates.',12,'Hub'],['garage','Restoration and builds','Project threads, parts swaps and workshop help.',12,'Hub']];
const placeFaq=(name)=>faqs([
 ['Are car meets in '+name+' free?','Most of our breakfast meets are free to attend; we ask you to RSVP so we can plan parking. Tours, garage nights and race nights are ticketed, and the price is on each event.'],
 ['Do I need a special car to come along?','No. Classics, modern performance cars, track cars and daily drivers are all welcome, and so are people who come without a car to look around.'],
 ['Where do I park?','Each event page explains where display cars and visitors should park. Arrive within the arrival window and follow the marshals.'],
 ['Are meets family-friendly?','Yes. Our morning meets are relaxed and suitable for all ages. Please keep children close around moving cars.'],
 ['What time should I arrive?','For breakfast meets, the first hour is the busiest for arrivals. Check the event page for the opening time and any display-car slots.'],
 ['How do I hear about new meets near '+name+'?','Join the newsletter or the Cars and Coffee club and follow the '+(name==='Norfolk'?'Norfolk':'local')+' hub. New dates are posted there first.']]);

const placeData={
 Norfolk:{type:'county',label:'Norfolk · Car meets',lead:'Norfolk has car meets most weekends, from breakfast meets on the edge of Norwich to evening race nights and coastal tours. This page brings together every Cars and Coffee event in the county, the venues that host them, and the best drives and businesses to know.',
  stats:[['Sundays','Most breakfast meets'],['12+','Towns with meets nearby'],['Snetterton','The county\'s race circuit'],['Free','Most morning meets']],
  scene:['Norfolk has a long relationship with fast cars. Lotus has built cars at Hethel, south-west of Norwich, for decades, and Snetterton Circuit near Thetford hosts the British Touring Car Championship, club racing and track days through the season.','Away from the circuit, the county is made for weekend drives: the North Norfolk coast road, the lanes around the Broads and the long straight roads through Thetford Forest. Classic owners, modern performance fans and restorers all have a home here.','Our meets started in Norfolk, and most of them still happen here. Expect a relaxed crowd, a good coffee and a line-up that changes every month.'],
  towns:[['meet','Norwich','City meets, workshop nights and weekend drives.',8],['drive','King\'s Lynn','Coastal routes and classic-car gatherings.',8],['lineup','Thetford','Drives through the Brecks, close to Snetterton.',8],['race','Great Yarmouth','Seafront cruises and summer meets.',8],['golf','Cromer','The start of the North Norfolk coast road.',8],['garage','Dereham','Mid-Norfolk meets and specialist workshops.',8]],
  more:['Wymondham','Fakenham','Swaffham','Holt','Diss','North Walsham','Aylsham','Sheringham','Downham Market','Hunstanton','Watton','Attleborough']},
 Norwich:{type:'town',label:'Norfolk · Norwich',lead:'Looking for car meets in Norwich? Cars and Coffee UK runs breakfast meets, garage nights and race nights in and around the city, with free morning meets most months. Here is what\'s coming up, where we meet and what to expect.',
  stats:[['Monthly','Breakfast meet'],['About 10 miles','To Lotus at Hethel'],['About 25 miles','To Snetterton Circuit'],['Free','Morning meets']],
  scene:['Norwich is the centre of the Norfolk car scene. Within half an hour you can be on the coast, in the Broads or at Snetterton, and the city has a strong mix of specialists: restorers, detailers, wrap and livery shops, and independent garages.','Our Norwich meets are relaxed mornings with a coffee, a walk along the line-up and plenty of conversation. Evening events at Le Man Cave add sim racing and Scalextric to the mix.','If you\'re new to the area or new to car meets, Norwich is the easiest place to start: most events are a short drive from the ring road and parking is planned in advance.'],
  towns:[['drive','Wymondham','A short hop south-west on the A11.',8],['lineup','Aylsham','Market-town meets to the north.',8],['meet','North Walsham','Towards the coast and the Broads.',8]],
  more:['Wroxham and Hoveton','Acle','Loddon','Reepham','Dereham','Attleborough']}};

const placePage=(name)=>{const d=placeData[name];return title('Car meets in '+name,d.lead,'meet',d.label)
 +section('At a glance',stats(d.stats)+note)
 +section('Upcoming events in and near '+name,cards(events)+'<p class="actions">'+button(1,'See all events')+button(1,'Add a date to your calendar',true)+'</p>')
 +section('Regular meets and venues','<p>These happen regularly. Dates and booking details are on each event page.</p>'+cards(venues))
 +section('The '+name+' car scene',split(prose(d.scene),panel('<h3>Popular here</h3>'+chips([['Classic cars',10],['Track days',10],['Detailing and wraps',10],['Sim racing',25],['Restoration and builds',10]])+'<h3>Useful guides</h3>'+chips([['Your first car meet',14],['Before you buy a classic',14],['Photographing cars at a meet',14]]))))
 +section('Best drives from '+name,'<p>Three favourite routes for a weekend run. Drive to the conditions and respect the villages you pass through.</p>'+cards(drives))
 +section('What to expect at a meet',split(steps([['Arrive and park','Display cars and visitors usually park separately. Follow the marshals and keep entrances clear.'],['Walk the line-up','Take your time, ask owners about their cars and ask before photographing people or number plates.'],['Leave quietly','No revving, no wheelspin. How we leave decides whether we are welcome back.']]),panel('<h3>Bring with you</h3>'+list(['A warm layer: mornings can be cold','Your phone or camera','Cash or card for coffee and food','Your RSVP or ticket, if the event needs one'])+'<h3>Accessibility</h3><p>Each event page lists step-free access, toilets and blue-badge parking where available.</p>')))
 +section('Clubs and hubs near '+name,cards(clubs)+'<p>'+button(12,'Join the Cars and Coffee club')+'</p>')
 +section('Trusted local businesses','<p>Restorers, detailers, wrap shops and garages in and around '+name+', checked by our team.</p>'+cards(businesses)+'<p class="actions">'+button(17,'Browse the '+name+' directory',true)+button(19,'List your business',true)+'</p>')
 +section(d.type==='county'?'Car meets by town in Norfolk':'Nearby towns',cards(d.towns)+'<h3>More places</h3>'+chips(d.more.map(t=>[t,8])))
 +section('Getting to meets in '+name,split(panel('<h3>By car</h3><p>Most venues are within 20 minutes of the Norwich ring road (A1074, A140, A147). The A11 links Norwich with Thetford and Snetterton, and the A47 runs east–west across the county.</p>'),panel('<h3>Without a car</h3><p>Some venues are on bus routes from Norwich city centre. Event pages show the nearest stop and station where there is one, and members often share lifts in the club.</p>'),true))
 +section('Frequently asked questions',placeFaq(name))
 +section('',newsletter);};
pages[6]=()=>placePage('Norfolk');
pages[7]=()=>placePage('Norwich');

pages[5]=()=>title('Car meets near you','Find car meets, drives and venues across Norfolk and Suffolk, with Cambridgeshire and Essex coming soon.','meet','Locations')
 +section('Choose a county',split(cards(places),'<div class="map">King\'s Lynn · Cromer · Norwich · Great Yarmouth<br>NORFOLK<br>Thetford · Diss · Lowestoft<br>SUFFOLK<br>Bury St Edmunds · Ipswich · Felixstowe<br><small>Area map (illustrative)</small></div>'))
 +section('Norfolk towns',chips(['Norwich','King\'s Lynn','Great Yarmouth','Thetford','Cromer','Dereham','Wymondham','Fakenham','Swaffham','Holt','Diss','North Walsham','Aylsham','Sheringham','Hunstanton','Downham Market'].map(t=>[t,8])))
 +section('Suffolk towns',chips(['Ipswich','Bury St Edmunds','Lowestoft','Felixstowe','Stowmarket','Sudbury','Woodbridge','Beccles','Southwold','Newmarket'].map(t=>[t,8])))
 +section('Coming soon','<p>We\'re growing across East Anglia. Cambridgeshire and Essex pages will follow once our Norfolk and Suffolk meets are established.</p>'+chips([['Cambridgeshire',6],['Essex',6]]))
 +section('Next meets',cards(events))
 +section('How our meets work',steps([['Find a meet','Pick a date near you on this page or the events calendar.'],['RSVP or book','Most morning meets are free; we ask you to RSVP so we can plan parking.'],['Turn up and enjoy','Coffee, cars and conversation. Bring what you drive.']]))
 +section('Frequently asked questions',placeFaq('East Anglia'));

const sectorList=[['race','F1','Race weekends, results and tech.',10],['livery','Endurance and Le Mans','WEC, Le Mans and long-distance racing.',10],['race','BTCC and touring cars','Tin-top racing, including at Snetterton.',10],['drive','Rally','Forest stages and the WRC.',10],['circuit','MotoGP and bikes','Two wheels, all the way.',10],['club','Karting','Indoor, outdoor and club karting.',10],['garage','Classic cars','Ownership, restoration and runs.',10],['golf','Modern performance','Hot hatches to supercars.',10],['detail','JDM','Japanese performance and imports.',10],['lineup','American','Muscle cars, trucks and more.',10],['drive','EV and hybrid','Electric performance and ownership.',10],['race','Track days','Preparation, set-up and circuit dates.',10],['club','Sim racing','Rigs, leagues and race nights.',10],['detail','Detailing and wraps','Paint, ceramics, wraps and liveries.',10],['garage','Restoration and builds','Project stories and workshop help.',10]];
pages[8]=()=>title('Car interests','Every car scene has its own events, stories, businesses and people. Pick yours.')
 +section('Motorsport',cards(sectorList.slice(0,6)))
 +section('Cars',cards(sectorList.slice(6,11)))
 +section('Activities',cards(sectorList.slice(11)))
 +section('Each interest has a hub in the club','<p>Members talk, share photos and plan meet-ups in 17 hubs. Join the ones you\'re into and their posts appear in your feed.</p>'+button(12,'Explore the hubs'))
 +section('Popular guides',cards(guides));

pages[9]=()=>title('Classic cars','Restorations, weekend drives and a community of owners keeping older cars on the road across Norfolk and Suffolk.','garage','Car interests')
 +section('',split(prose(['Classic cars are at the heart of Cars and Coffee. At most meets you\'ll find everything from 1960s British sports cars to 1980s hot hatches and 1990s modern classics.','This page brings together classic-car events, owner stories and guides, the specialists who keep these cars running, and the members who love them.']),panel('<h3>At a glance</h3>'+facts([['Club hub','Classic cars'],['Popular meets','Breakfast meets, coastal tours'],['Common questions','Buying, insurance, storage'],['Specialists','Restorers, trimmers, engine builders']]))))
 +section('Classic car events',cards(events))
 +section('Popular with owners',tiles([['1960s and 70s British','MG, Triumph, Jaguar and Lotus',10],['Air-cooled','Porsche 911, VW Beetle and Bus',10],['80s and 90s hot hatches','Golf GTI, Peugeot 205, Escort',10],['Modern classics','Cars from the 90s and 2000s',10]]))
 +section('Stories and guides',cards(news)+cards(guides))
 +section('Owning a classic',steps([['Buy carefully','Use our checklist and take someone with you. A specialist inspection is money well spent.'],['Insure it properly','Classic policies often cost less but may limit mileage and require secure storage.'],['Keep it running','Use it regularly, store it dry and find a specialist before you need one.']]))
 +section('Meet classic car owners',split(quote('The best part of a Sunday meet is someone telling you how their car came out of a barn.','Member, Norwich (sample quote)'),panel('<h3>Join the classic cars hub</h3><p>Share your project, ask for advice and plan runs with other owners.</p>'+button(12,'Join the hub'))))
 +section('Specialist businesses',cards(businesses))
 +section('Featured galleries',cards(galleries))
 +section('Classic car FAQs',faqs([['Can I bring a car that\'s mid-restoration?','Yes. Projects are always popular. Tell the marshals if it needs a quieter spot.'],['Is there a minimum age for a classic?','No. If you love it and it\'s interesting, bring it.'],['Do you run classic-only events?','Some tours and garage nights are themed. Check the events page.'],['Where can I get my classic serviced?','See the specialists above or browse the directory by service.']]));

const audienceList=[['club','First-time attendees','An easy introduction to the meets.',12],['lineup','Families','Relaxed, welcoming events for all ages.',12],['livery','Car clubs','Bring your members together.',12],['drive','New drivers','Learn, meet people and find your first project.',12],['shop','Businesses','Reach local enthusiasts.',26]];
pages[10]=()=>title('Find your place at a meet','However you come to Cars and Coffee, there\'s a place for you. Advice for first-timers, families, clubs, new drivers and businesses.')
 +section('Who\'s coming?',cards(audienceList))
 +section('Everyone is welcome',split(prose(['You don\'t need a special car, a membership or any knowledge to come along. Most of our morning meets are free, and people come with everything from classics to daily drivers, or no car at all.','We ask everyone to follow the same simple rules: respect the venue, the neighbours and each other.']),panel('<h3>Our meet rules</h3>'+list(['Arrive and leave quietly','No revving, burnouts or racing','Ask before photographing people','Take your rubbish home']))))
 +section('Plan your visit',cards(guides));

pages[11]=()=>title('Your first Cars and Coffee meet','Never been to a car meet? Here\'s everything you need to know before you pull in, from parking to etiquette.','club','First-time attendees')
 +section('In short',stats([['Free','Most morning meets'],['2–3 hours','Typical meet length'],['Any car','Or no car at all'],['All ages','Family-friendly']])+note)
 +section('Before you set off',split(panel('<h3>Pick a meet</h3><p>Breakfast meets are the easiest first event: relaxed, free and in daylight. Find one near you on the events page.</p>'+button(1,'Find a meet',true)),panel('<h3>RSVP</h3><p>It helps us plan parking. If you\'re bringing a car to display, check the arrival window on the event page.</p>')))
 +section('On the day',steps([['Arrive','Follow signs and marshals. Display cars and visitors park separately.'],['Look around','Walk the line-up, grab a coffee, and say hello. Owners love talking about their cars.'],['Join in','Ask about the club, the next tour or a business recommendation. That\'s what it\'s for.']]))
 +section('Good first events',cards(events))
 +section('From a first-timer',quote('I turned up in my daily car feeling a bit out of place. Ten minutes later I was talking Golfs with three people.','Member, Wymondham (sample quote)'))
 +section('First-timer questions',faqs([['Will I be the only one who doesn\'t know anyone?','No. Lots of people come on their own. Look for a team member in a Cars and Coffee jacket.'],['Can I bring my children?','Yes. Morning meets are family-friendly. Keep little ones close around moving cars.'],['What if my car isn\'t special?','It doesn\'t matter. Park in visitor parking and enjoy the show.'],['Do I need to join the club?','No. The club is free and optional, for people who want to keep in touch between meets.']]))
 +section('Get ready',cards(guides))
 +section('',button(1,'Find your first meet'));

pages[12]=()=>title('Motoring guides','Practical advice from the workshop to the paddock: going to meets, buying and owning, track days and photography.')
 +section('Start here',split('<figure class="lead">'+image('lineup','Cars parked at a morning meet')+'</figure>',panel('<span class="eyebrow">Featured guide</span><h3>Your first car meet</h3><p>What to bring, where to park and how to get involved.</p>'+button(14,'Read the guide'))))
 +section('Browse by topic',tiles([['Going to meets','First visits, etiquette and photography',13],['Buying and owning','Checklists, insurance and storage',13],['Track days','Preparation, kit and your first session',13],['Detailing','Washing, protecting and maintaining paint',13],['Restoration','Planning a project and finding parts',13],['Motorsport','Getting to races and following the season',13]]))
 +section('Latest guides',cards(guides))
 +section('Popular this month',cards([guides[1],guides[2],guides[0]]))
 +section('',newsletter);

pages[17]=()=>title('Auto Opulence','Car valeting and detailing · Norwich','detail','Featured business · Checked by us')
 +section('About the business',split(prose(['Auto Opulence is a car valeting and detailing studio in Norwich, offering everything from maintenance washes to paint correction and ceramic coatings.','Their work on a 1970s BMW 3 Series was our Detail of the Month: deep interior clean, paint correction, engine bay detail and a ceramic coating on the original paint.'])+chips([['Detailing',16],['Paint correction',16],['Ceramic coating',16],['Norwich',8]]),panel('<h3>Contact and directions</h3>'+facts([['Area','Norwich, Norfolk'],['Opening hours','Shown when confirmed'],['Phone','Shown with permission'],['Website','autoopulence.co.uk']])+'<p class="actions">'+demo('Call')+'<a class="btn alt" href="https://autoopulence.co.uk">Visit website</a></p>')))
 +section('Services',tiles([['Maintenance valet','Regular care for a clean car',18],['Paint correction','Removes swirls and light scratches',18],['Ceramic coating','Long-lasting gloss and protection',18],['Interior detail','Deep clean of seats, carpets and trim',18]]))
 +section('Workshop gallery',galleryPhotos([['shop','Workshop'],['detail','Interior detail'],['garage','Workshop scene']]))
 +section('Member offer',panel('<h3>Cars and Coffee member offers coming soon</h3><p>Members will see partner offers here and in the club.</p>','dark'))
 +section('Location','<div class="map">Norwich · Norfolk<br>Map appears here<br><small>Exact address shown with the business\'s permission</small></div>')
 +section('Nearby businesses',cards(businesses.slice(1)))
 +section('',button(19,'Is this your business? Claim it',true));

pages[23]=()=>title('Our partners','Three Norfolk businesses help bring Cars and Coffee UK to life. Here\'s who they are and what they offer members.')
 +section('Partner features',cards(partners))
 +section('What partnership looks like',tiles([['Homepage features','Detail of the Month, Livery of the Week, Race Night',26],['Events together','Race nights, garage nights and meets',1],['Member offers','Exclusive offers in the club',12],['Content','Case studies and behind-the-scenes stories',3]]))
 +section('Become a partner',split('<p>We work with a small number of local businesses that share our values and make the community better. Partnership slots are limited.</p>',panel('<h3>Interested?</h3><p>Tell us about your business and we\'ll be in touch.</p>'+button(26,'Explore partnership formats'))));

pages[24]=()=>title('Race Car Graphics','Liveries, vehicle graphics and number kits, designed and fitted in Norwich.','livery','Partner')
 +section('About Race Car Graphics',split(prose(['Race Car Graphics designs and fits liveries, number kits, sponsor graphics and wraps for club racers, race teams and road cars.','They run our Livery of the Week, with a monthly design challenge for members.']),panel('<h3>Member offers</h3><p>Offer details will appear when confirmed.</p><a class="btn alt" href="https://racecargraphics.uk">Visit Race Car Graphics</a>')))
 +section('Livery of the week',split('<figure class="lead">'+image('livery','Blue and orange touring car')+'</figure>',panel('<h3>December challenge: retro endurance</h3><p>Design a livery inspired by classic endurance racing. The winner is featured on the homepage.</p>'+button(12,'Enter in the club'))))
 +section('What they do',tiles([['Race liveries','Full designs for race and track cars',25],['Number kits','Series-compliant numbers and graphics',25],['Sponsor graphics','Logos and decals for teams',25],['Road car wraps','Colour changes and accents',25]]))
 +section('Partner events',cards(events))
 +section('',button(26,'Become a partner'));

pages[25]=()=>title('Advertise with Cars and Coffee UK','Put your business in front of car owners, enthusiasts and clubs across Norfolk and Suffolk, online and at our meets.','club')
 +section('Our audience',stats([['Norfolk and Suffolk','Where our members live'],['Owners','Classic, modern and track'],['Weekly','Newsletter to subscribers'],['Monthly','Meets across the region']])+'<p>Figures will be added here once they\'re confirmed.</p>')
 +section('Advertising formats',cards(formats))
 +section('Launch rates','<table><thead><tr><th>Placement</th><th>Where it shows</th><th>Launch rate</th></tr></thead><tbody>'+formats.map(([,label,copy])=>'<tr><td>'+label+'</td><td>'+copy+'</td><td>Free during launch</td></tr>').join('')+'</tbody></table>')
 +section('How it works',steps([['Tell us your goal','More customers, event sign-ups or brand awareness.'],['Pick a format','We\'ll recommend the placement that fits your audience and budget.'],['Go live','We review every advert, then publish it and share the results.']]))
 +section('Advertising FAQs',faqs([['Is advertising really free at launch?','Yes. Launch placements are free while we grow. We\'ll give notice before paid rates start.'],['Who reviews adverts?','Our team checks every advert before it goes live.'],['Can I advertise at a meet?','Yes, through event sponsorship or a brand activation. See Services.']]))
 +section('Ready to start?',button(27,'Start a campaign'));

pages[27]=()=>title('Work with Cars and Coffee','We help venues, businesses and car clubs across East Anglia put on great car events.','club')
 +section('How we can help',cards([['meet','Host a meet','Welcome local enthusiasts to your venue.',30],['livery','Brand activations','Bring your product or service to a meet.',30],['race','Private and corporate events','Plan a car-focused event for your guests.',30],['lineup','Car club support','Bring your members together.',30],['detail','Content and photography','Capture the people, cars and details that tell the story.',30]]))
 +section('Why work with us',split(list(['A friendly, respectful crowd that venues invite back','Planning for parking, marshalling and arrivals','Promotion to our newsletter, website and club','Photography and stories after the event']),quote('Sample testimonial from a venue partner will appear here.','Venue partner (placeholder)')))
 +section('How it works',steps([['Tell us what you have in mind','The date, place and the kind of event you\'re picturing.'],['Plan it together','We agree the location, audience, format and logistics.'],['On the day','We run the meet with you, then share photos and results.']]))
 +section('Past events',cards(galleries))
 +section('Services FAQs',faqs([['Do you charge for hosting a meet?','It depends on the event. Tell us about yours and we\'ll explain the options.'],['How much notice do you need?','Ideally 6–8 weeks for a public meet, longer for larger events.'],['Can you bring cars to a corporate event?','Yes, through our members and partners, subject to availability.']]))
 +section('Discuss your event',button(30,'Get in touch'));

pages[28]=()=>title('About Cars and Coffee UK','We bring people together around cars, coffee and the stories in between. It started in Norfolk, and it\'s growing across East Anglia.','meet')
 +section('It started in Norfolk',split(prose(['Cars and Coffee UK began with a simple idea: a relaxed Sunday-morning meet where people could bring whatever they drive, grab a coffee and talk cars.','It grew into regular meets, tours and garage nights, a members\' club, motorsport news and a directory of trusted local businesses. The idea hasn\'t changed: friendly, welcoming and all about the people as much as the cars.']),'<figure class="lead">'+image('lineup','Cars lined up at an early meet')+'</figure>'))
 +section('What we do',tiles([['Meets and events','Breakfast meets, tours, garage nights and race nights',1],['News and guides','Motorsport, restoration and practical advice',3],['The club','A members\' community with hubs and garages',12],['The directory','Trusted local car businesses',15]]))
 +section('What matters to us',cards([['meet','All cars welcome','Classic, modern, track car or daily driver.',29],['club','Friendly and respectful','Good for visitors, venues and neighbours.',29],['drive','Local first','Built in Norfolk and Suffolk, for the people who live here.',29]]))
 +section('In numbers',stats([['2023','Sample founding year'],['48','Sample meets held'],['17','Club hubs'],['3','Local partners']])+note)
 +section('Our partners',cards(partners))
 +section('See you at the next meet','<p class="actions">'+button(1,'Find a meet')+button(12,'Join the community',true)+'</p>');
