import { connect, ZupassAPI, ZupassFolderContent } from "@pcd/zupass-client";
import { useState } from "react";
import { createRoot } from "react-dom/client";

const ZUPASS_URL = "http://localhost:3000";

const zapp = {
  name: "test-client",
  permissions: ["read", "write"]
};

export default function Main() {
  const [zupass, setClient] = useState<ZupassAPI | null>(null);
  const [list, setList] = useState<ZupassFolderContent[]>([]);
  return (
    <div>
      <h1>TEST CLIENT</h1>
      <div style={{ display: "none" }} id="zupass"></div>
      <button
        onClick={() => {
          const p = connect(
            zapp,
            document.querySelector("#zupass"),
            ZUPASS_URL
          );
          console.log(p);
          p.then((client) => setClient(client));
        }}
      >
        Connect to Zupass
      </button>
      {zupass && (
        <div>
          <button
            onClick={async () => {
              const folderList = await zupass.fs.list("/");
              setList(folderList);
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
              {item.type === "folder"
                ? `Folder: ${item.name}`
                : `PCD: ${item.id} (${item.pcdType})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<Main />);
