"use client";

import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { PCDGetRequest, ProveOptions } from "@pcd/passport-interface";
import { ArgsOf, ArgumentTypeName, PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import sha256 from "js-sha256";
import { useCallback, useState } from "react";

function getMessageWatermark(message: string): bigint {
  const hashed = sha256.sha256(message).substring(0, 16);
  return BigInt("0x" + hashed);
}

 enum PCDRequestType {
  Get = "Get",
  GetWithoutProving = "GetWithoutProving",
  Add = "Add",
  ProveAndAdd = "ProveAndAdd"
}

function constructZupassPcdGetRequestUrl<T extends PCDPackage>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: ProveOptions
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    args: args,
    pcdType,
    options
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/prove?request=${encReq}`;
}

function requestProof(message: string) {
  const watermark = getMessageWatermark(message).toString();
  console.log("WATERMARK", watermark);

  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: {
        revealEventId: true
      },
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: undefined,
      userProvided: false
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: undefined,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark,
      userProvided: false
    }
  };

  let passportOrigin = `${process.env.NEXT_PUBLIC_PASSPORT_CLIENT_URL}/`;
  const returnUrl = `${
    process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL
  }/telegram/message?message=${encodeURIComponent(message)}`;

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZK-EdDSA Ticket Request",
    description:
      "Generate a ZK proof that you have a ticket for a conference event! Select your ticket from the dropdown below."
  });

  window.location.href = proofUrl;
}

export default function SubmitMessagePage() {
  const [message, setMessage] = useState("");

  const onClick = useCallback(() => {
    requestProof(message);
  }, [message]);

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-[#037EE5] p-4">
      <span className="text-white font-bold my-4">zk-TG</span>
      <div className="flex flex-col gap-2 bg-[#50ACF9] rounded-lg w-full p-2">
        <textarea
          placeholder="Type your anonymous message here"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border-2 text-2xl rounded-lg text-black resize-none p-2 h-[30vh]"
        />
      </div>
      <div className="mt-8 text-center flex flex-col w-full">
        <span className="text-white pb-2">🔒 Anonymous posting</span>
        <button
          onClick={onClick}
          className="w-full bg-white text-[#037ee5] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4"
        >
          Send to channel
        </button>
      </div>
    </div>
  );
}
