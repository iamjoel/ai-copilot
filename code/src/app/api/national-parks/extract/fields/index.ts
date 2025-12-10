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

export type FieldsType = keyof typeof fields;

const getSourceTextFieldDescription = (key: keyof typeof fields) => {
  return `Evidence text for ${key}; empty string if not found.` as const;
}

const getSourceUrlFieldDescription = (key: keyof typeof fields) => {
  return `URL source for ${key}; empty string if not found.` as const;
}


export const parkDetailsSchema = z.object({
  officialWebsite: z.string().describe(fields.officialWebsite),
  // Ecological Integrity
  level: z.number().describe(fields.level),
  speciesCount: z.number().describe(fields.speciesCount),
  endangeredSpecies: z.number().describe(fields.endangeredSpecies),
  forestCoverage: z.number().describe(fields.forestCoverage),

  // Governance Resilience
  area: z.number().describe(fields.area),
  establishedYear: z.number().describe(fields.establishedYear),
  internationalCert: z.number().describe(fields.internationalCert),

  // Nature Immersion
  annualVisitors: z.number().describe(fields.annualVisitors),
});

export type ParkDetail = z.infer<typeof parkDetailsSchema>;

type FieldKey = keyof typeof fields;
type SourceSchemaKey = `${FieldKey}SourceText` | `${FieldKey}SourceUrl`;

export const parkSchemaWithSourceText = (() => {
  const schema = z.object(
    (Object.keys(fields) as FieldKey[]).reduce((shape, key) => {
      const textKey = `${key}SourceText` as SourceSchemaKey;
      shape[textKey] = z.string().describe(getSourceTextFieldDescription(key));
      return shape;
    }, {} as Record<SourceSchemaKey, z.ZodString>))
  return parkDetailsSchema.merge(schema);
})();

export const parkSchemaWithSourceUrl = (() => {
  const schema = z.object(
    (Object.keys(fields) as FieldKey[]).reduce((shape, key) => {
      const urlKey = `${key}SourceUrl` as SourceSchemaKey;
      shape[urlKey] = z.string().describe(getSourceUrlFieldDescription(key));
      return shape;
    }, {} as Record<SourceSchemaKey, z.ZodString>)
  )
  return parkDetailsSchema.merge(schema);
})();

export const parkSchemaWithSource = (() => {
  const schema = z.object(
    (Object.keys(fields) as FieldKey[]).reduce((shape, key) => {
      const textKey = `${key}SourceText` as SourceSchemaKey;
      const urlKey = `${key}SourceUrl` as SourceSchemaKey;
      shape[textKey] = z.string().describe(getSourceTextFieldDescription(key));
      shape[urlKey] = z.string().describe(getSourceUrlFieldDescription(key));
      return shape;
    }, {} as Record<SourceSchemaKey, z.ZodString>)
  );
  return parkDetailsSchema.merge(schema);
})();


export const getFieldSchema = (key: keyof typeof fields) => {
  return parkSchemaWithSource.pick({
    [`${key}SourceText`]: true,
    [`${key}SourceUrl`]: true,
  } as { [K in keyof typeof parkSchemaWithSource.shape]?: true });
}

export default fields;
