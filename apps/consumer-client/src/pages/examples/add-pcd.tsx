import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  EthereumGroupPCDPackage,
  getRawPubKeyBuffer,
  GroupType
} from "@pcd/ethereum-group-pcd";
import { EthereumOwnershipPCDPackage } from "@pcd/ethereum-ownership-pcd";
import {
  constructPassportPcdAddRequestUrl,
  constructPassportPcdProveAndAddRequestUrl,
  openSignedZuzaluSignInPopup,
  usePassportPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { WebAuthnPCDPackage } from "@pcd/webauthn-pcd";
import { Poseidon, Tree } from "@personaelabs/spartan-ecdsa";
import { Identity } from "@semaphore-protocol/identity";
import { startRegistration } from "@simplewebauthn/browser";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import { ethers } from "ethers";
import JSONBig from "json-bigint";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL, ZUZALU_SEMAPHORE_GROUP_URL } from "../../constants";
import { sendPassportRequest } from "../../util";

/**
 * Example 3rd party application page which shows how to add
 * PCDs into the passport.
 */
export default function Page() {
  return (
    <div>
      <HomeLink />
      <h2>Prove and Add</h2>
      <p>
        This page contains several examples of how to add PCDs to the passport.
        You can add a PCD to the passport in one of two ways:
      </p>
      <ul>
        <li>
          Add a PCD (which can be kind of dangerous if the user then expects
          that PCD to be private, as is the case for adding a raw Semaphore
          Identity).
        </li>
        <li>
          Prove, and <i>then</i> add the PCD to the passport. The application
          that initiates this does not get a copy of the PCD back, it just adds
          it to the passport.
        </li>
      </ul>
      <ExampleContainer>
        <button onClick={addGroupMembershipProofPCD}>
          prove and add a group membership proof
        </button>
        <br />
        <br />
        <button onClick={addSignatureProofPCD}>
          prove and add a signature proof
        </button>
        <br />
        <br />
        <button onClick={addIdentityPCD}>
          add a new semaphore identity to the passport
        </button>
        <br />
        <br />
        <button onClick={addWebAuthnPCD}>
          add a new webauthn credential to the passport
        </button>
        <br />
        <br />
        <AddEthAddrPCDButton />
        <br />
        <br />
        <AddEthGroupPCDButton />
        <br />
        <br />
        <button onClick={addEdDSAPCD}>add a new EdDSA signature proof</button>
      </ExampleContainer>
    </div>
  );
}

function AddEthAddrPCDButton() {
  const [pcdStr] = usePassportPopupMessages();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!pcdStr) return;
    if (!isActive) return;

    const parsed = JSON.parse(pcdStr) as SerializedPCD;

    const ethereum = (window as any).ethereum;
    const provider = new ethers.providers.Web3Provider(ethereum);
    if (!ethereum) {
      alert("Please install MetaMask to use this dApp!");
    }

    (async function () {
      await ethereum.request({ method: "eth_requestAccounts" });
      const pcd = await SemaphoreSignaturePCDPackage.deserialize(parsed.pcd);
      const signature = await provider
        .getSigner()
        .signMessage(pcd.claim.identityCommitment);

      const popupUrl = window.location.origin + "/popup";

      const proofUrl = constructPassportPcdProveAndAddRequestUrl<
        typeof EthereumOwnershipPCDPackage
      >(ZUPASS_URL, popupUrl, EthereumOwnershipPCDPackage.name, {
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDPackage.name,
          value: undefined,
          userProvided: true,
          description:
            "The Semaphore Identity which you are proving owns the given Ethereum address."
        },
        ethereumAddress: {
          argumentType: ArgumentTypeName.String,
          value: await provider.getSigner().getAddress()
        },
        ethereumSignatureOfCommitment: {
          argumentType: ArgumentTypeName.String,
          value: signature
        }
      });

      sendPassportRequest(proofUrl);
    })();

    setIsActive(false);
  }, [pcdStr, isActive]);

  return (
    <button
      onClick={() => {
        setIsActive(true);
        zupassSignIn("eth-pcd");
      }}
    >
      add a new Ethereum address to the passport
    </button>
  );
}

