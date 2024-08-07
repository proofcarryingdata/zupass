import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { connect, ZupassAPI, ZupassFolderContent } from "@pcd/zupass-client";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import { Button } from "./components/Button";

const ZUPASS_URL = "http://localhost:3000";
// For convenience; in the real world key management is more difficult.
const MAGIC_PRIVATE_KEY =
  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff";

const zapp = {
  name: "test-client",
  permissions: ["read", "write"]
};

export default function Main() {
  const [zupass, setZupass] = useState<ZupassAPI | null>(null);
  const [list, setList] = useState<ZupassFolderContent[]>([]);
  const [pcd, setPCD] = useState("");
  const [connecting, setConnecting] = useState(false);

  return (
    <div className="container mx-auto my-8">
      <h1 className="text-2xl font-bold my-4">TEST CLIENT</h1>
      <div id="zupass"></div>
      {!zupass ? (
        <Button
          loading={connecting}
          onClick={() => {
            const p = connect(
              zapp,
              document.querySelector("#zupass"),
              ZUPASS_URL
            );
            setConnecting(true);
            p.then((client) => {
              setZupass(client);
              setConnecting(false);
            });
          }}
        >
          Connect to Zupass
        </Button>
      ) : (
        <div>Connected!</div>
      )}
      {zupass && (
        <div>
          <button
            onClick={async () => {
              try {
                const folderList = await zupass.fs.list("/");
                setList(folderList);
              } catch (e) {
                console.log(e);
              }
            }}
          >
            List root folder
          </button>
        </div>
      )}
      {list.length > 0 && (
        <div>
          {list.map((item) => (
            <div key={item.type === "folder" ? item.name : item.id}>
              {item.type === "folder" ? (
                `Folder: ${item.name}`
              ) : (
                <div
                  style={{ cursor: "pointer" }}
                  onClick={async () => {
                    const pcd = await zupass.fs.get(item.id);
                    setPCD(JSON.stringify(pcd, null, 2));
                  }}
                >
                  PCD: ${item.id} (${item.pcdType})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pcd.length > 0 && <div>{pcd}</div>}
      {zupass && (
        <div>
          <button
            onClick={async () => {
              const name = window.prompt("PCD name?");
              const pod = await PODPCDPackage.prove({
                entries: {
                  argumentType: ArgumentTypeName.Object,
                  value: {
                    name: {
                      type: "string",
                      value: name
                    }
                  }
                },
                privateKey: {
                  argumentType: ArgumentTypeName.String,
                  value: MAGIC_PRIVATE_KEY
                },
                id: {
                  argumentType: ArgumentTypeName.String,
                  value: undefined
                }
              });
              await zupass.fs.put("Test", await PODPCDPackage.serialize(pod));
            }}
          >
            Add PCD
          </button>
        </div>
      )}
    </div>
  );
}

const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<Main />);
