"use client";

import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructZupassPcdGetRequestUrl,
  getAnonTopicNullifier
} from "@pcd/passport-interface/src/PassportInterface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
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
  chatId: string;
  topicName: string;
  topicId: string;
  validEventIds: string[];
}

interface InvalidMessage {
  reason: string | undefined;
}

async function requestProof(
  message: string,
  chatId: string,
  topicId: string,
  validEventIds: string[]
) {
  const watermark = getMessageWatermark(message).toString();
  console.log("WATERMARK", watermark);
  const revealedFields = {};

  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      displayName: "Ticket",
      description: "",
      validatorParams: {
        eventIds: validEventIds,
        productIds: [],
        // TODO: surface which event ticket we are looking for
        notFoundMessage: "You don't have a ticket for this event."
      },
      hideIcon: true
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: revealedFields,
      userProvided: false,
      description: Object.keys(revealedFields).length
        ? "The following fields will be revealed"
        : "No information will be revealed"
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: getAnonTopicNullifier(
        parseInt(chatId),
        parseInt(topicId)
      ).toString(),
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

  let passportOrigin = `${process.env.NEXT_PUBLIC_PASSPORT_CLIENT_URL}/`;
  const returnUrl = `${
    process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL
  }/telegram/message?message=${encodeURIComponent(message)}&topicId=${topicId}`;

  const proofUrl = await constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "",
    description:
      "ZuRat requests a zero-knowledge proof of your ticket to post an anonymous message."
  });

  window.location.href = proofUrl;
}

export default function () {
  const [message, setMessage] = useState("");
  const [invalidMessage, setInvalidMessage] = useState<
    InvalidMessage | undefined
  >();
  const [topicData, setTopicData] = useState<TopicData | undefined>();
  const [loadingProofUrl, setLoadingProofUrl] = useState(false);
  const searchParams = useSearchParams();
  const topicDataRaw = searchParams.get("tgWebAppStartParam");

  useEffect(() => {
    if (!topicDataRaw) return;
    const topicDataEncoded = Buffer.from(topicDataRaw, "base64");
    const topicData = JSON.parse(
      decodeURIComponent(topicDataEncoded.toString("utf-8"))
    );
    setTopicData(topicData);
  }, [topicDataRaw]);

  useEffect(() => {
    if (message.length > MAX_HEADER_SIZE) {
      setInvalidMessage({ reason: "Message is too long" });
    } else if (message.startsWith("/")) {
      setInvalidMessage({ reason: "Message cannot start with '/'" });
    } else if (message.length === 0) {
      setInvalidMessage({ reason: undefined });
    } else if (invalidMessage) {
      setInvalidMessage(undefined);
    }
  }, [message]);

  const onClick = useCallback(async () => {
    setLoadingProofUrl(true);
    if (!topicData || !topicData.topicId || !topicData.validEventIds) return;
    await requestProof(
      message,
      topicData.chatId,
      topicData.topicId,
      topicData.validEventIds
    );
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
            className={`border-2 text-2xl rounded-lg text-black resize-none p-2 h-[25vh] select-text`}
            autoFocus
          />
        </div>
        <div className="mt-8 text-center flex flex-col w-full">
          {!invalidMessage ? (
            <button
              onClick={onClick}
              className="w-full bg-white text-[#037ee5] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4"
            >
              {loadingProofUrl
                ? `Loading...`
                : `Send to ${topicData.topicName}`}
            </button>
          ) : (
            <>
              {invalidMessage.reason && (
                <div className="p-2 bg-red-500 rounded-md mb-2">
                  <span className="text-white pb-2">
                    {invalidMessage.reason}
                  </span>
                </div>
              )}
            </>
          )}
          <span className="text-white mt-2">🔒 Anonymous posting</span>
        </div>
      </div>
    );
  }
}