async function zupassSignIn(originalSiteName: string) {
  openSignedZuzaluSignInPopup(
    ZUPASS_URL,
    window.location.origin + "/popup",
    originalSiteName
  );
}

function AddEthGroupPCDButton() {
  const [pcdStr] = usePassportPopupMessages();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!pcdStr) return;
    if (!isActive) return;

    const parsed = JSON.parse(pcdStr) as SerializedPCD;

    const ethereum = (window as any).ethereum;
    const provider = new ethers.providers.Web3Provider(ethereum);
    if (!ethereum) {
      alert("Please install MetaMask to use this dApp!");
    }

    (async function () {
      await ethereum.request({ method: "eth_requestAccounts" });
      const pcd = await SemaphoreSignaturePCDPackage.deserialize(parsed.pcd);

      const msgHash = Buffer.from(
        ethers.utils.hashMessage(pcd.claim.identityCommitment).slice(2),
        "hex"
      );
      const signatureOfIdentityCommitment = await provider
        .getSigner()
        .signMessage(pcd.claim.identityCommitment);

      const poseidon = new Poseidon();
      await poseidon.initWasm();
      const treeDepth = 20; // Provided circuits have tree depth = 20
      const pubKeyTree = new Tree(treeDepth, poseidon);

      // Add some public keys to the tree
      for (const member of [
        "0x04b4d5188949bf70c4db5e965a9ea67b80407e8ee7fa3a260ccf86e9c0395fe82cba155fdff55829b3c862322aba402d00b563861b603879ee8ae211c34257d4ad",
        "0x042d21e6aa2021a991a82d08591fa0528d0bebe4ac9a34d851a74507327d930dec217380bd602fe48a143bb21106ab274d6a51aff396f0e4f7e1e3a8a673d46d83"
      ]) {
        pubKeyTree.insert(poseidon.hashPubKey(getRawPubKeyBuffer(member)));
      }
      // Add the prover's public key to the tree
      const proverPubkeyBuffer: Buffer = getRawPubKeyBuffer(
        ethers.utils.recoverPublicKey(msgHash, signatureOfIdentityCommitment)
      );
      pubKeyTree.insert(poseidon.hashPubKey(proverPubkeyBuffer));
      const pubKeyIndex = pubKeyTree.indexOf(
        poseidon.hashPubKey(proverPubkeyBuffer)
      ); // == 2 in this test

      // Prove membership of the prover's public key in the tree
      const merkleProof = pubKeyTree.createProof(pubKeyIndex);

      const popupUrl = window.location.origin + "/popup";
      const proofUrl = constructPassportPcdProveAndAddRequestUrl<
        typeof EthereumGroupPCDPackage
      >(ZUPASS_URL, popupUrl, EthereumGroupPCDPackage.name, {
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDPackage.name,
          value: undefined,
          userProvided: true,
          description:
            "The Semaphore Identity which you are signing the message."
        },
        groupType: {
          argumentType: ArgumentTypeName.String,
          value: GroupType.PUBLICKEY
        },
        signatureOfIdentityCommitment: {
          argumentType: ArgumentTypeName.String,
          value: signatureOfIdentityCommitment
        },
        merkleProof: {
          argumentType: ArgumentTypeName.String,
          value: JSONBig({ useNativeBigInt: true }).stringify(merkleProof)
        }
      });

      sendPassportRequest(proofUrl);
    })();

    setIsActive(false);
  }, [pcdStr, isActive]);

  return (
    <button
      onClick={() => {
        setIsActive(true);
        zupassSignIn("eth-group-pcd");
      }}
    >
      add a new Ethereum Group Membership to the passport
    </button>
  );
}

