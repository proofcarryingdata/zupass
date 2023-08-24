import { PCDDisk, PCDPackages } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import NodeRSA from "node-rsa";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

async function newPCD(id?: string) {
  id = id ?? uuid();
  const pkey = new NodeRSA({ b: 512 });

  const pcd = await RSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: pkey.exportKey("private")
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "signed message"
    }
  });

  return pcd;
}

function useTestDisk(): PCDDisk | undefined {
  const [disk, setDisk] = useState<PCDDisk | undefined>();

  useEffect(() => {
    (async () => {
      const disk = new PCDDisk(new PCDPackages([RSAPCDPackage]));

      disk.mkdirp("/foo");
      disk.mkdirp("/bar");
      disk.mkdirp("/foo/baz");

      const pcd = await newPCD();

      await disk.insertPCD(pcd, "/");
      await disk.insertPCD(pcd, "/foo");
      await disk.insertPCD(pcd, "/bar");
      await disk.insertPCD(pcd, "/foo/baz");

      setDisk(disk);
    })();
  }, []);

  return disk;
}

export function ScratchScreen() {
  const testDisk = useTestDisk();

  return <div>Scratch Screen</div>;
}
