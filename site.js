// Who the site is about, in one place. The placards, the About text, the Contact screen and the plain film list
// all read from here. The <title>, description and og: tags in index.html repeat the title and description by hand
// (crawlers don't run scripts), so change them there too.
export const SITE = {
  name: 'Lucas Stanley',
  title: 'Creative lead',   // the one job title: the placards carry its words, About and the film list say it
  company: 'Jellyfish',
  // Contact screen. An empty string leaves that line out; the Send button stays off until there is an address.
  city: '',
  email: 'lucas.a.r.stanley@gmail.com',
  linkedin: '',             // full URL
  ask: 'I\'m at Jellyfish and happy there. If you want to talk about a film, or about making work this way, write to me.',
};
