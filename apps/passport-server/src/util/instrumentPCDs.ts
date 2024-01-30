import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import { PCDPackage } from "@pcd/pcd-types";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { traced } from "../services/telemetryService";
import { logger } from "./logger";

export function instrumentPCDs(): void {
  logger(`[INIT] instrumenting PCDs`);

  [
    EdDSAPCDPackage,
    EdDSATicketPCDPackage,
    RSAImagePCDPackage,
    RSAPCDPackage,
    EmailPCDPackage,
    SemaphoreSignaturePCDPackage,
    SemaphoreGroupPCDPackage
  ].forEach(instrumentPackage);
}

function instrumentPackage(pcdPackage: PCDPackage): void {
  ["prove", "verify", "serialize", "deserialize", "init"].forEach(
    (functionName) => instrumentSingleFunction(pcdPackage, functionName)
  );
}

function instrumentSingleFunction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pcdPackage: PCDPackage<unknown, unknown, any, unknown>,
  functionName: string
): void {
  logger(`[INIT] instrumenting ${pcdPackage.name}.${functionName}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packageAsAny = pcdPackage as any;
  const uninstrumentedFunction = packageAsAny[functionName];

  if (uninstrumentedFunction) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packageAsAny[functionName] = (...args: any[]): any => {
      return traced("PCDPackage", functionName, async (span) => {
        span?.setAttribute("pcd_package_name", pcdPackage.name);
        span?.setAttribute("function_name", functionName);

        return uninstrumentedFunction(...args);
      });
    };
  }
}
