import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { db } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const schema = z.object({
  message: z.string(),
  sender: z.string(),
  recipient: z.string()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    console.error(result.error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pcd = await PODPCDPackage.prove({
    entries: {
      argumentType: ArgumentTypeName.Object,
      value: {
        message: {
          type: "string",
          value: result.data.message
        },
        sender: {
          type: "cryptographic",
          value: BigInt(result.data.sender)
        },
        recipient: {
          type: "cryptographic",
          value: BigInt(result.data.recipient)
        },
        timestamp: {
          type: "cryptographic",
          value: BigInt(new Date().getTime())
        }
      }
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuidv4()
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100"
    }
  });

  const serialized = await PODPCDPackage.serialize(pcd);

  const client = await db.connect();
  await client.sql`INSERT INTO messages (sender, recipient, pod) VALUES (${
    result.data.sender
  }, ${result.data.recipient}, ${JSON.stringify(serialized)})`;

  return NextResponse.json({ success: true });
}
