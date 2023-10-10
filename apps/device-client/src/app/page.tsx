"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Loading...");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const serviceWorkerPath = "/service-worker.js";

    if (!("serviceWorker" in navigator)) {
      setServiceWorkerStatus("serviceWorker not in navigator");
      return;
    }

    try {
      navigator.serviceWorker
        .register(serviceWorkerPath, {
          scope: "/"
        })
        .then(() => setServiceWorkerStatus("service worker registered"));
    } catch (e) {
      setServiceWorkerStatus(
        `error registering service worker:
        ${e}`
      );
    }
  }, []);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      console.log(e.code);
    };
    window.addEventListener("keydown", listener, { capture: true });
    return () =>
      window.removeEventListener("keydown", listener, { capture: true });
  }, []);

  const onSave = () => {
    localStorage.setItem("message", message);
  };

  return (
    <div
      onKeyDown={(e) => {
        console.log("hey", e);
        setMessage((m) => m + e.key);
      }}
      className="w-screen h-screen flex flex-col items-center bg-[#19473f] p-4"
    >
      <span className="text-white font-bold my-4">Device Scanner</span>
      <span className="text-white font-bold my-4">
        Service worker status: {serviceWorkerStatus}
      </span>
      <div className="flex flex-col gap-2 bg-[#206b5e] rounded-lg w-full p-2">
        <textarea
          ref={textareaRef}
          placeholder="Enter QR code output here"
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border-2 text-2xl rounded-lg text-black resize-none p-2 h-[30vh]"
        />
      </div>
      <div className="mt-8 text-center flex flex-col w-full">
        <button
          disabled={!message}
          onClick={() => alert(localStorage.getItem("message"))}
          className="w-full bg-white text-[#19473f] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4"
        >
          Get
        </button>
      </div>
      <div className="mt-8 text-center flex flex-col w-full">
        <button
          disabled={!message}
          onClick={onSave}
          className="w-full bg-white text-[#19473f] text-xl font-bold px-4 rounded-full focus:outline-none focus:shadow-outline py-4"
        >
          Save
        </button>
      </div>
    </div>
  );
}
