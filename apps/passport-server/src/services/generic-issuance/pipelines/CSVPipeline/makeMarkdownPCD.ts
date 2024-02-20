import {
  EdDSAMessagePCD,
  EdDSAMessagePCDPackage
} from "@pcd/eddsa-message-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { traced } from "../../../telemetryService";

/**
 * Given a CSV row uploaded by a user to a {@link CSVPipeline},
 * generates an {@link EdDSAMessagePCD} containing {@link }signed
 * {@code process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY}
 *
 *
 * - `title`: gets displayed in the title of the PCD
 * - `message`: markdown-formatted announcement. can include images, links, etc.
 */
export async function makeMarkdownPCD(
  csvRow: string[],
  eddsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("", "makeMarkdownPCD", async () => {
    const defaultTitle = "Hello World";
    const defaultMarkdown = "hello world";

    const imgTitle = csvRow[0] ?? defaultTitle;
    const markdown = csvRow[1] ?? defaultMarkdown;

    const pcd: EdDSAMessagePCD = await EdDSAMessagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: eddsaPrivateKey
      },
      title: {
        argumentType: ArgumentTypeName.String,
        value: imgTitle
      },
      markdown: {
        argumentType: ArgumentTypeName.String,
        value: markdown
      }
    });
    const serialized = await EdDSAMessagePCDPackage.serialize(pcd);
    return serialized;
  });
}
