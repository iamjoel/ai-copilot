export const GOOGLE_SEARCH_FIELDS = [
  "level",
  "speciesCount",
  "endangeredSpecies",
  "forestCoverage",
  "area",
  "establishedYear",
  "internationalCert",
  "annualVisitors",
] as const;

export type GoogleSearchField = typeof GOOGLE_SEARCH_FIELDS[number];

export const GOOGLE_SEARCH_FIELD_LABELS: Record<GoogleSearchField, string> = {
  level: "Level (World Heritage = 2, otherwise 1)",
  speciesCount: "Species count",
  endangeredSpecies: "Endangered species count",
  forestCoverage: "Forest coverage (%)",
  area: "Area (km²)",
  establishedYear: "Established year",
  internationalCert: "International certification (1=yes, 0=no)",
  annualVisitors: "Annual visitors (ten-thousands)",
};

export function isGoogleSearchField(field: string): field is GoogleSearchField {
  return (GOOGLE_SEARCH_FIELDS as readonly string[]).includes(field);
}
