import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName, PCD } from "@pcd/pcd-types";
import {
  PODEntries,
  PODPCDClaim,
  PODPCDPackage,
  PODPCDProof
} from "@pcd/pod-pcd";
import { randomUUID, sleep } from "@pcd/util";
import { useStateContext } from "../../../src/appHooks";
import { savePCDs } from "../../../src/localstorage";

interface DemoPCDTask {
  pcd: PCD;
  folder: string;
  timeout: number;
}

async function makePod(
  pkey: string,
  values: Record<string, string>
): Promise<PCD<PODPCDClaim, PODPCDProof>> {
  const entries: PODEntries = {};
  for (const [k, v] of Object.entries(values)) {
    entries[k] = {
      type: "string",
      value: v
    };
  }

  return await PODPCDPackage.prove({
    entries: {
      value: entries,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: pkey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: randomUUID(),
      argumentType: ArgumentTypeName.String
    }
  });
}

export function useRunDemo(): () => Promise<void> {
  const state = useStateContext();
  const pkey = newEdDSAPrivateKey();

  return async () => {
    alert("running demo");
    const tasks: DemoPCDTask[] = [
      {
        pcd: await makePod(pkey, {
          zupass_title: "hello world",
          content: "welcome to zupass"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "this is zmail",
          content: "this is zmail"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "you can use it to look at your PODs",
          content: "you can use it to look at your PODs"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "have fun!",
          content: "xD"
        }),
        folder: "announcements",
        timeout: 1000
      }
    ];
    alert("generated tasks");

    console.log(`demo contains ${tasks.length} tasks`);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      await sleep(task.timeout);
      state.getState().pcds.add(task.pcd);
      state.getState().pcds.setFolder(task.pcd.id, task.folder);
      await savePCDs(state.getState().pcds);
    }
  };
}
