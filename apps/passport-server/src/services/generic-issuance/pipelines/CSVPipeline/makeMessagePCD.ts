import { MessagePCD, MessagePCDPackage } from "@pcd/message-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { traced } from "../../../telemetryService";

/**
 * Given a CSV row uploaded by a user to a {@link CSVPipeline},
 * generates an {@link MessagePCD} containing {@link }signed
 * `process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY`
 *
 *
 * - `title`: gets displayed in the title of the PCD
 * - `message`: markdown-formatted announcement. can include images, links, etc.
 */
export async function makeMessagePCD(
  csvRow: string[],
  eddsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("", "makeMarkdownPCD", async () => {
    const pcd: MessagePCD = await MessagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: eddsaPrivateKey
      },
      message: {
        argumentType: ArgumentTypeName.Object,
        value: {
          displayName: csvRow[0],
          mdBody: csvRow[1]
        }
      }
    });
    const serialized = await MessagePCDPackage.serialize(pcd);
    return serialized;
  });
}
