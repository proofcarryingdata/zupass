"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onClick = () => alert(message);

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-[#19473f] p-4">
      <span className="text-white font-bold my-4">Device Scanner</span>
      <div className="flex flex-col gap-2 bg-[#206b5e] rounded-lg w-full p-2">
        <textarea
          ref={textareaRef}
          placeholder="Enter QR code output here"
          autoFocus
          onBlur={() => textareaRef.current?.focus()}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border-2 text-2xl rounded-lg text-black resize-none p-2 h-[30vh]"
        />
      </div>
      <div className="mt-8 text-center flex flex-col w-full">
        <button
          disabled={!message}
          onClick={onClick}
          className="w-full bg-white text-[#19473f] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4"
        >
          Scan
        </button>
      </div>
    </div>
  );
}
