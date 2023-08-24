import { EdDSAPCDPackage, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import {
  DeserializedDirectory,
  getDirectoryFromSnapshot,
  PCDDisk,
  PCDPackages
} from "@pcd/pcd-collection";
import { ArgumentTypeName, PCD } from "@pcd/pcd-types";
import * as path from "path";
import { DependencyList, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { v4 as uuid } from "uuid";

function useAsync<T>(
  func: () => Promise<T>,
  deps: DependencyList
): { value: T; err: Error } {
  const [value, setValue] = useState<T | undefined>();
  const [err, setErr] = useState<Error | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setValue(await func());
      } catch (e) {
        setErr(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value, err };
}

async function newPCD(id?: string) {
  id = id ?? uuid();

  const pcd = await EdDSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: newEdDSAPrivateKey()
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: ["5"]
    }
  });

  return pcd;
}

function useTestDisk() {
  return useAsync<PCDDisk | undefined>(async () => {
    const disk = new PCDDisk(new PCDPackages([EdDSAPCDPackage]));

    disk.mkdirp("/foo");
    disk.mkdirp("/bar");
    disk.mkdirp("/foo/baz");

    const pcd1 = await newPCD();
    const pcd2 = await newPCD();
    const pcd3 = await newPCD();
    const pcd4 = await newPCD();

    await disk.insertPCD(pcd1, "/");
    await disk.insertPCD(pcd2, "/foo");
    await disk.insertPCD(pcd3, "/bar");
    await disk.insertPCD(pcd4, "/foo/baz");

    console.log("created disk", disk);

    return disk;
  }, []);
}

function useDiskSnapshot(disk: PCDDisk | undefined): {
  value: DeserializedDirectory | undefined;
  err: Error | undefined;
} {
  return useAsync<DeserializedDirectory | undefined>(async () => {
    if (!disk) {
      return undefined;
    }

    return disk.getSnapshot();
  }, [disk]);
}

export function RenderDirectory({
  dir,
  setPath
}: {
  dir: DeserializedDirectory | undefined;
  setPath: (path: string) => void;
}) {
  const onDirectoryClick = useCallback(
    (dir: string) => {
      setPath(dir);
    },
    [setPath]
  );

  if (!dir) {
    return undefined;
  }

  const parent = path.parse(dir.path).dir;

  return (
    <DirectoryContainer>
      <div>
        <button
          onClick={() => {
            setPath(parent);
          }}
        >
          up ^
        </button>
        {" " + dir.path}
      </div>
      child directories: <br />
      {dir.childDirectories.map((dir) => (
        <DirectoryEntry dir={dir} onDirClick={onDirectoryClick} />
      ))}
      child pcds: <br />
      {dir.pcds.map((pcd) => (
        <FileEntry pcd={pcd} container={dir} />
      ))}
    </DirectoryContainer>
  );
}

function DirectoryEntry({
  dir,
  onDirClick
}: {
  dir: DeserializedDirectory;
  onDirClick: (dir: string) => void;
}) {
  const onClick = useCallback(() => {
    onDirClick(dir.path);
  }, [dir.path, onDirClick]);

  return (
    <DirectoryEntryContainer onClick={onClick}>
      {dir.name}
    </DirectoryEntryContainer>
  );
}

function FileEntry({
  pcd,
  container
}: {
  pcd: PCD;
  container: DeserializedDirectory;
}) {
  return <DirectoryEntryContainer>{pcd.id}</DirectoryEntryContainer>;
}

export function ScratchScreen() {
  const { value: testDisk, err } = useTestDisk();
  const { value: snapshot, err: err2 } = useDiskSnapshot(testDisk);

  console.log(err ?? err2);

  const [path, setPath] = useState("/");
  const directory = getDirectoryFromSnapshot(snapshot, path);

  return (
    <Container>
      File explorer <br />
      <RenderDirectory dir={directory} setPath={setPath} />
    </Container>
  );
}

const DirectoryContainer = styled.div`
  display: inline-block;
  width: 400px;
  border: 1px solid black;
  padding: 8px;
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: white;
  color: black;
  padding: 64px;
`;

const EntryContainer = styled.div`
  padding: 4px 8px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const DirectoryEntryContainer = styled(EntryContainer)``;

const PCDEntryContainer = styled(EntryContainer)``;
