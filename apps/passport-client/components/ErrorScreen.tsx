import * as React from "react";
import { useLocation } from "react-router-dom";

export function ErrorScreen({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  const location = useLocation();
  console.log("Save self", location.search);
  return (
    <>
      <h1>❌</h1>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
    </>
  );
}
