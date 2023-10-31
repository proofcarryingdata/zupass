"use client";

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
    <div className="w-screen h-screen flex flex-col items-center bg-[#037EE5] p-4">
      <span className="text-white font-bold my-4 text-xl">
        {bigintToPseudonym(BigInt(params.nullifier))}
      </span>
      <div>
        <span className="text-white font-bold my-4">Posts</span>
      </div>
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <div className="bg-white rounded-lg p-4 text-black">{message}</div>
        ))}
      </div>
    </div>
  );
}
