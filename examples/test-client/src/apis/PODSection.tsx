import { POD, POD_INT_MAX, POD_INT_MIN, PODEntries, PODValue } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { Subscription, ZupassAPI } from "@pcd/zupass-client";
import JSONBig from "json-bigint";
import { ReactNode, useReducer, useState } from "react";
import { Button } from "../components/Button";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

const MAGIC_PRIVATE_KEY =
  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff";

export function PODSection(): ReactNode {
  const { z, connected } = useEmbeddedZupass();

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">PODs</h1>
      <div className="prose">
        <h2 className="text-lg font-bold mt-4">Query PODs</h2>
        <QueryPODs z={z} />
        <h2 className="text-lg font-bold mt-4">Insert POD</h2>
        <InsertPOD z={z} />
        <h2 className="text-lg font-bold mt-4">Delete POD</h2>
        <DeletePOD z={z} />
        <h2 className="text-lg font-bold mt-4">Subscribe to PODs</h2>
        <SubscribeToPODs z={z} />
      </div>
    </div>
  );
}

function QueryPODs({ z }: { z: ZupassAPI }): ReactNode {
  const [pods, setPODs] = useState<POD[]>([]);

  return (
    <div>
      <p>
        Querying PODs is done like this:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const q = p
.pod({
wis: p.int().range(BigInt(8), POD_INT_MAX),
str: p.int().range(BigInt(5), POD_INT_MAX),
});
const pods = await z.pod.query(q);
`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const q = p.pod({
              wis: p.int().range(BigInt(8), POD_INT_MAX),
              str: p.int().range(BigInt(5), POD_INT_MAX)
            });
            const pods = await z.pod.query(q);
            setPODs(pods);
          } catch (e) {
            console.log(e);
          }
        }}
        label="Query PODs"
      />
      {pods.length > 0 && (
        <pre className="whitespace-pre-wrap">
          {JSONBig.stringify(
            pods.map((p) => ({
              entries: p.content.asEntries(),
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
    }
  | {
      type: "REMOVE_ENTRY";
      key: string;
    };

const stringish = ["string", "eddsa_pubkey"];
const bigintish = ["int", "cryptographic"];

const insertPODReducer = function (
  state: PODEntries,
  action: Action
): PODEntries {
  switch (action.type) {
    case "ADD_ENTRY":
      let key = "entry";
      let n = 1;
      while (key in state) {
        key = `entry${n}`;
        n++;
      }
      state[key] = action.value;
      break;
    case "REMOVE_ENTRY":
      delete state[action.key];
      break;
    case "SET_KEY":
      state[action.newKey] = state[action.key];
      delete state[action.key];
      break;
    case "SET_TYPE":
      const existingType = state[action.key].type;

      if (
        stringish.includes(existingType) &&
        bigintish.includes(action.podValueType)
      ) {
        state[action.key] = {
          type: action.podValueType as "int" | "cryptographic",
          value: BigInt(0)
        };
      } else if (
        bigintish.includes(existingType) &&
        stringish.includes(action.podValueType)
      ) {
        state[action.key] = {
          type: action.podValueType as "string" | "eddsa_pubkey",
          value: state[action.key].value.toString()
        };
      } else {
        state[action.key].type = action.podValueType;
      }
      break;
    case "SET_VALUE":
      if (bigintish.includes(state[action.key].type)) {
        const value = BigInt(action.value);
        if (value >= POD_INT_MIN && value <= POD_INT_MAX) {
          state[action.key].value = value;
        }
      } else {
        state[action.key].value = action.value;
      }
      break;
  }
  return { ...state };
};

enum PODCreationState {
  None,
  Success,
  Failure
}

function InsertPOD({ z }: { z: ZupassAPI }): ReactNode {
  const [creationState, setCreationState] = useState<PODCreationState>(
    PODCreationState.None
  );
  const [signature, setSignature] = useState<string>("");
  const [entries, dispatch] = useReducer(insertPODReducer, {
    test: { type: "string", value: "Testing" }
  } satisfies PODEntries);
  return (
    <div>
      <p>
        To insert a POD, first we have to create one. Select the entries for the
        POD below:
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {Object.entries(entries).map(([name, value], index) => (
          <InsertPODEntry
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
        Then we can insert the POD:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const pod = POD.sign({
${Object.entries(entries)
  .map(([key, value]) => {
    return `  ${key}: { type: "${value.type}", value: ${
      bigintish.includes(value.type)
        ? `${value.value.toString()}n`
        : `"${value.value.toString()}"`
    } }`;
  })
  .join(",\n")}
}, privateKey);

await z.pod.insert(pod);`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const pod = POD.sign(entries, MAGIC_PRIVATE_KEY);
            await z.pod.insert(pod);
            setSignature(pod.signature);
            setCreationState(PODCreationState.Success);
          } catch (e) {
            setCreationState(PODCreationState.Failure);
          }
        }}
        label="Insert POD"
      />
      {creationState !== PODCreationState.None && (
        <div className="my-2">
          {creationState === PODCreationState.Success && (
            <div>
              POD inserted successfully! The signature is{" "}
              <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
                {signature}
              </code>
            </div>
          )}
          {creationState === PODCreationState.Failure && (
            <div>An error occurred while inserting your POD.</div>
          )}
        </div>
      )}
    </div>
  );
}

function InsertPODEntry({
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
          value={value.toString()}
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

enum PODDeletionState {
  None,
  Success,
  Failure
}

function DeletePOD({ z }: { z: ZupassAPI }): ReactNode {
  const [signature, setSignature] = useState<string>("");
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
          {`await z.pod.delete("${signature}");`}
        </code>
      </p>

      <TryIt
        onClick={async () => {
          try {
            await z.pod.delete(signature);
            setDeletionState(PODDeletionState.Success);
          } catch (e) {
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

function SubscribeToPODs({ z }: { z: ZupassAPI }): ReactNode {
  const [pods, setPODs] = useState<POD[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  return (
    <div>
      <p>
        Subscribing to updates about PODs is done like this:
        <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
          {`const q = p
.pod({
wis: p.int().range(BigInt(8), POD_INT_MAX),
str: p.int().range(BigInt(5), POD_INT_MAX),
});
const pods = await z.pod.subscribe(q);
`}
        </code>
      </p>
      <TryIt
        onClick={async () => {
          try {
            const q = p.pod({
              wis: p.int().range(BigInt(8), POD_INT_MAX),
              str: p.int().range(BigInt(5), POD_INT_MAX)
            });
            const sub = await z.pod.subscribe(q);
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
                entries: p.content.asEntries(),
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
