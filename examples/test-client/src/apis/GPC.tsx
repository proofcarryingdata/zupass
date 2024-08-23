import { GPCPCD, GPCPCDArgs } from "@pcd/gpc-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ReactNode, useState } from "react";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

const EXAMPLE_GPC_CONFIG = `{
  "pods": {
    "examplePOD": {
      "entries": {
        "origin": {
          "isRevealed": true
        }
      }
    }
  }
}`;

const args: GPCPCDArgs = {
  proofConfig: {
    argumentType: ArgumentTypeName.String,
    value: EXAMPLE_GPC_CONFIG,
    userProvided: false
  },
  pods: {
    argumentType: ArgumentTypeName.RecordContainer,
    value: {
      examplePOD: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: PODPCDPackage.name,
        value: undefined,
        userProvided: true,
        displayName: "Example POD"
      }
    },
    validatorParams: {
      proofConfig: EXAMPLE_GPC_CONFIG,
      membershipLists: undefined,
      prescribedEntries: undefined,
      prescribedSignerPublicKeys: undefined
    }
  },
  identity: {
    argumentType: ArgumentTypeName.PCD,
    pcdType: SemaphoreIdentityPCDPackage.name,
    value: undefined,
    userProvided: true
  },
  externalNullifier: {
    argumentType: ArgumentTypeName.String,
    value: undefined,
    userProvided: false
  },
  membershipLists: {
    argumentType: ArgumentTypeName.String,
    value: undefined,
    userProvided: false
  },
  watermark: {
    argumentType: ArgumentTypeName.String,
    value: "watermark",
    userProvided: false
  }
};

export function GPC(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [proof, setProof] = useState<SerializedPCD<GPCPCD>>();

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">GPC</h1>
      <div className="prose">
        <div>
          <p>
            Generating a GPC proof is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const EXAMPLE_GPC_CONFIG = \`{
  "pods": {
    "examplePOD": {
      "entries": {
        "origin": {
          "isRevealed": true
        }
      }
    }
  }
}\`;

const args: GPCPCDArgs = {
  proofConfig: {
    argumentType: ArgumentTypeName.String,
    value: EXAMPLE_GPC_CONFIG,
    userProvided: false
  },
  pods: {
    argumentType: ArgumentTypeName.RecordContainer,
    value: {
      examplePOD: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: PODPCDPackage.name,
        value: undefined,
        userProvided: true,
        displayName: "Example POD"
      }
    },
    validatorParams: {
      proofConfig: EXAMPLE_GPC_CONFIG,
      membershipLists: undefined,
      prescribedEntries: undefined,
      prescribedSignerPublicKeys: undefined
    }
  },
  identity: {
    argumentType: ArgumentTypeName.PCD,
    pcdType: SemaphoreIdentityPCDPackage.name,
    value: undefined,
    userProvided: true
  },
  externalNullifier: {
    argumentType: ArgumentTypeName.String,
    value: undefined,
    userProvided: false
  },
  membershipLists: {
    argumentType: ArgumentTypeName.String,
    value: undefined,
    userProvided: false
  },
  watermark: {
    argumentType: ArgumentTypeName.String,
    value: "watermark",
    userProvided: false
  }
};
  
`}
              const gpcProof = await z.gpc.prove(args);
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                setProof(await z.gpc.prove(args));
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get GPC Proof"
          />
          {proof && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(proof, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
