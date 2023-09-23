"use client";

import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { constructPassportPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import sha256 from "js-sha256";
import { useCallback, useState } from "react";

function getMessageWatermark(message: string): bigint {
  const hashed = sha256.sha256(message).substring(0, 16);
  return BigInt("0x" + hashed);
}

function requestProof(message: string) {
  const watermark = getMessageWatermark(message).toString();
  console.log("WATERMARK", watermark);

  const args = {
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
      argumentType: ArgumentTypeName.Object,
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

  const proofUrl = constructPassportPcdGetRequestUrl(
    passportOrigin,
    returnUrl,
    "zk-eddsa-event-ticket-pcd",
    args,
    {
      genericProveScreen: true,
      title: "ZK-EdDSA Ticket Request",
      description:
        "Generate a ZK proof that you have a ticket for the research workshop! Select your ticket from the dropdown below."
    }
  );

  window.location.href = proofUrl;
}

export default function SubmitMessagePage() {
  const [message, setMessage] = useState("");

  const onClick = useCallback(() => {
    requestProof(message);
  }, [message]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-200">
      <div className="flex flex-col bg-white shadow-md rounded px-8 py-8 gap-6">
        <h1 className="text-gray-700 text-xl font-bold">
          Please type MY your anonymous question below
        </h1>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-md p-2 border-2 text-black"
        />
        <button
          onClick={onClick}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Submit Question
        </button>
      </div>
    </div>
  );
}
