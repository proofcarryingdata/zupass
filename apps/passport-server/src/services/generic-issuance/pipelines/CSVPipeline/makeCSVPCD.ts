import { EdDSAMessagePCDPackage } from "@pcd/eddsa-message-pcd";
import { EdDSATicketPCDPackage, TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { CSVPipelineOutputType } from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";
import { traced } from "../../../telemetryService";

export async function makeCSVPCD(
  inputRow: string[],
  type: CSVPipelineOutputType,
  opts: {
    rsaPrivateKey: string;
    eddsaPrivateKey: string;
  }
): Promise<SerializedPCD> {
  return traced("CSVPipeline", "makeCSVPCD", async (span) => {
    span?.setAttribute("output_type", type);

    switch (type) {
      case CSVPipelineOutputType.RSAImage:
        return makeRSACSVPCD(inputRow, opts.rsaPrivateKey);
      case CSVPipelineOutputType.EdDSAMessage:
        return makeEdDSAMessageCSVPCD(inputRow, opts.eddsaPrivateKey);
      case CSVPipelineOutputType.EdDSATicket:
        return makeEdDSATicketCSVPCD(inputRow, opts.eddsaPrivateKey);
      default:
        throw new Error("not implemented");
    }
  });
}

export async function makeRSACSVPCD(
  inputRow: string[],
  rsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("CSVPipeline", "makeRSACSVPCD", async () => {
    const defaultTitle = "Cat";
    const defaultImg =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/A-Cat.jpg/1600px-A-Cat.jpg";

    const imgTitle = inputRow[0] ?? defaultTitle;
    const imgUrl = inputRow[1] ?? defaultImg;

    const pcd = await RSAImagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: rsaPrivateKey
      },
      title: {
        argumentType: ArgumentTypeName.String,
        value: imgTitle
      },
      url: {
        argumentType: ArgumentTypeName.String,
        value: imgUrl
      }
    });
    const serialized = await RSAImagePCDPackage.serialize(pcd);
    return serialized;
  });
}

export async function makeEdDSAMessageCSVPCD(
  inputRow: string[],
  eddsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("CSVPipeline", "makeEdDSAMessageCSVPCD", async () => {
    const defaultTitle = "Hello World";
    const defaultMarkdown = "hello world";

    const imgTitle = inputRow[0] ?? defaultTitle;
    const markdown = inputRow[1] ?? defaultMarkdown;

    const pcd = await EdDSAMessagePCDPackage.prove({
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

makeEdDSATicketCSVPCD;

export async function makeEdDSATicketCSVPCD(
  inputRow: string[],
  eddsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("CSVPipeline", "makeEdDSAMessageCSVPCD", async () => {
    const pcd = await EdDSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: eddsaPrivateKey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: {
          // The fields below are not signed and are used for display purposes.
          eventName: "a",
          ticketName: "b",
          checkerEmail: undefined, // change if checkin feature enabled for csv pipelines
          imageUrl: undefined,
          imageAltText: undefined,
          // The fields below are signed using the passport-server's private EdDSA key
          // and can be used by 3rd parties to represent their own tickets.
          ticketId: randomUUID(), // The ticket ID is a unique identifier of the ticket.
          eventId: randomUUID(), // The event ID uniquely identifies an event.
          productId: randomUUID(), // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
          timestampConsumed: 0, // change if checkin feature enabled for csv pipelines
          timestampSigned: Date.now(),
          attendeeSemaphoreId: randomUUID(),
          isConsumed: false, // change if checkin feature enabled for csv pipelines
          isRevoked: false,
          ticketCategory: TicketCategory.Generic,
          attendeeName: "test name",
          attendeeEmail: "test@test.com"
        }
      }
    });
    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
    return serialized;
  });
}
