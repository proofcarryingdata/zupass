"use client";

import { constructPassportPcdGetRequestUrl } from "@pcd/passport-interface";
import { useCallback, useState } from "react";

function requestProof(message: string) {
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
      value: "5",
      userProvided: false
    }
  };

  const proofUrl = constructPassportPcdGetRequestUrl(
    "http://localhost:3000",
    "http://localhost:3002/telegram/message",
    "zk-eddsa-ticket-pcd",
    args,
    {
      genericProveScreen: true,
      title: "ZK-EdDSA Ticket Request",
      description:
        "Generate a ZK proof that you have a ticket for the research workshop! Select your ticket from the dropdown below."
    }
  );

  console.log(proofUrl);

  // window.location.href = proofUrl;
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
          Submit question
        </button>
      </div>
    </div>
  );
}
