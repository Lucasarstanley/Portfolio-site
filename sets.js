// Prop arrangements around the films in the Work column.
//
// Each set is a list of props placed relative to a film: x in multiples of the film's half-width
// (the image spans -1..1; its caption sits to the right from about 1.3 to 2.8, from the top edge
// down to about -0.2), y in multiples of the film's half-height (the image spans -1..1).
// Props stay close to the film, in three pockets: above the image's top-left corner (x -1..-0.3,
// y 1.15..1.5), above its top-right corner (x 0.3..1.05, same y), and under the description
// (x 1.3..2.6, y -0.45..-0.95). `face` is which way the prop faces, in degrees on the screen:
// 0 = right, 90 = up the screen, -90 = towards the viewer. `s` scales it.
// Generic kinds: bench, deckchair, tree, conifer, lamp, kiosk, blanket, parasol, bin, cone, flag.
//
// A film takes a set by name (`set: 'park'` in films.js); films without one cycle through the list,
// with a small per-film jitter so no two look identical.
export const PROP_SETS = {
  park: [
    { k: 'tree', x: -0.85, y: 1.35, s: 1.0 },
    { k: 'bench', x: -0.45, y: 1.22, face: -90 },
    { k: 'lamp', x: 0.9, y: 1.3 },
    { k: 'bin', x: 1.45, y: -0.5 },
    { k: 'bench', x: 1.9, y: -0.6, face: -90 },
  ],
  picnic: [
    { k: 'parasol', x: -0.8, y: 1.4 },
    { k: 'blanket', x: -0.6, y: 1.25, face: -20 },
    { k: 'blanket', x: 0.7, y: 1.28, face: 30 },
    { k: 'conifer', x: 1.0, y: 1.45, s: 0.85 },
    { k: 'blanket', x: 1.6, y: -0.6, face: 10 },
    { k: 'parasol', x: 1.95, y: -0.45 },
  ],
  deckchairs: [
    { k: 'deckchair', x: -0.9, y: 1.25, face: -90 },
    { k: 'deckchair', x: -0.6, y: 1.25, face: -95 },
    { k: 'parasol', x: -0.75, y: 1.45 },
    { k: 'deckchair', x: 0.85, y: 1.25, face: -85 },
    { k: 'bin', x: 1.4, y: -0.5 },
    { k: 'deckchair', x: 1.75, y: -0.6, face: -90 },
    { k: 'deckchair', x: 2.05, y: -0.6, face: -90 },
  ],
  kiosk: [
    { k: 'kiosk', x: 1.85, y: -0.75, face: -90 },
    { k: 'bin', x: 1.35, y: -0.5 },
    { k: 'lamp', x: -0.95, y: 1.3 },
    { k: 'bench', x: 0.75, y: 1.22, face: -90 },
  ],
  avenue: [
    { k: 'lamp', x: -0.95, y: 1.3 },
    { k: 'lamp', x: 0.95, y: 1.3 },
    { k: 'conifer', x: -0.6, y: 1.45, s: 0.9 },
    { k: 'conifer', x: 0.6, y: 1.45, s: 0.9 },
    { k: 'bench', x: 1.8, y: -0.6, face: -90 },
  ],
  grove: [
    { k: 'tree', x: -0.9, y: 1.4, s: 0.9 },
    { k: 'tree', x: -0.5, y: 1.5, s: 1.05 },
    { k: 'tree', x: 0.9, y: 1.4, s: 0.85 },
    { k: 'blanket', x: 1.7, y: -0.6, face: 15 },
    { k: 'bin', x: 2.3, y: -0.5 },
  ],
  terrace: [
    { k: 'bench', x: 1.5, y: -0.6, face: -90 },
    { k: 'bench', x: 2.15, y: -0.6, face: -90 },
    { k: 'parasol', x: 1.82, y: -0.42 },
    { k: 'bin', x: 2.6, y: -0.55 },
    { k: 'lamp', x: -0.95, y: 1.3 },
    { k: 'bench', x: 0.7, y: 1.22, face: -90 },
  ],
  lawn: [
    { k: 'deckchair', x: -0.95, y: 1.25, face: -80 },
    { k: 'deckchair', x: -0.65, y: 1.3, face: -90 },
    { k: 'deckchair', x: -0.35, y: 1.25, face: -100 },
    { k: 'parasol', x: -0.65, y: 1.48 },
    { k: 'tree', x: 0.9, y: 1.4, s: 0.85 },
    { k: 'bench', x: 1.85, y: -0.6, face: -90 },
  ],
  square: [
    { k: 'lamp', x: -0.95, y: 1.3 },
    { k: 'lamp', x: 0.95, y: 1.3 },
    { k: 'bench', x: -0.5, y: 1.22, face: -90 },
    { k: 'bench', x: 0.5, y: 1.22, face: -90 },
    { k: 'bin', x: 1.4, y: -0.5 },
    { k: 'conifer', x: 2.0, y: -0.7, s: 0.9 },
  ],
  orchard: [
    { k: 'conifer', x: -0.9, y: 1.45, s: 0.85 },
    { k: 'conifer', x: -0.55, y: 1.35, s: 1.0 },
    { k: 'conifer', x: 0.65, y: 1.4, s: 0.9 },
    { k: 'conifer', x: 1.0, y: 1.5, s: 0.8 },
    { k: 'bench', x: 1.7, y: -0.6, face: -90 },
    { k: 'bin', x: 2.2, y: -0.5 },
  ],
};

