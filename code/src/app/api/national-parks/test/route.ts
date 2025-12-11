import { parkSchemaWithSource, parkSchemaWithSourceText, parkSchemaWithSourceUrl } from "../extract/fields";

export async function GET() {
  return new Response(
    JSON.stringify({
      withSource: parkSchemaWithSource.shape,
      withSourceUrl: parkSchemaWithSourceUrl.shape,
      withoutSourceText: parkSchemaWithSourceText.shape
    })
  )
}
