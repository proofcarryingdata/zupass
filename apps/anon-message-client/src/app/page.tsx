"use client";

import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { PCDGetRequest, ProveOptions } from "@pcd/passport-interface";
import { ArgsOf, ArgumentTypeName, PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { sleep } from "@pcd/util";
import {
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import sha256 from "js-sha256";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const MAX_HEADER_SIZE = 280; // max tweet size

function getMessageWatermark(message: string): bigint {
  const hashed = sha256.sha256(message).substring(0, 16);
  return BigInt("0x" + hashed);
}

interface TopicData {
  topicName: string;
  topicId: string;
  validEventIds: string[];
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

async function requestProof(
  message: string,
  topicId: string,
  validEventIds: string[]
) {
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
      value: validEventIds,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark,
      userProvided: false
    }
  };

  await sleep(1000);

  let passportOrigin = `${process.env.NEXT_PUBLIC_PASSPORT_CLIENT_URL}/`;
  const returnUrl = `${
    process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL
  }/telegram/message?message=${encodeURIComponent(message)}&topicId=${topicId}`;

  const proofUrl = await constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZK Ticket Proof",
    description:
      "Generate a zero-knowledge proof that you have an EdDSA ticket for a conference event! Select your ticket from the dropdown below."
  });

  window.location.href = proofUrl;
}

export default function () {
  const [message, setMessage] = useState("");
  const [messageInvalid, setMessageInvalid] = useState(false);
  const [topicData, setTopicData] = useState<TopicData | undefined>();
  const [loadingProofUrl, setLoadingProofUrl] = useState(false);
  const searchParams = useSearchParams();
  const topicDataRaw = searchParams.get("tgWebAppStartParam");

  useEffect(() => {
    if (!topicDataRaw) return;
    const topicDataEncoded = Buffer.from(topicDataRaw, "base64");
    const topicData = JSON.parse(topicDataEncoded.toString("utf-8"));
    setTopicData(topicData);
  }, [topicDataRaw]);

  useEffect(() => {
    if (message.length > MAX_HEADER_SIZE) {
      setMessageInvalid(true);
    } else if (messageInvalid) {
      setMessageInvalid(false);
    }
  }, [message]);

  const onClick = useCallback(async () => {
    setLoadingProofUrl(true);
    if (!topicData || !topicData.topicId || !topicData.validEventIds) return;
    await requestProof(message, topicData.topicId, topicData.validEventIds);
    setLoadingProofUrl(false);
  }, [message]);

  if (!topicData) {
    return (
      <div className="w-screen h-screen flex flex-col items-center bg-[#037EE5] p-4">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="w-screen h-screen flex flex-col items-center bg-[#037EE5] p-4">
        <span className="text-white font-bold my-4">
          {`Post to #${topicData.topicName}`}
        </span>
        <div className="flex flex-col gap-2 bg-[#50ACF9] rounded-lg w-full p-2">
          <textarea
            placeholder="Type your anonymous message here"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`border-2 ${
              messageInvalid ? "border-red-500" : ""
            } text-2xl rounded-lg text-black resize-none p-2 h-[30vh]`}
          />
        </div>
        <div className="mt-8 text-center flex flex-col w-full">
          {messageInvalid && (
            <div className="p-2 bg-red-500 rounded-md mb-2">
              <span className="text-white pb-2">Message is too long!</span>
            </div>
          )}
          <span className="text-white pb-2">🔒 Anonymous posting</span>
          <button
            onClick={onClick}
            className="w-full bg-white text-[#037ee5] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4 disabled:opacity-40"
            disabled={messageInvalid}
          >
            {loadingProofUrl ? `Loading...` : `Send to ${topicData.topicName}`}
          </button>
        </div>
      </div>
    );
  }
}
