import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import * as React from "react";
import { useCallback, useContext, useState } from "react";
import { DispatchContext } from "../../../src/dispatch";
import { err } from "../../../src/util";
import { Button, H1, Spacer } from "../../core";
import { AppHeader } from "../../shared/AppHeader";
import { PCDArgs } from "../../shared/PCDArgs";

/**
 * Renders a UI in response to a request from the passport to calculate
 * a particular PCD. For arguments which are filled in by the requester
 * of the PCD, displays those hardcoded values. For arguments that the
 * user must fill in, like numbers, strings, and other PCDs, displays
 * HTML input fields that users will fill in by hand. For arguments that
 * are objects, supports loading from a URL.
 */
export function GenericProveScreen({ req }: { req: PCDGetRequest }) {
  const [state, dispatch] = useContext(DispatchContext);
  const [args, setArgs] = useState(JSON.parse(JSON.stringify(req.args)));
  const pcdPackage = state.pcds.getPackage(req.pcdType);
  const onProveClick = useCallback(async () => {
    const pcd = await pcdPackage.prove(args);
    const serialized = await pcdPackage.serialize(pcd);
    window.location.href = `${req.returnUrl}?proof=${JSON.stringify(
      serialized
    )}`;
  }, [args, pcdPackage, req.returnUrl]);

  if (req.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  const pageTitle = req.options?.title ?? "Prove " + req.pcdType;

  return (
    <div>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H1>🔑 &nbsp; {pageTitle}</H1>
      {req.options?.description && (
        <>
          <Spacer h={8} />
          <p>{req.options.description}</p>
        </>
      )}

      <Spacer h={24} />
      {req.options?.debug && <pre>{JSON.stringify(args, null, 2)}</pre>}
      <PCDArgs args={args} setArgs={setArgs} pcdCollection={state.pcds} />
      <Spacer h={16} />
      <Button onClick={onProveClick}>PROVE</Button>
      <Spacer h={64} />
    </div>
  );
}
