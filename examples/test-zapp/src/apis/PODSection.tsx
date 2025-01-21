import type { ParcnetAPI, Subscription } from "@parcnet-js/app-connector";
import {
  ClientConnectionState,
  useParcnetClient
} from "@parcnet-js/app-connector-react";
import type { PODData } from "@parcnet-js/podspec";
import * as p from "@parcnet-js/podspec";
import type { PODEntries, PODValue } from "@pcd/pod";
import { POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import JSONBig from "json-bigint";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useReducer, useState } from "react";
import { Button } from "../components/Button";
import { TryIt } from "../components/TryIt";

export function PODSection(): ReactNode {
  const { z, connectionState } = useParcnetClient();
  const [pod, setPOD] = useState<p.PODData | null>(null);

  return connectionState !== ClientConnectionState.CONNECTED ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">PODs</h1>
      <div className="prose">
        <h2 className="text-lg font-bold mt-4">Query PODs</h2>
        <QueryPODs z={z} />
        <h2 className="text-lg font-bold mt-4">Query Email PODs</h2>
        <QueryEmailPODs z={z} />
        <h2 className="text-lg font-bold mt-4">Sign POD</h2>
        <SignPOD z={z} setSignedPOD={setPOD} />
        <h2 className="text-lg font-bold mt-4">Sign POD with Prefix</h2>
        <SignPODWithPrefix z={z} setSignedPOD={setPOD} />
        <h2 className="text-lg font-bold mt-4">Insert POD</h2>
        <InsertPOD z={z} pod={pod} />
        <h2 className="text-lg font-bold mt-4">Delete POD</h2>
        <DeletePOD z={z} />
        <h2 className="text-lg font-bold mt-4">Subscribe to PODs</h2>
        <SubscribeToPODs z={z} />
      </div>
    </div>
  );
}

function QueryPODs({ z }: { z: ParcnetAPI }): ReactNode {
  const [pods, setPODs] = useState<p.PODData[] | undefined>(undefined);
  const [selectedCollection, setSelectedCollection] = useState<
    "Apples" | "Bananas"
  >("Apples");

  return (
    <div>
      <p>
        Querying PODs is done like this:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const q = p.pod({
  entries: {
    wis: {
      type: "int",
      inRange: { min: BigInt(8), max: POD_INT_MAX }
    },
    str: {
      type: "int",
      inRange: { min: BigInt(5), max: POD_INT_MAX }
    }
  }
});
const pods = await z.pod.collection("${selectedCollection}").query(q);
`}
        </code>
      </p>
      <div className="mt-2 mb-4">
        <label className="flex flex-row gap-2 items-center">
          <span className="text-gray-700">Collections</span>
          <select
            value={selectedCollection}
            onChange={(e) =>
              setSelectedCollection(e.target.value as "Apples" | "Bananas")
            }
            className="w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          >
            <option value="Apples">Apples</option>
            <option value="Bananas">Bananas</option>
          </select>
        </label>
      </div>
      <TryIt
        onClick={async () => {
          try {
            const q = p.pod({
              entries: {
                wis: {
                  type: "int",
                  inRange: { min: BigInt(8), max: POD_INT_MAX }
                },
                str: {
                  type: "int",
                  inRange: { min: BigInt(5), max: POD_INT_MAX }
                }
              }
            });
            const pods = await z.pod.collection(selectedCollection).query(q);
            setPODs(pods);
          } catch (e) {
            console.log(e);
          }
        }}
        label="Query PODs"
      />
      {pods !== undefined && (
        <pre className="whitespace-pre-wrap">
          {JSONBig.stringify(
            pods.map((p) => ({
              entries: p.entries,
              signature: p.signature,
              signerPublicKey: p.signerPublicKey
            })),
            null,
            2
          )}
        </pre>
      )}
    </div>
  );
}

function QueryEmailPODs({ z }: { z: ParcnetAPI }): ReactNode {
  const [pods, setPODs] = useState<p.PODData[] | undefined>(undefined);
  return (
    <div>
      <p>
        Querying Email PODs is done like this:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const q = p.pod({
  entries: {
    emailAddress: {
      type: "string"
    },
    semaphoreV4PublicKey: {
      type: "eddsa_pubkey"
    },
    pod_type: {
      type: "string",
      isMemberOf: [{ type: "string", value: "zupass.email" }]
    }
  }
});
const pods = await z.pod.collection("Email").query(q);
`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const q = p.pod({
              entries: {
                emailAddress: {
                  type: "string"
                },
                semaphoreV4PublicKey: {
                  type: "eddsa_pubkey"
                },
                pod_type: {
                  type: "string",
                  isMemberOf: [{ type: "string", value: "zupass.email" }]
                }
              }
            });
            const pods = await z.pod.collection("Email").query(q);
            console.log(pods);
            setPODs(pods);
          } catch (e) {
            console.log(e);
          }
        }}
        label="Query Email PODs"
      />
      {pods !== undefined && (
        <pre className="whitespace-pre-wrap">
          {JSONBig.stringify(
            pods.map((p) => ({
              entries: p.entries,
              signature: p.signature,
              signerPublicKey: p.signerPublicKey
            })),
            null,
            2
          )}
        </pre>
      )}
    </div>
  );
}

