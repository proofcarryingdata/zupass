"use client";

import { constructPassportPcdGetRequestUrl } from "@pcd/passport-interface";
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
      argumentType: "PCD",
      pcdType: "eddsa-ticket-pcd",
      value: undefined,
      userProvided: true
    },
    identity: {
      argumentType: "PCD",
      pcdType: "semaphore-identity-pcd",
      value: undefined,
      userProvided: true
    },
    fieldsToReveal: {
      argumentType: "Object",
      value: {
        revealEventId: true
      },
      userProvided: false
    },
    watermark: {
      argumentType: "String",
      value: watermark,
      userProvided: false
    }
  };

  const proofUrl = constructPassportPcdGetRequestUrl(
    "https://pcdpass.xyz",
    `https://api.pcdpass.xyz/telegram/message?message=${encodeURIComponent(
      message
    )}`,
    "zk-eddsa-ticket-pcd",
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
          Please type your anonymous question below
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