async function addGroupMembershipProofPCD() {
  const url = constructPassportPcdProveAndAddRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    ZUPASS_URL,
    window.location.origin + "/popup",
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        value: "1",
        description:
          "You can choose a nullifier to prevent this signed message from being used across domains."
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        userProvided: false,
        remoteUrl: ZUZALU_SEMAPHORE_GROUP_URL,
        description: "The Semaphore group which you are proving you belong to."
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true,
        description:
          "The Semaphore Identity which you are signing the message on behalf of."
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        value: "1",
        description: "The message you are signing with your Semaphore identity."
      }
    },
    {
      genericProveScreen: true,
      description:
        "Generate a group membership proof using your passport's Semaphore Identity.",
      title: "Group Membership Proof"
    }
  );

  sendPassportRequest(url);
}

async function addEdDSAPCD() {
  const proofUrl = constructPassportPcdProveAndAddRequestUrl<
    typeof EdDSAPCDPackage
  >(
    ZUPASS_URL,
    window.location.origin + "/popup",
    EdDSAPCDPackage.name,
    {
      message: {
        argumentType: ArgumentTypeName.StringArray,
        value: ["0x12345", "0x54321"],
        userProvided: true
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        userProvided: false,
        // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
        value:
          "0001020304050607080900010203040506070809000102030405060708090001"
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid(),
        userProvided: false
      }
    },
    { title: "EdDSA Signature Proof" }
  );

  sendPassportRequest(proofUrl);
}

async function addSignatureProofPCD() {
  const proofUrl = constructPassportPcdProveAndAddRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    ZUPASS_URL,
    window.location.origin + "/popup",
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: "1",
        userProvided: false
      }
    },
    {
      title: "Semaphore Signature Proof"
    }
  );

  sendPassportRequest(proofUrl);
}

async function addIdentityPCD() {
  const newIdentity = await SemaphoreIdentityPCDPackage.prove({
    identity: new Identity()
  });

  const serializedNewIdentity =
    await SemaphoreIdentityPCDPackage.serialize(newIdentity);

  const url = constructPassportPcdAddRequestUrl(
    ZUPASS_URL,
    window.location.origin + "/popup",
    serializedNewIdentity
  );

  sendPassportRequest(url);
}

async function addWebAuthnPCD() {
  // Register a new WebAuthn credential for testing.
  const generatedRegistrationOptions = await generateRegistrationOptions({
    rpName: "consumer-client",
    rpID: window.location.hostname,
    userID: "user-id",
    userName: "user",
    attestationType: "direct",
    challenge: "challenge",
    supportedAlgorithmIDs: [-7]
  });
  const startRegistrationResponse = await startRegistration(
    generatedRegistrationOptions
  );
  const verificationResponse = await verifyRegistrationResponse({
    response: startRegistrationResponse,
    expectedOrigin: window.location.origin,
    expectedChallenge: generatedRegistrationOptions.challenge,
    supportedAlgorithmIDs: [-7] // support ES256 signing algorithm
  });

  if (!verificationResponse.registrationInfo) {
    throw new Error("Registration failed the return correct response.");
  }

  // Get relevant credential arguments from registration response.
  const { credentialID, credentialPublicKey, counter } =
    verificationResponse.registrationInfo;

  // Create new WebAuthn PCD. This process initiates the WebAuth
  // authentication ceremony, prompting a authorization gesture like
  // a fingerprint or Face ID scan, depending on the device.
  const newCredential = await WebAuthnPCDPackage.prove({
    rpID: window.location.hostname,
    authenticator: {
      credentialID,
      credentialPublicKey,
      counter
    },
    challenge: "1", // arbitrary challenge to be signed
    origin: window.location.origin
  });

  const serializedNewCredential =
    await WebAuthnPCDPackage.serialize(newCredential);

  // Add new WebAuthn PCD to Passport.
  const url = constructPassportPcdAddRequestUrl(
    ZUPASS_URL,
    window.location.origin + "/popup",
    serializedNewCredential
  );

  sendPassportRequest(url);
}
