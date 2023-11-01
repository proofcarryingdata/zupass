"use client";

import Post from "@/components/post";
import { bigintToPseudonym } from "@pcd/util";
import { useEffect, useState } from "react";

export default function Page({ params }: { params: { nullifier: string } }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const getData = async () => {
      const data = await fetch(
        `${process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL}/telegram/anonget/${params.nullifier}`
      );
      const dataJson = await data.json();
      console.log(dataJson);

      setMessages(dataJson.map((d: any) => d.content));
    };
    getData();
  }, []);

  return (
    <div className="flex flex-col items-center bg-white p-4">
      <div className="flex items-center justify-center p-2 w-full">
        <span className="font-bold text-[#2e2e35]">ZK-TG</span>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <span className="text-[#2E2E35] font-bold mt-4 text-xl">
          {bigintToPseudonym(BigInt(params.nullifier))}
        </span>
        <span className="font-mono text-[#2e2e35] opacity-30">
          #{params.nullifier.substring(0, 4)}
        </span>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {messages.map((message) => (
          <Post title={"Devconnect Community Hub"} content={message} />
        ))}
      </div>
    </div>
  );
}
