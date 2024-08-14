import { SerializedPCD } from "@pcd/pcd-types";
import { ZupassFolderContent } from "@pcd/zupass-client";
import { ReactNode, useMemo, useState } from "react";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";
import { ZUPASS_URL } from "../main";

function TryIt({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Try it:</span>
      <button className="btn btn-primary" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}

const sampleSerializedPCD =
  '{"pcd":"{\\"id\\":\\"3de7d407-9990-41ce-b038-bc9dc39a11fb\\",\\"claim\\":{\\"entries\\":{\\"owner\\":{\\"type\\":\\"cryptographic\\",\\"value\\":18711405342588116796533073928767088921854096266145046362753928030796553161041},\\"zupass_description\\":{\\"type\\":\\"string\\",\\"value\\":\\"friendly kitty says hello\\"},\\"zupass_display\\":{\\"type\\":\\"string\\",\\"value\\":\\"collectable\\"},\\"zupass_image_url\\":{\\"type\\":\\"string\\",\\"value\\":\\"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Felis_catus-cat_on_snow.jpg/358px-Felis_catus-cat_on_snow.jpg\\"},\\"zupass_title\\":{\\"type\\":\\"string\\",\\"value\\":\\"friendly kitty\\"}},\\"signerPublicKey\\":\\"su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI\\"},\\"proof\\":{\\"signature\\":\\"JEVdyUD5GzZuq1HKBRR4EdVSm5IZ2hVcUWOsZzxEfofp7GrNkwQcPAqqvDY6PFy2SI5uym90g7EuGF93ylV2Aw\\"}}","type":"pod-pcd"}';

export function FileSystem(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [list, setList] = useState<ZupassFolderContent[]>([]);
  const [pcd, setPCD] = useState<SerializedPCD>();
  const [pcdAdded, setPCDAdded] = useState(false);
  const zupassUrl = useMemo(() => {
    return localStorage.getItem("zupassUrl") || ZUPASS_URL;
  }, []);

  const pcdId = useMemo(() => {
    return list.find((item) => item.type === "pcd")?.id;
  }, [list]);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">File system</h1>
      <div className="prose">
        <div>
          <p>
            Listing the contents of a directory is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              const folderList = await z.fs.list("/");
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const folderList = await z.fs.list("/");
                setList(folderList);
              } catch (e) {
                console.log(e);
              }
            }}
            label="List root folder"
          />
          {list.length > 0 && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(list, null, 2)}
            </pre>
          )}
        </div>
        {list.length > 0 && (
          <div>
            <p>
              Getting the contents of a PCD is done like this:
              <code className="block text-xs font-base rounded-md p-2">
                const file = await z.fs.get("{pcdId}");
              </code>
            </p>
            <TryIt
              onClick={async () => {
                try {
                  const pcd = await z.fs.get(`${pcdId}`);
                  setPCD(pcd);
                } catch (e) {
                  console.log(e);
                }
              }}
              label="Get PCD"
            />
            {pcd && (
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(pcd, null, 2)}
              </pre>
            )}
          </div>
        )}
        <div>
          <p>
            Adding a PCD is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              const file = await z.fs.put("{pcdId}", serializedPCD);
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const file = await z.fs.put(
                  "/Testing",
                  JSON.parse(sampleSerializedPCD)
                );
                setPCDAdded(true);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Add PCD"
          />
          {pcdAdded && (
            <p>
              PCD added!{" "}
              <a href={zupassUrl} target="_blank">
                View in Zupass
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
