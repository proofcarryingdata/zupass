"use client";

import { useState } from "react";

export default function SubmitMessagePage() {
  const [message, setMessage] = useState("");
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
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Submit question
        </button>
      </div>
    </div>
  );
}
