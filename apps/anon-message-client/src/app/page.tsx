"use client";

import CopyButton from "@/components/CopyButton";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  AnonTopicDataPayload,
  AnonWebAppPayload,
  PayloadType,
  constructZupassPcdGetRequestUrl
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { getAnonTopicNullifier, getMessageWatermark } from "@pcd/util";
import {
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const MAX_HEADER_SIZE = 280; // max tweet size

interface InvalidMessage {
  reason: string | undefined;
}

async function requestProof(
  message: string,
  chatId: number,
  topicId: number,
  validEventIds: string[]
): Promise<void> {
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
      value: getAnonTopicNullifier().toString(),
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

  const passportOrigin = `${process.env.NEXT_PUBLIC_PASSPORT_CLIENT_URL}/`;
  const returnUrl = `${
    process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL
  }/telegram/message/?message=${encodeURIComponent(
    message
  )}&topicId=${topicId}&chatId=${chatId}`;

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

export default function (): JSX.Element {
  const [message, setMessage] = useState("");
  const [invalidMessage, setInvalidMessage] = useState<
    InvalidMessage | undefined
  >();
  const [topicData, setTopicData] = useState<
    AnonTopicDataPayload | undefined
  >();
  const [loadingProofUrl, setLoadingProofUrl] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const topicDataRaw = searchParams.get("tgWebAppStartParam");

  const showInfoVariants = {
    open: { opacity: 1, transform: "translateY(0px)" },
    collapsed: { opacity: 0, transform: "translateY(20px)" }
  };

  useEffect(() => {
    if (!topicDataRaw) return;

    const anonPayload: AnonWebAppPayload = JSON.parse(
      decodeURIComponent(topicDataRaw)
    );

    if (anonPayload.type === PayloadType.AnonTopicDataPayload) {
      setTopicData(anonPayload);
    }
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
  }, [message, invalidMessage]);

  const onClick = useCallback(async () => {
    setLoadingProofUrl(true);
    if (
      !topicData ||
      !topicData.value.topicId ||
      !topicData.value.validEventIds ||
      !topicData.value.chatId
    )
      return;
    await requestProof(
      message,
      topicData.value.chatId,
      topicData.value.topicId,
      topicData.value.validEventIds
    );
    setLoadingProofUrl(false);
  }, [message, topicData]);

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
      <div className="flex flex-col items-center bg-[#037EE5] p-4">
        <span className="text-white font-bold my-4">
          {`Post to ${topicData.value.topicName}`}
        </span>
        <div className="flex flex-col gap-2 bg-[#50ACF9] rounded-lg w-full p-2">
          <textarea
            placeholder="Type your anonymous message here"
            value={message}
            onChange={(e): void => setMessage(e.target.value)}
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
                : `Send to ${topicData.value.topicName}`}
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
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={showInfoVariants}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2 text-left mx-auto mt-4 bg-[#50ACF9] p-4 rounded-lg"
              >
                <div className="flex justify-between items-center mb-3">
                  {expanded ? (
                    <div
                      onClick={(): void => setExpanded(false)}
                      className="cursor-pointer"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
                          fill="#ffffff"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </div>
                  ) : (
                    <div
                      onClick={(): void => setExpanded(true)}
                      className="cursor-pointer"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0.877075 7.49972C0.877075 3.84204 3.84222 0.876892 7.49991 0.876892C11.1576 0.876892 14.1227 3.84204 14.1227 7.49972C14.1227 11.1574 11.1576 14.1226 7.49991 14.1226C3.84222 14.1226 0.877075 11.1574 0.877075 7.49972ZM7.49991 1.82689C4.36689 1.82689 1.82708 4.36671 1.82708 7.49972C1.82708 10.6327 4.36689 13.1726 7.49991 13.1726C10.6329 13.1726 13.1727 10.6327 13.1727 7.49972C13.1727 4.36671 10.6329 1.82689 7.49991 1.82689ZM8.24993 10.5C8.24993 10.9142 7.91414 11.25 7.49993 11.25C7.08571 11.25 6.74993 10.9142 6.74993 10.5C6.74993 10.0858 7.08571 9.75 7.49993 9.75C7.91414 9.75 8.24993 10.0858 8.24993 10.5ZM6.05003 6.25C6.05003 5.57211 6.63511 4.925 7.50003 4.925C8.36496 4.925 8.95003 5.57211 8.95003 6.25C8.95003 6.74118 8.68002 6.99212 8.21447 7.27494C8.16251 7.30651 8.10258 7.34131 8.03847 7.37854L8.03841 7.37858C7.85521 7.48497 7.63788 7.61119 7.47449 7.73849C7.23214 7.92732 6.95003 8.23198 6.95003 8.7C6.95004 9.00376 7.19628 9.25 7.50004 9.25C7.8024 9.25 8.04778 9.00601 8.05002 8.70417L8.05056 8.7033C8.05924 8.6896 8.08493 8.65735 8.15058 8.6062C8.25207 8.52712 8.36508 8.46163 8.51567 8.37436L8.51571 8.37433C8.59422 8.32883 8.68296 8.27741 8.78559 8.21506C9.32004 7.89038 10.05 7.35382 10.05 6.25C10.05 4.92789 8.93511 3.825 7.50003 3.825C6.06496 3.825 4.95003 4.92789 4.95003 6.25C4.95003 6.55376 5.19628 6.8 5.50003 6.8C5.80379 6.8 6.05003 6.55376 6.05003 6.25Z"
                          fill="#ffffff"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </div>
                  )}

                  <span className="text-white font-semibold">
                    What is anonymous posting?
                  </span>
                  <div
                    className="cursor-pointer"
                    onClick={(): void => setShowInfo(false)}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                        fill="#ffffff"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </div>
                {!expanded ? (
                  <div>
                    <span className="text-white opacity-80">
                      ZuRat never learns your Zupass account or email, only a
                      proof that you have a ticket and a unique nullifier not
                      linked to your email.
                    </span>
                    <div className="flex item-center gap-4 mx-auto mt-4 w-full">
                      <button
                        className="w-full flex justify-center items-center rounded-lg bg-white text-[#50acf9] px-6 py-2 cursor-pointer mx-auto font-medium shadow-sm"
                        onClick={(): void => setExpanded(true)}
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {" "}
                    <span className="text-white opacity-80">
                      If you're posting through a Telegram Mini App, Telegram
                      automatically bundles some deanonymizing info. We never
                      see or store this, but if you don't want to trust us on
                      that, you can also copy a clean link to this submission
                      page and access it via a secure browser.
                    </span>
                    <div className="flex item-center gap-4 mx-auto mt-4 w-full">
                      <CopyButton
                        link={
                          window.location.origin +
                          window.location.pathname +
                          window.location.search
                        }
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
}
