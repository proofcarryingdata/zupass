import { EdDSAPCDPackage, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { PCDDisk, PCDPackages } from "@pcd/pcd-collection";
import { DeserializedDirectory } from "@pcd/pcd-collection/src/util";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { DependencyList, useEffect, useState } from "react";
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

    const pcd = await newPCD();

    await disk.insertPCD(pcd, "/");
    await disk.insertPCD(pcd, "/foo");
    await disk.insertPCD(pcd, "/bar");
    await disk.insertPCD(pcd, "/foo/baz");

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
  dir
}: {
  dir: DeserializedDirectory | undefined;
}) {
  if (!dir) {
    return undefined;
  }

  return (
    <DirectoryContainer>
      path: {dir.path} <br />
      child directories: <br />
      {dir.childDirectories.map((dir) => (
        <div>{dir.name}</div>
      ))}
      child pcds: <br />
      {dir.pcds.map((pcd) => (
        <div>pcd: {pcd.id}</div>
      ))}
    </DirectoryContainer>
  );
}

export function ScratchScreen() {
  const { value: testDisk, err } = useTestDisk();
  const { value: snapshot, err: err2 } = useDiskSnapshot(testDisk);

  console.log(err ?? err2);

  const [path, setPath] = useState("/");

  return (
    <Container>
      File explorer <br />
      <RenderDirectory dir={snapshot} />
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
