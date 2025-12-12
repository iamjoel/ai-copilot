const testName = 'Yellowstone National Park'

const testParks = [
  { country: 'Yemen', name: 'Hawf', wiki: 'https://en.wikipedia.org/wiki/Hawf_National_Reserve' }, // Has less info
  { country: 'United States', name: "Yellowstone National Park", wiki: "https://en.wikipedia.org/wiki/Yellowstone_National_Park" }, // Well known park in US
  { country: 'United States', name: "Yosemite National Park", wiki: "https://en.wikipedia.org/wiki/Yosemite_National_Park" }, // Well known park in US
  { country: 'China', name: "Sanjiangyuan", wiki: "https://en.wikipedia.org/wiki/Sanjiangyuan" }, // Famous park in China
  { country: 'China', name: "Giant Panda National Park", wiki: "https://en.wikipedia.org/wiki/Giant_Panda_National_Park" }, // Famous park in China
];


export const testPark = testParks.find(park => park.name === testName);
