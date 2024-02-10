import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { program } from "commander";
import logSymbols from "log-symbols";
import {
  EdDSATicketProveCase,
  EdDSATicketVerifyCase
} from "./cases/EdDSATicketTimer";
import {
  ZKEdDSAEventTicketProveCase,
  ZKEdDSAEventTicketVerifyCase
} from "./cases/ZKEdDSAEventTicketTimer";
import { DemoCase, TimerCase } from "./types";

const TIME_TEST_CONFIGS: Record<string, Record<string, () => TimerCase>> = {
  demo: {
    demo: () => new DemoCase()
  },
  [EdDSATicketPCDPackage.name]: {
    prove: () => new EdDSATicketProveCase(),
    verify: () => new EdDSATicketVerifyCase()
  },
  [ZKEdDSAEventTicketPCDPackage.name]: {
    prove: () => new ZKEdDSAEventTicketProveCase(),
    verify: () => new ZKEdDSAEventTicketVerifyCase()
  }
};

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
  .argument("<pcd-package>", "Supported PCD package.")
  .argument("<operation>", "PCD operation (prove, verify).")
  .argument("[count]", "Count of iterations for averaging.", 10)
  .action(
    async (
      packageName: string,
      pcdOperation: string,
      iterationCount: number
    ) => {
      const testCases: (() => TimerCase)[] = [];
      if (packageName !== "all") {
        const testPackage = TIME_TEST_CONFIGS[packageName];
        if (!testPackage) {
          console.error(
            `${logSymbols.error}`,
            `No test config for package ${packageName}`
          );
          process.exit(1);
        }
        const testCase = testPackage[pcdOperation];
        if (!testCase) {
          console.error(
            `${logSymbols.error}`,
            `No test config for operation ${packageName}.${pcdOperation}`
          );
          process.exit(1);
        }
        testCases.push(testCase);
      } else {
        for (const testPackage of Object.values(TIME_TEST_CONFIGS)) {
          for (const testCase of Object.values(testPackage)) {
            testCases.push(testCase);
          }
        }
      }

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
