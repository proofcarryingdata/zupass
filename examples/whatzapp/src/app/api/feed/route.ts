import {
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface/Credential";
import { FeedHost } from "@pcd/passport-interface/FeedHost";
import {
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface/RequestTypes";
import {
  DeleteFolderAction,
  DeleteFolderPermission,
  PCDActionType,
  PCDPermissionType,
  ReplaceInFolderAction,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { kv } from "@vercel/kv";
import { db } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const fullPath = path.join(__dirname, "../../../../../artifacts/");
console.log(fullPath);
SemaphoreSignaturePCDPackage.init?.({
  zkeyFilePath: fullPath + "16.zkey",
  wasmFilePath: fullPath + "16.wasm"
});

async function messagesForId(id: string) {
  const client = await db.connect();
  const sent = await client.sql`SELECT * FROM messages WHERE sender = ${id}`;

  const sentPCDs = sent.rows.map((row) => {
    return JSON.parse(row.pod);
  });

  const received =
    await client.sql`SELECT * FROM messages WHERE recipient = ${id}`;
  const receivedPCDs = received.rows.map((row) => {
    return JSON.parse(row.pod);
  });

  console.log({ sentPCDs, receivedPCDs });

  return [
    {
      type: PCDActionType.DeleteFolder,
      folder: "Whatzapp/Outbox",
      recursive: false
    } satisfies DeleteFolderAction,
    {
      type: PCDActionType.ReplaceInFolder,
      folder: "Whatzapp/Outbox",
      pcds: sentPCDs
    } satisfies ReplaceInFolderAction,
    {
      type: PCDActionType.DeleteFolder,
      folder: "Whatzapp/Inbox",
      recursive: false
    } satisfies DeleteFolderAction,
    {
      type: PCDActionType.ReplaceInFolder,
      folder: "Whatzapp/Inbox",
      pcds: receivedPCDs
    } satisfies ReplaceInFolderAction
  ];
}

async function initFeedHost() {
  const feedHost = new FeedHost(
    [
      {
        feed: {
          id: "1",
          name: "Whatzapp",
          description: "Whatzapp Messaging",
          permissions: [
            {
              folder: "Whatzapp",
              type: PCDPermissionType.ReplaceInFolder
            } as ReplaceInFolderPermission,
            {
              folder: "Whatzapp",
              type: PCDPermissionType.DeleteFolder
            } as DeleteFolderPermission
          ],
          credentialRequest: {
            signatureType: "sempahore-signature-pcd",
            pcdType: "email-pcd"
          }
        },
        handleRequest: async (
          req: PollFeedRequest
        ): Promise<PollFeedResponseValue> => {
          if (req.pcd === undefined) {
            throw new Error(`Missing credential`);
          }
          const cachedVerification = await kv.get(JSON.stringify(req.pcd));
          if (cachedVerification) {
            console.log("cached");
            return {
              actions: await messagesForId(
                (cachedVerification as VerifiedCredential).semaphoreId
              )
            };
          }
          const { email, semaphoreId } = await verifyCredential(req.pcd);
          console.log("verified");
          await kv.set(JSON.stringify(req.pcd), { email, semaphoreId });
          return {
            actions: await messagesForId(semaphoreId)
          };
        }
      }
    ],
    `${
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3220"
    }/api/feed`,
    "Whatzapp Feed Server"
  );

  return feedHost;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const feedHost = await initFeedHost();
  const response = await feedHost.handleFeedRequest(body);
  return NextResponse.json(response);
}

export async function GET(req: NextRequest) {
  const feedHost = await initFeedHost();
  const response = await feedHost.handleListFeedsRequest(req);
  return NextResponse.json(response);
}
