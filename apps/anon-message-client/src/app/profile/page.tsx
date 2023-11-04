"use client";

import Post from "@/components/post";
import { bigIntToPseudonymEmoji, bigIntToPseudonymName } from "@pcd/util";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Loading from "./loading";

interface AnonMessageWithDetails {
  id: number;
  nullifier: string;
  chat_topic_id: number;
  content: string;
  proof: string;
  chat_name: string;
  topic_name: string;
  message_timestamp: string;
}

export default function Page() {
  const [messages, setMessages] = useState<
    AnonMessageWithDetails[] | undefined
  >(undefined);
  const searchParams = useSearchParams();
  const nullifierHash = searchParams.get("nullifierHash");

  useEffect(() => {
    const getData = async (): Promise<AnonMessageWithDetails[] | undefined> => {
      if (!nullifierHash) return Promise.resolve(undefined);
      const data = await fetch(
        `${process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL}/telegram/anonget/${nullifierHash}`,
        { cache: "no-store" }
      );
      const dataJson = await data.json();
      return dataJson;
    };

    getData().then((m) => setMessages(m));
  }, [nullifierHash]);

  if (!nullifierHash || !messages) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col items-center bg-white p-4">
        <div className="flex items-center justify-center p-2 w-full">
          <span className="font-bold text-[#2e2e35]">ZK-TG</span>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-1">
              {bigIntToPseudonymEmoji(BigInt(nullifierHash))}
            </span>
            <span className="text-[#2E2E35] font-bold text-xl">
              {bigIntToPseudonymName(BigInt(nullifierHash))}
            </span>
          </div>
          <span className="font-mono text-[#2e2e35] opacity-30">
            #{nullifierHash.substring(0, 4)}
          </span>
        </div>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center mt-4">
            <span className="text-[#2e2e35] opacity-30 text-xl ">
              No messages ... yet
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4 w-full">
            {messages
              .sort(
                (a, b) =>
                  new Date(b.message_timestamp).getTime() -
                  new Date(a.message_timestamp).getTime()
              )
              .map((message: AnonMessageWithDetails, i: number) => (
                <Post
                  title={message.chat_name}
                  content={message.content}
                  key={i}
                  timestamp={message.message_timestamp}
                />
              ))}
          </div>
        )}
      </div>
    </Suspense>
  );
}
