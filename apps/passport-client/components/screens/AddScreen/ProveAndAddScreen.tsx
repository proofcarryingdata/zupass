import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import React from "react";

export function ProveAndAddScreen({
  request,
}: {
  request: PCDProveAndAddRequest;
}) {
  return (
    <div>
      prove and add <br />
      {JSON.stringify(request)}
    </div>
  );
}