type Action =
  | {
      type: "SET_KEY";
      key: string;
      newKey: string;
    }
  | {
      type: "SET_VALUE";
      key: string;
      value: PODValue["value"];
    }
  | {
      type: "SET_TYPE";
      key: string;
      podValueType: PODValue["type"];
    }
  | {
      type: "ADD_ENTRY";
      value: PODValue;
      prefix?: string;
    }
  | {
      type: "REMOVE_ENTRY";
      key: string;
    };

const stringish = ["string", "eddsa_pubkey"];
const bigintish = ["int", "cryptographic"];

const editPODReducer = function (
  state: PODEntries,
  action: Action
): PODEntries {
  switch (action.type) {
    case "ADD_ENTRY": {
      const newState = { ...state };
      let key = `${action.prefix ?? ""}entry`;
      let n = 1;
      while (key in newState) {
        key = `entry${n}`;
        n++;
      }
      return { ...newState, [key]: action.value };
    }
    case "REMOVE_ENTRY": {
      const newState = { ...state };
      delete newState[action.key];
      return newState;
    }
    case "SET_KEY": {
      const newState = { ...state };
      newState[action.newKey] = newState[action.key];
      delete newState[action.key];
      return newState;
    }
    case "SET_TYPE": {
      const newState = { ...state };
      const existingType = newState[action.key].type;

      if (
        stringish.includes(existingType) &&
        bigintish.includes(action.podValueType)
      ) {
        newState[action.key] = {
          type: action.podValueType as "int" | "cryptographic",
          value: BigInt(0)
        };
      } else if (
        bigintish.includes(existingType) &&
        stringish.includes(action.podValueType)
      ) {
        newState[action.key] = {
          type: action.podValueType as "string" | "eddsa_pubkey",
          value: newState[action.key].value?.toString() ?? ""
        };
      } else {
        state[action.key].type = action.podValueType;
      }
      return newState;
    }
    case "SET_VALUE": {
      const newState = { ...state };
      if (bigintish.includes(newState[action.key].type)) {
        const value = BigInt(action.value as string);
        if (value >= POD_INT_MIN && value <= POD_INT_MAX) {
          newState[action.key].value = value;
        }
      } else {
        state[action.key].value = action.value;
      }
      return newState;
    }
  }
};

enum PODCreationState {
  None,
  Success,
  Failure
}

