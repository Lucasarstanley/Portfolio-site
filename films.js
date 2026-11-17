// Film list for the Work column, in the order it appears: the client films shipped work first, then the pitches,
// then a Short films section with the two personal films, then an Archive section with the rest.
// Fields: title, client, year, line (one sentence under the title), note (the longer paragraph), and status, a word
// or two on where the film stands (On air, Pitch, Unreleased, or what happened to it) shown after the year; leave it
// out when there is nothing to say. `section: 'Short films'` (or 'Archive') on a film starts a new section of the
// column with a heading; the films after it belong to that section until the next. `episodes` lists several films
// that share one entry: the thumbnail opens the first and the player offers the others. `public: false` keeps a
// film out of the build. Posters and web copies come from tools/cut_films.py.
export const FILMS = [
  { id: 'airbnb', public: true, title: 'Hotels, Now on Airbnb', client: 'Airbnb', year: '2026',
    line: 'Hotels, now on Airbnb.',
    note: 'A YouTube and connected-TV campaign announcing that Airbnb now does hotels as well as homes, built around what an Airbnb take on a hotel looks like and how that differs from everyone else\'s. Three films so far, for New York, Los Angeles and San Francisco, as a suite of assets with more planned for the year after.' },

  { id: 'andres-thai', public: true, title: 'Get Comfortable', client: 'Andrex', year: '2026', status: 'Pitch',
    line: 'Get comfortable.',
    note: 'A pitch film for Andrex, bringing the Get Comfortable platform to Thailand. It rests on kreng jai, the Thai instinct not to inconvenience anyone, which makes a long visit to the only toilet in a full house hard to enjoy. With a roll of Andrex, sold as Scott in Thailand, you take your time anyway.' },

  { id: 'nectar', public: true, title: 'Nectar', client: 'Nectar', year: '2026', status: 'Cannes winner',
    line: 'For your inner queen bee.',
    note: 'The winning film in a Cannes competition to bring a honey brand to life. Written, made and delivered in a five-hour sprint.' },

  { id: 'gren', public: true, title: 'Gren', client: 'Gren', year: '2025', status: 'Shown in Parliament',
    line: 'Blueprint for a greener city.',
    note: 'A brand film to introduce Gren to the UK, first shown in Parliament. It takes a complicated product and explains it warmly, as plans that bring warmth and life to a city, and it set the look and feel the brand has carried since.' },

  { id: 'insure-and-go', public: true, title: 'Ninety-Nine', client: 'Insure and Go', year: '2026', status: 'On air',
    line: 'Insure and Go have a lot of 99s to celebrate. Travel with them and you might start seeing it everywhere.',
    note: 'A hero TVC, on air. Made early in 2026 on indemnified tools only, which made production tricky.' },

  { id: 'moretti', public: true, title: 'Birra Moretti', client: 'Heineken', year: '2026', status: 'Pitch',
    line: 'Enjoy life\'s simple pleasures.',
    note: 'A hyper-localisation exercise: take the brand\'s simple-pleasures line and ask what it looks like in one market. In Berlin the lawnmowers are famously punctual, so this is a picnic on the first day of summer, timed to the minute.' },

  { id: 'desperados', public: true, title: 'Desperados', client: 'Heineken', year: '2026', status: 'Pitch',
    line: 'Guao Guao.',
    note: 'A localisation of the Guao Guao campaign for one of Heineken\'s growth markets. Every detail was chosen for Lagos: the calendar moment is the city\'s art festival, the bakery is named for pride in the family, the peacock carries the same meaning, the clothes come from Nigerian fashion houses and the cars are the ones on its streets.' },

  { id: 'captain', public: true, section: 'Short films', title: 'Captain Papodopolous', client: 'Personal', year: '2026', status: 'Competition winner',
    line: 'A photograph my granddad took as a young man, and the world around it.',
    note: 'A short film made for a competition, where it won the cinematography and narrative category and its £5,000 prize against more than 400 entries. It started with a photograph my granddad took when he was young, found in the attic, and imagines the world around it. My second go at true short filmmaking with AI. Some of the acting is wooden and a few shots give themselves away, which the latest tools could now fix. That\'s for the next film.' },

  { id: 'small-hotel', public: true, section: 'Short films', title: 'The Very Small Hotel', client: 'Personal', year: '2025',
    line: 'A hotel for very small people of exceptionally large talent.',
    note: 'Made early in 2025 to see how far AI video could be pushed on an actual story. The story holds. The acting and framing fought back, so there are inconsistencies, and the ending isn\'t the one I wanted.' },

  { id: 'apple', public: true, section: 'Archive', title: 'Ecosystems', client: 'Apple', year: '2025',
    poster: 'films/apple-ep1.jpg', video: 'films/apple-ep1.mp4',
    episodes: [{ id: 'apple-ep1', label: 'Episode 1' }, { id: 'apple-ep2', label: 'Episode 2' }, { id: 'apple-ep3', label: 'Episode 3' }, { id: 'apple-ep4', label: 'Episode 4' }],
    line: 'Ecosystems, in four episodes.',
    note: 'Onboarding films for Apple that bring their ecosystem to life, every day. Shot for real, written and directed by me.' },

  { id: 'spudos', public: true, title: 'Spudos', client: 'Viewpoint', year: '2026', status: 'Live stunt',
    line: 'You do the dressing.',
    note: 'A live stunt at Viewpoint. The audience picked a brand from Dragon\'s Den at random and a room of creatives, editors, designers and prompters, led by me and running my workflow, built it a campaign in a day. Spudos are crisps with no flavouring, so they\'re naked. Six hours, in front of clients, alongside out of home and activations for the same brand.' },

  { id: 'moodlings', public: true, title: 'Moodlings', client: 'SXSW', year: '2025', status: 'Made live at SXSW',
    line: 'Chew your mood.',
    note: 'Made at SXSW to show what AI makes possible. I led a team of creatives, prompters and editors who took a brand from nothing to this in a day. One of the most talked-about sessions of the week, and Google used the film as a hero demonstration when they released Veo 3.' },

  { id: 'orbite', public: true, title: 'Orbite', client: 'Orbite', year: '2025',
    line: 'Train for space.',
    note: 'Orbite prepare people for spaceflight. This is the film they show prospective clients, built around the euphoria, the excitement and the sheer difficulty of going.' },

  { id: 'iga', public: true, title: 'Google App', client: 'Google', year: '2025',
    line: 'Find answers anywhere.',
    note: 'With the Google app on your phone you can explore and learn about the world wherever you are. The film was built to show how a campaign can be hyper-localised, with versions for India and other markets, and made under the tight constraints of Google\'s AI guidelines.' },

  { id: 'piggies', public: true, title: 'The Three Little Pigs and the Camera Coach', client: 'Google, Pixel 10a', year: '2026',
    line: 'A fairy tale, retold for one feature on a phone.',
    note: 'Part of an exploration for Google into using AI to make social assets. The three little pigs, in their own fairy-tale world, bring the Pixel 10a\'s Camera Coach to life.' },

  { id: 'theres-less', public: true, title: 'But Wait, There\'s Less', client: 'Google', year: '2025', status: 'Unreleased',
    line: 'Other phones keep selling you more. This one takes things away.',
    note: 'A hero film from a campaign developed for Google at the start of 2025. Other phones pile more and more into an already busy life; Google strips that away and leaves you with the things you actually want to do. All of it played in the voice of an infomercial. Unreleased, but it landed well inside Google, especially as a showcase for the AI production pipeline we now lead there.' },

  { id: 'stallion-sprint', public: true, title: 'But Wait, There\'s Less: Camera Coach', client: 'Google', year: '2025', status: 'Unreleased',
    line: 'When your partner takes too long to take a good photo of you.',
    note: 'A second film from the same Google campaign, on one feature: Camera Coach, which helps you take better pictures. The tension it plays on is the wait while someone you love gets the shot wrong again. Made as a previsualisation of the real shoot, which never happened, so it stands as a demonstration of how far an idea can be explored with AI before anything is built.' },

  { id: 'lighthouse', public: true, title: 'Lighthouse', client: 'Google, with Japan Airlines and Liverpool FC', year: '2025', status: 'Unreleased',
    line: 'Watch a goal on YouTube, get the training plan that scores it.',
    note: 'Developed for Google\'s Lighthouse programme. AI turned the goals people watched in YouTube pre-rolls into personal training plans, for Japan Airlines and Liverpool Football Club. A demanding build for an idea worth it. Unreleased.' },

  { id: 'mr-tired', public: false, title: 'Mr Tired', client: 'Google', year: '2025', // confidential: never public
    line: '', note: '' },

  { id: 'expedia', public: false, title: 'Expedia', client: 'Expedia', year: '2025', // left out
    line: '', note: '' },

  { id: 'revolutions', public: false, title: 'Revolutions', client: '', year: '2025', // left out
    line: '', note: '' },
].map((f) => ({
  ...f,
  poster: f.poster ?? `films/${f.id}.jpg`,
  video: f.video ?? `films/${f.id}.mp4`,
  episodes: f.episodes?.map((e) => ({ ...e, poster: `films/${e.id}.jpg`, video: `films/${e.id}.mp4` })),
}));