// One set per film, keyed by film id, each from that film's own props (plus trees). These win over
// the generic sets above. The kinds are in props.js.
Object.assign(PROP_SETS, {
  // a hotel forecourt: the sign, a velvet rope at the door, the luggage waiting
  'small-hotel': [
    { k: 'hotelSign', x: -0.85, y: 1.35 }, { k: 'velvetRope', x: -0.4, y: 1.2, face: -90 },
    { k: 'luggageCart', x: 0.8, y: 1.25, face: -70 },
    { k: 'luggageCart', x: 1.7, y: -0.6, face: -110 }, { k: 'velvetRope', x: 2.3, y: -0.5, face: -90 },
  ],
  // somewhere to stay: the cottage, a mailbox, a hammock in the garden
  airbnb: [
    { k: 'cottage', x: -0.75, y: 1.4, face: -90 }, { k: 'mailbox', x: -0.25, y: 1.2 },
    { k: 'tree', x: 0.9, y: 1.45, s: 1.0 },
    { k: 'hammock', x: 1.8, y: -0.6, face: -80 },
  ],
  // a restaurant terrace: lanterns, tables, the wok
  'andres-thai': [
    { k: 'lanternPost', x: -0.95, y: 1.35 }, { k: 'tableStools', x: -0.55, y: 1.25 },
    { k: 'lanternPost', x: 0.95, y: 1.35, face: 180 }, { k: 'tableStools', x: 0.55, y: 1.25 },
    { k: 'wokStation', x: 1.85, y: -0.7, face: -90 },
  ],
  // less
  'theres-less': [
    { k: 'plinth', x: 0.85, y: 1.22 }, { k: 'shrinkingBoxes', x: 1.7, y: -0.55, face: -90 },
  ],
  // a sprint: blocks on the line, hurdles, the finish
  'stallion-sprint': [
    { k: 'startBlocks', x: -0.95, y: 1.2, face: -90 }, { k: 'startBlocks', x: -0.7, y: 1.2, face: -90 }, { k: 'startBlocks', x: -0.45, y: 1.2, face: -90 },
    { k: 'hurdle', x: 0.5, y: 1.25, face: -90 }, { k: 'hurdle', x: 0.95, y: 1.25, face: -90 },
    { k: 'finishPosts', x: 1.9, y: -0.6, face: -90 },
  ],
  // the picnic, on time: a lawnmower, a table, a crate of beer
  moretti: [
    { k: 'lawnmower', x: -0.85, y: 1.3, face: -40 }, { k: 'beerCrate', x: -0.4, y: 1.2, face: 20 },
    { k: 'tree', x: 0.9, y: 1.45, s: 0.95 },
    { k: 'picnicTable', x: 1.85, y: -0.65, face: -90 },
  ],
  // on holiday: the 99, the cart, the cases
  'insure-and-go': [
    { k: 'travelCases', x: -0.85, y: 1.22, face: -70 }, { k: 'giantCone', x: -0.4, y: 1.25, s: 1.3 },
    { k: 'iceCreamCart', x: 0.8, y: 1.35, face: -90 },
    { k: 'giantCone', x: 1.6, y: -0.55, s: 1.3 }, { k: 'travelCases', x: 2.2, y: -0.6, face: -110 },
  ],
  // a festival in Lagos: the peacock, the bakery, the sound
  desperados: [
    { k: 'peacock', x: -0.8, y: 1.3, face: -60 }, { k: 'speakerStack', x: -0.35, y: 1.35, face: -90 },
    { k: 'breadStand', x: 0.75, y: 1.35, face: -90 },
    { k: 'speakerStack', x: 1.5, y: -0.6, face: -90 }, { k: 'peacock', x: 2.2, y: -0.55, face: -120 },
  ],
  // the training ground: the lighthouse, a goal, the balls
  lighthouse: [
    { k: 'lighthouse', x: -0.85, y: 1.4 }, { k: 'ballPile', x: -0.4, y: 1.2 },
    { k: 'goal', x: 0.75, y: 1.3, face: -90 },
    { k: 'ballPile', x: 1.5, y: -0.55 }, { k: 'goal', x: 2.15, y: -0.7, face: -90 },
  ],
  // a greener city: a turbine, solar, planters, trees
  gren: [
    { k: 'turbine', x: -0.9, y: 1.4 }, { k: 'planter', x: -0.4, y: 1.2, face: -90 },
    { k: 'tree', x: 0.85, y: 1.45, s: 1.0 },
    { k: 'solarPanel', x: 1.6, y: -0.6, face: -90 }, { k: 'tree', x: 2.3, y: -0.55, s: 0.8 },
  ],
  // honey: hives, flowers, a jar, a bee
  nectar: [
    { k: 'beehive', x: -0.9, y: 1.3 }, { k: 'flowerBed', x: -0.4, y: 1.2, face: -90 }, { k: 'bee', x: -0.6, y: 1.45 },
    { k: 'tree', x: 0.85, y: 1.45, s: 0.95 }, { k: 'beehive', x: 0.45, y: 1.22, s: 0.8 },
    { k: 'honeyPot', x: 1.55, y: -0.5, s: 1.4 }, { k: 'flowerBed', x: 2.2, y: -0.65, face: -90 },
  ],
  // the launch site: the rocket on its pad, the gantry, a dish
  orbite: [
    { k: 'gantry', x: -0.95, y: 1.4 }, { k: 'rocket', x: -0.55, y: 1.35 },
    { k: 'dish', x: 0.9, y: 1.3, face: -60 },
    { k: 'dish', x: 1.6, y: -0.55, face: -120 }, { k: 'gantry', x: 2.25, y: -0.6 },
  ],
  // crisps, naked: the sack, the packet, you do the dressing
  spudos: [
    { k: 'potatoSack', x: -0.85, y: 1.3 }, { k: 'crispPacket', x: -0.4, y: 1.2, s: 1.2, face: -80 },
    { k: 'sauceBottles', x: 0.8, y: 1.22, face: -90 },
    { k: 'crispPacket', x: 1.55, y: -0.55, s: 1.2, face: -100 }, { k: 'potatoSack', x: 2.2, y: -0.6 },
  ],
  // a market, anywhere: a signpost, a rickshaw, spices
  iga: [
    { k: 'signpost', x: -0.9, y: 1.35 }, { k: 'spiceStall', x: -0.45, y: 1.25, face: -90 },
    { k: 'rickshaw', x: 0.8, y: 1.3, face: -60 },
    { k: 'spiceStall', x: 1.6, y: -0.6, face: -90 }, { k: 'signpost', x: 2.3, y: -0.5 },
  ],
  // SXSW: the stage, a mic, the gumball machine
  moodlings: [
    { k: 'stagePlatform', x: -0.7, y: 1.35, face: -90 }, { k: 'micStand', x: -0.7, y: 1.2 },
    { k: 'gumMachine', x: 0.85, y: 1.25, s: 1.3 },
    { k: 'gumMachine', x: 1.55, y: -0.55, s: 1.3 }, { k: 'micStand', x: 2.2, y: -0.6 },
  ],
  // three little pigs: straw, sticks, bricks, and the camera coach
  piggies: [
    { k: 'strawHouse', x: -0.85, y: 1.35, face: -90 }, { k: 'stickHouse', x: -0.3, y: 1.4, face: -90 },
    { k: 'brickHouse', x: 0.85, y: 1.45, face: -90 },
    { k: 'tripodPhone', x: 1.7, y: -0.6, face: -90 },
  ],
  // Apple, Ecosystems: one scene per episode
  'apple': [ { k: 'deskLaptop', x: -0.7, y: 1.35, face: -90 }, { k: 'tree', x: 0.9, y: 1.45, s: 0.9 }, { k: 'earbudsCase', x: 1.6, y: -0.55, s: 1.5 } ],
  'apple-ep2': [ { k: 'phoneStand', x: -0.85, y: 1.25, face: -90 }, { k: 'earbudsCase', x: -0.45, y: 1.2, s: 1.5 }, { k: 'tree', x: 0.9, y: 1.45, s: 0.9 }, { k: 'phoneStand', x: 1.7, y: -0.6, face: -90 } ],
  'apple-ep3': [ { k: 'watchStand', x: -0.85, y: 1.25, s: 1.2 }, { k: 'runningShoes', x: -0.45, y: 1.2, face: -70 }, { k: 'tree', x: 0.9, y: 1.45, s: 0.9 }, { k: 'runningShoes', x: 1.7, y: -0.55, face: -110 } ],
  'apple-ep4': [ { k: 'sofa', x: -0.7, y: 1.3, face: -90 }, { k: 'tvStand', x: 0.85, y: 1.35, face: -90 }, { k: 'sofa', x: 1.8, y: -0.6, face: -90 } ],
});
export const SET_ORDER = ['park', 'picnic', 'deckchairs', 'kiosk', 'avenue', 'grove', 'terrace', 'lawn', 'square', 'orchard'];