function SignPOD({
  z,
  setSignedPOD
}: {
  z: ParcnetAPI;
  setSignedPOD: Dispatch<SetStateAction<p.PODData | null>>;
}): ReactNode {
  const [creationState, setCreationState] = useState<PODCreationState>(
    PODCreationState.None
  );
  const [pod, setPOD] = useState<p.PODData | null>(null);
  const [entries, dispatch] = useReducer(editPODReducer, {
    test: { type: "string", value: "Testing" }
  } satisfies PODEntries);
  return (
    <div>
      <p>
        To sign a POD, first we have to create the entries. Select the entries
        for the POD below:
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {Object.entries(entries).map(([name, value], index) => (
          <EditPODEntry
            key={index}
            showLabels={index === 0}
            name={name}
            value={value.value}
            type={value.type}
            dispatch={dispatch}
          />
        ))}
        <Button
          onClick={() =>
            dispatch({
              type: "ADD_ENTRY",
              value: { type: "string", value: "" }
            })
          }
        >
          Add Another Entry
        </Button>
      </div>
      <p>
        Then we can sign the POD:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const pod = await z.pod.sign({
${Object.entries(entries)
  .map(([key, value]) => {
    return `  ${key}: { type: "${value.type}", value: ${
      bigintish.includes(value.type)
        ? `${value.value?.toString() ?? ""}n`
        : `"${value.value?.toString() ?? ""}"`
    } }`;
  })
  .join(",\n")}
});

`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const pod = await z.pod.sign(entries);
            setPOD(pod);
            setSignedPOD(pod);
            setCreationState(PODCreationState.Success);
          } catch (e) {
            console.error(e);
            setCreationState(PODCreationState.Failure);
          }
        }}
        label="Sign POD"
      />
      {creationState !== PODCreationState.None && (
        <div className="my-2">
          {creationState === PODCreationState.Success && (
            <div>
              POD signed successfully! The signature is{" "}
              <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
                {pod?.signature}
              </code>
            </div>
          )}
          {creationState === PODCreationState.Failure && (
            <div>An error occurred while signing your POD.</div>
          )}
        </div>
      )}
    </div>
  );
}

function SignPODWithPrefix({
  z,
  setSignedPOD
}: {
  z: ParcnetAPI;
  setSignedPOD: Dispatch<SetStateAction<PODData | null>>;
}): ReactNode {
  const [creationState, setCreationState] = useState<PODCreationState>(
    PODCreationState.None
  );
  const [pod, setPOD] = useState<PODData | null>(null);
  const [entries, dispatch] = useReducer(editPODReducer, {
    _UNSAFE_test: { type: "string", value: "Testing" }
  } satisfies PODEntries);
  return (
    <div>
      <p>
        To sign a POD, first we have to create the entries. Note that the
        entries must have a prefix of <code>_UNSAFE_</code>. Select the entries
        for the POD below:
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {Object.entries(entries).map(([name, value], index) => (
          <EditPODEntry
            key={index}
            showLabels={index === 0}
            name={name}
            value={value.value}
            type={value.type}
            dispatch={dispatch}
          />
        ))}
        <Button
          onClick={() =>
            dispatch({
              type: "ADD_ENTRY",
              value: { type: "string", value: "" },
              prefix: "_UNSAFE_"
            })
          }
        >
          Add Another Entry
        </Button>
      </div>
      <p>
        Then we can sign the POD:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const pod = await z.pod.sign({
${Object.entries(entries)
  .map(([key, value]) => {
    return `  ${key}: { type: "${value.type}", value: ${
      bigintish.includes(value.type)
        ? `${value.value?.toString() ?? ""}n`
        : `"${value.value?.toString() ?? ""}"`
    } }`;
  })
  .join(",\n")}
});

`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const pod = await z.pod.signPrefixed(entries);
            setPOD(pod);
            setSignedPOD(pod);
            setCreationState(PODCreationState.Success);
          } catch (e) {
            console.error(e);
            setCreationState(PODCreationState.Failure);
          }
        }}
        label="Sign POD with Prefix"
      />
      {creationState !== PODCreationState.None && (
        <div className="my-2">
          {creationState === PODCreationState.Success && (
            <div>
              POD signed successfully! The signature is{" "}
              <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
                {pod?.signature}
              </code>
            </div>
          )}
          {creationState === PODCreationState.Failure && (
            <div>An error occurred while signing your POD.</div>
          )}
        </div>
      )}
    </div>
  );
}

