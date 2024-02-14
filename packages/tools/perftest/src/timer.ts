import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { program } from "commander";
import logSymbols from "log-symbols";
import {
  EdDSATicketProveCase,
  EdDSATicketVerifyCase
} from "./cases/EdDSATicketTimer";
import {
  SemaphoreSignatureProveCase,
  SemaphoreSignatureVerifyCase
} from "./cases/SemaphoreSignatureTimer";
import {
  ZKEdDSAEventTicketProveCase,
  ZKEdDSAEventTicketVerifyCase
} from "./cases/ZKEdDSAEventTicketTimer";
import { DemoCase, TimerCase } from "./types";

const TIME_TEST_CONFIGS: Record<string, Record<string, () => TimerCase>> = {
  demo: {
    prove: () => new DemoCase(),
    verify: () => new DemoCase()
  },
  [EdDSATicketPCDPackage.name]: {
    prove: () => new EdDSATicketProveCase(),
    verify: () => new EdDSATicketVerifyCase()
  },
  [SemaphoreSignaturePCDPackage.name]: {
    prove: () => new SemaphoreSignatureProveCase(),
    verify: () => new SemaphoreSignatureVerifyCase()
  },
  [ZKEdDSAEventTicketPCDPackage.name]: {
    prove: () => new ZKEdDSAEventTicketProveCase(),
    verify: () => new ZKEdDSAEventTicketVerifyCase()
  }
};

function makeHelpPackageList(): string {
  let outStr = "\nSupported packages + operations:\n";
  for (const packageName of Object.keys(TIME_TEST_CONFIGS)) {
    for (const operationName of Object.keys(TIME_TEST_CONFIGS[packageName])) {
      outStr += `\t${packageName} ${operationName}\n`;
    }
  }
  return outStr;
}

async function timeOp(
  opName: string,
  iterationCount: number,
  op: () => Promise<void>
): Promise<void> {
  const startMS = performance.now();
  for (let i = 0; i < iterationCount; i++) {
    await op();
  }
  const endMS = performance.now();
  console.info(
    `${logSymbols.success}`,
    `${opName}${iterationCount > 1 ? ` (average of ${iterationCount})` : ""}: ${
      (endMS - startMS) / iterationCount
    }ms`
  );
}

async function timerDriver(
  caseMaker: () => TimerCase,
  iterationCount: number
): Promise<void> {
  const timerCase = caseMaker();
  console.info(`Running timing test of ${timerCase.name}...`);
  await timeOp("init", 1, () => timerCase.init());
  await timeOp("setup", 1, () => timerCase.setup());
  await timeOp("first op", 1, () => timerCase.op());
  await timeOp("second op", 1, () => timerCase.op());
  await timeOp("repeat op", iterationCount, () => timerCase.op());
}

program
  .command("timer")
  .description("Time a set of operations for a PCD packge")
  .argument("<pcd-package>", "Name of PCD package to test or 'all'.")
  .argument("<operation>", "Name of PCD operation or 'all'.")
  .argument("[count]", "Count of iterations for averaging.", 10)
  .addHelpText("after", makeHelpPackageList())
  .action(
    async (
      pcdPackage: string,
      pcdOperation: string,
      iterationCount: number
    ) => {
      const testCases: (() => TimerCase)[] = [];

      // Single package, or all packages
      let packageNames = [pcdPackage];
      if (pcdPackage === "all") {
        packageNames = Object.keys(TIME_TEST_CONFIGS);
      }

      for (const curPackageName of packageNames) {
        // Check the selected package exists.
        const packageConfigs = TIME_TEST_CONFIGS[curPackageName];
        if (!packageConfigs) {
          console.error(
            `${logSymbols.error}`,
            `No test config for package: ${curPackageName}${makeHelpPackageList()}`
          );
          process.exit(1);
        }

        // Single operation or all operations.
        if (pcdOperation === "all") {
          for (const operationName of Object.keys(packageConfigs)) {
            testCases.push(packageConfigs[operationName]);
          }
        } else {
          // Check the selected operation exists.
          const testCase = packageConfigs[pcdOperation];
          if (!testCase) {
            console.error(
              `${logSymbols.error}`,
              `No test config for operation: ${pcdPackage} ${pcdOperation}${makeHelpPackageList()}`
            );
            process.exit(1);
          }

          testCases.push(testCase);
        }
      }

      // Execute test cases.
      try {
        for (const testCase of testCases) {
          await timerDriver(testCase, iterationCount);
        }
      } catch (error) {
        console.error(`${logSymbols.error}`, `${error}`);
        process.exit(1);
      }

      // This shouldn't be necessary, but otherwise the program doesn't exit
      // after ZKEdDSAEventTicketPCD test cases.  Probably some zombie async
      // code which I don't have time to hunt down right now.
      process.exit(0);
    }
  );
