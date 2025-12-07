const testName = 'Giant Panda National Park'

const testParks = [
  { name: 'Hawf National Reserve', wiki: 'https://en.wikipedia.org/wiki/Hawf_National_Reserve' }, // Has less info
  { name: "Yellowstone National Park", wiki: "https://en.wikipedia.org/wiki/Yellowstone_National_Park" }, // Well known park in US
  { name: "Yosemite National Park", wiki: "https://en.wikipedia.org/wiki/Yosemite_National_Park" }, // Well known park in US
  { name: "Sanjiangyuan", wiki: "https://en.wikipedia.org/wiki/Sanjiangyuan" }, // Famous park in China
  { name: "Giant Panda National Park", wiki: "https://en.wikipedia.org/wiki/Giant_Panda_National_Park" }, // Famous park in China
];


export const testPark = testParks.find(park => park.name === testName);