function EditPODEntry({
  name,
  value,
  type,
  dispatch,
  showLabels
}: {
  name: string;
  value: PODValue["value"];
  type: PODValue["type"];
  showLabels: boolean;
  dispatch: (action: Action) => void;
}): ReactNode {
  return (
    <div className="flex flex-row gap-2">
      <label className="block">
        {showLabels && <span className="text-gray-700">Name</span>}
        <input
          autoComplete="off"
          type="text"
          value={name}
          className="mt-1 block w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          placeholder=""
          onChange={(ev) =>
            dispatch({ type: "SET_KEY", key: name, newKey: ev.target.value })
          }
        />
      </label>
      <label className="block">
        {showLabels && <span className="text-gray-700">Type</span>}
        <select
          value={type}
          className="block w-full mt-1 rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          onChange={(ev) =>
            dispatch({
              type: "SET_TYPE",
              key: name,
              podValueType: ev.target.value as PODValue["type"]
            })
          }
        >
          <option value="string">String</option>
          <option value="int">Int</option>
          <option value="cryptographic">Cryptographic</option>
        </select>
      </label>
      <label className="block">
        {showLabels && <span className="text-gray-700">Value</span>}
        <input
          value={value?.toString() ?? ""}
          type={typeof value === "string" ? "text" : "number"}
          className="mt-1 block w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          placeholder=""
          onChange={(ev) =>
            dispatch({ type: "SET_VALUE", key: name, value: ev.target.value })
          }
          max={POD_INT_MAX.toString()}
          min={POD_INT_MIN.toString()}
        />
      </label>
      <div className="flex items-end">
        <Button onClick={() => dispatch({ type: "REMOVE_ENTRY", key: name })}>
          Remove
        </Button>
      </div>
    </div>
  );
}

function InsertPOD({
  z,
  pod
}: {
  z: ParcnetAPI;
  pod: p.PODData | null;
}): ReactNode {
  const [selectedCollection, setSelectedCollection] = useState<
    "Apples" | "Bananas"
  >("Apples");
  const [insertionState, setInsertionState] = useState<PODCreationState>(
    PODCreationState.None
  );
  if (pod === null) {
    return null;
  }
  return (
    <div>
      <p>
        To insert a POD, we must first create it. You can create a new POD by
        using the "Sign POD" section above.
      </p>
      <p>
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
          {`await z.pod.insert(pod);`}
        </code>
      </p>
      <div className="mt-2 mb-4">
        <label className="flex flex-row gap-2 items-center">
          <span className="text-gray-700">Collections</span>
          <select
            value={selectedCollection}
            onChange={(e) =>
              setSelectedCollection(e.target.value as "Apples" | "Bananas")
            }
            className="w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          >
            <option value="Apples">Apples</option>
            <option value="Bananas">Bananas</option>
          </select>
        </label>
      </div>
      <TryIt
        onClick={async () => {
          try {
            await z.pod.collection(selectedCollection).insert(pod);
            setInsertionState(PODCreationState.Success);
          } catch (_e) {
            setInsertionState(PODCreationState.Failure);
          }
        }}
        label="Insert POD"
      />
      {insertionState !== PODCreationState.None && (
        <div className="my-2">
          {insertionState === PODCreationState.Success && (
            <div>POD inserted successfully!</div>
          )}
          {insertionState === PODCreationState.Failure && (
            <div>An error occurred while inserting your POD.</div>
          )}
        </div>
      )}
    </div>
  );
}

enum PODDeletionState {
  None,
  Success,
  Failure
}

