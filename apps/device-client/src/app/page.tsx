"use client";

import { useEffect, useState } from "react";

function getLastValidURL(inputString: string) {
  const urlRegex = /(https?:\/\/[^\s\/$.?#].[^\s]*)$/i;
  const matches = inputString.match(urlRegex);

  if (matches) {
    return matches[matches.length - 1];
  } else {
    return null;
  }
}

function useKeyPress() {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      console.log(event.key);
      if (event.key === "Enter") {
        // Check url regex and navigate
        const url = getLastValidURL(typedText);
        if (url) {
          window.location.href = url;
        }
      }
      // Check if the pressed key is a url string
      if (/^[a-zA-Z0-9\-._~!$&'()*+,;=:@%/]$/.test(event.key)) {
        setTypedText((prevText) => prevText + event.key);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [typedText]);

  return typedText;
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Loading...");

  const typedText = useKeyPress();

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

  const onSave = () => {
    localStorage.setItem("message", message);
  };

  return (
    <div
      onKeyDown={(e) => {
        setMessage((m) => m + e.key);
      }}
      className="w-screen h-screen flex flex-col items-center bg-[#19473f] p-4"
    >
      <span className="text-white font-bold my-4">Device Scanner</span>
      <div>{typedText}</div>
      <span className="text-white font-bold my-4">
        Service worker status: {serviceWorkerStatus}
      </span>

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
