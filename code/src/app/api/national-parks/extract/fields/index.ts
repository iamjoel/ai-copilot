import { z } from "zod";

const fields = {
  officialWebsite: 'Official website URL of the park. Return an empty string if not found.',
  // Ecological Integrity
  level: 'Level of the park: 2 if it is a World Heritage site, otherwise 1.',
  speciesCount: 'Total number of species in the park, including ALL ANIMAL and PLANT species.If the text gives separate counts for different groups (e.g. mammals, birds, fish, amphibians, reptiles, plants), sum them up.Return -1 if not stated.',
  endangeredSpecies: 'Count of endangered species listed in the IUCN Red List. Return -1 if not stated.',
  forestCoverage: 'Forest coverage percentage with one decimal place (e.g., 95.9). Return -1 if not stated.',
  // Governance Resilience
  area: "Total area of the park in square kilometers. Convert to km² if another unit is provided. Return -1 if missing.",
  establishedYear: "Year the park was established; Use four digits format. Return -1 if the text does not contain it.",
  internationalCert: "Whether the park is a World Heritage site or Biosphere Reserve (1=yes, 0=no). Return -1 if not stated.",
  // Nature Immersion
  annualVisitors: "Annual visitors as an integer count of ten-thousands of people. Return -1 if not stated.",
}

export const parkDetailsSchema = z.object({
  officialWebsite: z
    .string()
    .describe(fields.officialWebsite),
  officialWebsiteSource: z
    .string()
    .describe("Evidence text for officialWebsite; empty string if not found."),
  // Ecological Integrity
  level: z
    .number()
    .describe(fields.level),
  levelSource: z
    .string()
    .describe("Evidence text for level; empty string if not found."),
  speciesCount: z
    .number()
    .describe(fields.speciesCount),
  speciesCountSource: z
    .string()
    .describe("Evidence text for speciesCount; empty string if not found."),
  endangeredSpecies: z
    .number()
    .describe(fields.endangeredSpecies),
  endangeredSpeciesSource: z
    .string()
    .describe("Evidence text for endangeredSpecies; empty string if not found."),
  forestCoverage: z
    .number()
    .describe(fields.forestCoverage),
  forestCoverageSource: z
    .string()
    .describe("Evidence text for forestCoverage; empty string if not found."),
  // Governance Resilience
  area: z
    .number()
    .describe(fields.area),
  areaSource: z
    .string()
    .describe("Evidence text for area; empty string if not found."),
  establishedYear: z
    .number()
    .describe(fields.establishedYear),
  establishedYearSource: z
    .string()
    .describe("Evidence text for establishedYear; empty string if not found."),
  internationalCert: z
    .number()
    .describe(fields.internationalCert),
  internationalCertSource: z
    .string()
    .describe("Evidence text for internationalCert; empty string if not found."),
  // Nature Immersion
  annualVisitors: z
    .number()
    .describe(fields.annualVisitors),
  annualVisitorsSource: z
    .string()
    .describe("Evidence text for annualVisitors; empty string if not found."),
});

const fieldsSourceUrl = z.object({
  officialWebsiteSourceUrl: z.string().url().describe("URL source for officialWebsite; empty string if not found."),
  levelSourceUrl: z.string().url().describe("URL source for level; empty string if not found."),
  speciesCountSourceUrl: z.string().url().describe("URL source for speciesCount; empty string if not found."),
  endangeredSpeciesSourceUrl: z.string().url().describe("URL source for endangeredSpecies; empty string if not found."),
  forestCoverageSourceUrl: z.string().url().describe("URL source for forestCoverage; empty string if not found."),
  areaSourceUrl: z.string().url().describe("URL source for area; empty string if not found."),
  establishedYearSourceUrl: z.string().url().describe("URL source for establishedYear; empty string if not found."),
  internationalCertSourceUrl: z.string().url().describe("URL source for internationalCert; empty string if not found."),
  annualVisitorsSourceUrl: z.string().url().describe("URL source for annualVisitors; empty string if not found."),
})

const parkDetailsWithSourceUrlSchema = parkDetailsSchema.merge(fieldsSourceUrl);

export const getFieldSchema = (key: keyof typeof fields) => {
  return parkDetailsWithSourceUrlSchema.pick({
    [key]: true,
    [`${key}Source`]: true,
    [`${key}SourceUrl`]: true,
  } as { [K in keyof typeof fields]?: true });
}

export default fields;