function DeletePOD({ z }: { z: ParcnetAPI }): ReactNode {
  const [signature, setSignature] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<
    "Apples" | "Bananas"
  >("Apples");
  const [deletionState, setDeletionState] = useState<PODDeletionState>(
    PODDeletionState.None
  );
  return (
    <div>
      <p>
        To delete a POD, we must specify the signature. You can use a signature
        from the POD you created above.
      </p>
      <div className="flex flex-row gap-2">
        <label className="block">
          <span className="text-gray-700">Signature</span>
          <input
            type="text"
            value={signature}
            className="mt-1 block w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
            placeholder=""
            onChange={(ev) => setSignature(ev.target.value)}
          />
        </label>
      </div>
      <p>
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
          {`await z.pod.collection("${selectedCollection}").delete("${signature}");`}
        </code>
      </p>

      <div className="mt-2 mb-4">
        <label className="flex flex-row gap-2 items-center">
          <span className="text-gray-700">Collections</span>
          <select
            value={selectedCollection}
            onChange={(e) =>
              setSelectedCollection(e.target.value as "Apples" | "Bananas")
            }
            className="w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          >
            <option value="Apples">Apples</option>
            <option value="Bananas">Bananas</option>
          </select>
        </label>
      </div>

      <TryIt
        onClick={async () => {
          try {
            await z.pod.collection(selectedCollection).delete(signature);
            setDeletionState(PODDeletionState.Success);
          } catch (_e) {
            setDeletionState(PODDeletionState.Failure);
          }
        }}
        label="Delete POD"
      />
      {deletionState !== PODDeletionState.None && (
        <div className="my-2">
          {deletionState === PODDeletionState.Success && (
            <div>POD deleted successfully!</div>
          )}
          {deletionState === PODDeletionState.Failure && (
            <div>An error occurred while deleting your POD.</div>
          )}
        </div>
      )}
    </div>
  );
}

function SubscribeToPODs({ z }: { z: ParcnetAPI }): ReactNode {
  const [pods, setPODs] = useState<PODData[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<
    "Apples" | "Bananas"
  >("Apples");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscription, setSubscription] = useState<Subscription<any> | null>(
    null
  );

  return (
    <div>
      <p>
        Subscribing to updates about PODs is done like this:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const q = p.pod({
  entries: {
    wis: {
      type: "int",
      inRange: { min: BigInt(8), max: POD_INT_MAX }
    },
    str: {
      type: "int",
      inRange: { min: BigInt(5), max: POD_INT_MAX }
    }
  }
});
const sub = await z.pod.collection("${selectedCollection}").subscribe(q);
`}
        </code>
      </p>
      <div className="mt-2 mb-4">
        <label className="flex flex-row gap-2 items-center">
          <span className="text-gray-700">Collections</span>
          <select
            value={selectedCollection}
            onChange={(e) =>
              setSelectedCollection(e.target.value as "Apples" | "Bananas")
            }
            className="w-full rounded-md bg-gray-100 border-transparent focus:border-gray-500 focus:bg-white focus:ring-0"
          >
            <option value="Apples">Apples</option>
            <option value="Bananas">Bananas</option>
          </select>
        </label>
      </div>
      <TryIt
        onClick={async () => {
          try {
            const q = p.pod({
              entries: {
                wis: {
                  type: "int",
                  inRange: { min: BigInt(8), max: POD_INT_MAX }
                },
                str: {
                  type: "int",
                  inRange: { min: BigInt(5), max: POD_INT_MAX }
                }
              }
            });
            const sub = await z.pod.collection(selectedCollection).subscribe(q);
            setSubscription(sub);
            sub.on("update", (update) => {
              setPODs(update);
            });
            const results = await sub.query();
            setPODs(results);
          } catch (e) {
            console.log(e);
          }
        }}
        label="Subscribe to PODs"
      />
      {pods.length > 0 && subscription !== null && (
        <div>
          <pre className="whitespace-pre-wrap">
            {JSONBig.stringify(
              pods.map((p) => ({
                entries: p.entries,
                signature: p.signature,
                signerPublicKey: p.signerPublicKey
              })),
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
