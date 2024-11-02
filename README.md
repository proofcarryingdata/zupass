# Zupass and the Proof-Carrying Data SDK

## What is Zupass?

_This README is generally aimed at developers interested in using, building on top of, or contributing to Zupass._

[Zupass](https://zupass.org) is software for storing and managing _Proof-Carrying Data_: any data whose well-formedness and validity are cryptographically verifiable. Examples of Proof-Carrying Data include:

- **Signatures**. Ex: an arbitrarily-structured JSON representing a ticket to Zuzalu, signed by the Zuzalu ticketing authority's public key.
- **Merkle proofs**. Ex: a Merkle proof that a Semaphore identity belongs to a group of identities representing people in some digital community.
- **ZK proofs**. Ex: a groth16 proof that I am 4 [degrees of separation](https://ethdos.xyz/) from Vitalik, or that I possess [a valid Zuzalu passport](https://zupoll.org/) (without revealing who I am), or that I [attended a certain Devconnect event]().
- **Hash commitments**. Ex: a secret password, and a hash of that password.
- **Keypairs**. Ex: an Ethereum keypair, or a Semaphore secret and identity commitment.

Zupass allows users to store and organize PCDs, and to respond to queries from third-party applications about their PCDs. Here are some kinds of queries a third party can ask a user with a Zupass:

- A gated Discord server can ask a user with a Zupass whether they possess a signed "ticket" authorizing them to join the server.
- A community polling website like [Zupoll](https://zupoll.org/) can ask a user with a Zupass whether they are someone in an allowed set of voters (without the user revealing who they are!).
- A game leaderboard can ask a user with a Zupass whether they have completed the necessary in-game requirements to be added to the leaderboard.
- A new social media site could ask a user to import their posts, likes, follower count, and even [usernames](https://zkemail.xyz/) from other social platforms.
- A financial service provider could ask a user with a Zupass to prove that they have a recently-signed bank statement, credit card statement, and tax return, and that running a publicly-known financial health formula on these statements results in a certain creditworthiness score.

Using zkSNARKs, it is theoretically possible for third parties to make _any_ query into a user's Zupass, so long as they provide a zkSNARK circuit for that query. For example, the last example in the list above could be accomplished by designing a ZK circuit that performs signature verification, JSON parsing / PDF parsing / regex matching, and a forward pass of a financial model.

## For Developers: Understanding the PCD Model

### Proof-Carrying Data

As a developer, if you are interested in working with Zupass, the PCD SDK, or any data compatible with the open PCD interfaces, you'll need to understand the "PCD" abstraction.

"PCD" is short for "Proof-Carrying Data"\*. In this repository, we use this term to refer to any data that is attached to a proof of its own correctness, without the need for external context to verify.

All PCDs consist of:

- a "claim", which is an arbitrarily-structured set of fields (cryptographic identifiers such as public keys, hashes, Merkle roots, etc.) and an implicit set of claimed relationships between these fields. The set of claimed relationships is given by the PCD "type."
- a "proof" attached to the "claim," which is a cryptographic proof of the claim. All PCDs within this SDK also expose a `prove` and `verify` function, which allows you to instantiate them, and verify that they are indeed correct.

Many PCDs are [zkSNARKs](https://learn.0xparc.org/materials/circom/prereq-materials/topic-sampler). However, not all PCDs are zkSNARKs, or even zero-knowledge proofs. For example, one PCD that is not a zkSNARK is a piece of data signed by an RSA private key along with the corresponding public key:

```
{
  "publicKey": "12345...",
  "message": "Hello World!",
  "signature": "asdfg..."
}
```

This is a PCD because anyone can verify that what it claims is true by running the RSA signature verification locally.

\*_Our "PCD" abstraction is partially inspired by a spiritually similar academic cryptography concept of [the same name](https://dspace.mit.edu/handle/1721.1/61151). Note that the academic term has a slightly different technical definition._

### What is the PCD SDK?

The PCD SDK is a framework for developing applications that use PCDs for the proper functioning of their core feature set. It defines the set of interfaces necessary for correctly reasoning about and processing PCDs. It defines the interfaces through which PCDs are produced and consumed. It also includes a "passport" web application that lets a user manage their personal PCDs, and enables third party applications to request PCDs from the passport, and add new PCDs to it.

## For Developers: Local Development

### Requirements

`passport-server` uses Postgres, and requires Postgres 15 or higher.

### Environment Variables

In order to develop locally, you will need to set some environment variables. The only place
where this needs to happen is in the `passport-server` project. We have included an example
environment variable file which allows you to start a minimal version of the passport application
that depends on no external services. You can find this file here: [apps/passport-server/.env.example](apps/passport-server/.env.example). In order to make the `passport-server` use these environment variables,
you will need to copy the contents of the example file into an adjacent file called `.env`.

If you are on the PCD team and need more environment variables, contact @ichub.

### Running the project

In the root of this project, execute the following to start the servers and static sites locally.

```bash
# installs dependencies for all apps and packages in this repository
yarn

# starts local Postgres - you must have Postgres installed for this
# to work properly. in case you want to restart a Postgres instance
# you previously started in this project, you can also run the command
# yarn localdb:restart
yarn localdb:init && yarn localdb:up

# starts all the applications contained in the `/apps` directory of the
# repository. this includes the passport server and client, as well as
# a server and client for an example application built on top of the
# PCD sdk which integrates with the passport.
yarn dev

# open up the passport app in your browser.
open http://localhost:3000
```

### Apps

The passport has its own client and server. We also included an example application set up with its own client and server as well (called the "consumer", whose apps are `consumer-client` and `consumer-server`). After running `yarn dev` all four "applications" will be available at the following ports:

- `apps/passport-client`: http://localhost:3000/ - this is the application that allows users to manage their PCDs, and 3rd party applications to save or load PCDs from
- `apps/consumer-client`: http://localhost:3001/ - this is an example 3rd party application, whose code demonstrates the API by which other 3rd party applications might interface with the passport, and how they might use the PCDs they get from the passport
- `apps/passport-server`: http://localhost:3002/ - this is the server-side application which backs the passport client. currently it is used to manage Zuzalu participants, send confirmation emails, end-to-end encrypted backup of PCDs from the passport client, and serving some heavy assets for the client.
- `apps/consumer-server`: http://localhost:3003/ - this is an example server application which would back an example 3rd party client app. Currently this app is not useful as an example since it contains no meaningful example code, but we have included it for completeness, and for future examples.

## Packages

This repository includes many packages. They are all [published on NPM](https://www.npmjs.com/search?q=%40pcd)!

Some of these packages are used to share development configuration between the different apps. Others of these packages are intended to provide shared code that can be used on both a client and server. The third category of packages is PCD packages - those that implement the "Proof Carrying Data" interface. This final category of packages allows you to instantiate (prove), verify, serialize and deserialize various PCDs.

#### pcd packages

- [`@pcd/semaphore-group-pcd`](packages/pcd/semaphore-group-pcd): a pcd which wraps the [Semaphore](https://semaphore.appliedzkp.org/docs/introduction) protocol, which allows PCD-consuming applications to consume and generate Semaphore proofs.
- [`@pcd/semaphore-identity-pcd`](packages/pcd/semaphore-identity-pcd): a 'self-evident' PCD, representing the public and private components of a Semaphore identity
- [`@pcd/semaphore-signature-pcd`](packages/pcd/semaphore-signature-pcd): like `@pcd/semaphore-group-pcd`, but with a more specific purpose of using the semaphore protocol to 'sign' a particular string message on behalf of a particular revealed commitment id.
- [`@pcd/webauthn-pcd`](packages/pcd/webauthn-pcd): a pcd that can be used to make claims about [WebAuthn](https://webauthn.guide/) attestations, i.e. signing a particular challenge with a fingerprint, Yubikey, or another [authorization gesture](https://www.w3.org/TR/webauthn-2/#authorization-gesture).
- [`@pcd/ethereum-ownership-pcd`](packages/pcd/ethereum-ownership-pcd): a pcd that can be used to claim that a Semaphore identity knows the private key of an ethereum address.
- [`@pcd/ethereum-group-pcd`](packages/pcd/ethereum-group-pcd): a pcd that can be used to claim that a Semaphore identity knows the private key of an ethereum address or public key that is part of a merkle group of addresses or public keys, without revealing the specific one.
- ... more to come!

#### shared code packages

- [`@pcd/passport-crypto`](packages/lib/passport-crypto): package that implements cryptographic primitives like encryption and hashing, to be used by the passport server and client.
- [`@pcd/passport-interface`](packages/lib/passport-interface): package that contains interfaces (both types and functions) that facilitate communication between the various components involved in a PCD application.
- [`@pcd/pcd-types`](packages/lib/pcd-types): package that defines what a PCD _is_.

#### utility packages

- [`@pcd/eslint-config-custom`](packages/tools/eslint-config-custom): shared eslint configuration files
- [`@pcd/tsconfig`](packages/tools/tsconfig): shared tsconfig files

### Testing

Each package and app which needs testing has a `test` script in its `package.json`. You can invoke all the tests serially by running the command `yarn test` at the root of the repository. Please make sure to write tests for anything you need to not break as we develop.

### Linting

All the packages and apps are linted using [eslint](https://eslint.org/). The linting runs in GitHub Actions, and your branch must pass all the linting rules before it is merged. To run the linter locally, you can run the command `yarn lint` in the root of this project to lint all the packages and apps in the repository. If you want to run the linter on a particular project or package, navigate to its directory, and execute `yarn lint` from there.

## For Developers: Production Deployments

### Zupass

- static site is deployed to https://zupass.org/
- server is deployed to https://api.zupass.org/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com

## For Developers: Adding a new PCD Type

### Creating a new package

To generate a new package scaffold, run `yarn generate-package`. You will be prompted to choose a package type--when creating a new PCD, choose `pcd` as the type, then give your package an appropriate name. If you were creating a PCD to store digitally-signed driving licenses, you might choose the name `driving-license-pcd`. Your new package will be created at `packages/pcd/[package-name]`.

### `PCDPackage`

Zupass can support many types of PCDs. In order to create a new type of PCD that can be interpreted, verified, created, shared, and stored by Zupass, the first thing you must create is a new `PCDPackage` - a concrete implementation of the `PCDPackage` typescript interface as defined here:

https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/pcd-types/src/pcd.ts#L34-L49

Two example implementations of a `PCDPackage` that works with Zupass are:

- https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/rsa-pcd/src/RSAPCD.ts
- https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/semaphore-identity-pcd/src/SemaphoreIdentityPCD.ts

### `PCDUI`

To be shown in Zupass, a PCD needs a UI package that specifies how it should be rendered. As above, create a new package, this time in the `ui` group. By convention, the UI package shares the same name as the PCD package, so if you earlier created a `driving-license-pcd` then you should call your UI package `driving-license-pcd-ui`.

The purpose of a PCD UI package is to provide an implementation of the `PCDUI` interface. A simple example of a `PCDUI` class can be found at:

- https://github.com/proofcarryingdata/zupass/blob/main/packages/ui/email-pcd-ui/src/CardBody.tsx

### Integrating with Zupass

In order for a new type of PCD to work with Zupass, its implementation must be added as a dependency of the apps `passport-server` and `passport-client` in the Zupass repository. This can be done by editing their respective `package.json`s.

Next, the PCD implementation (as represented by its `PCDPackage`) must be added to a few places in the `Zupass` codebase:

- on the client: https://github.com/proofcarryingdata/zupass/blob/main/apps/passport-client/src/pcdPackages.ts
- on the server: https://github.com/proofcarryingdata/zupass/blob/main/apps/passport-server/src/services/provingService.ts

Adding the new `PCDPackage` to the appropriate places is necessary for Zupass to be able to 'handle' the new type of PCD correctly.

Here are a few example pull requests that integrate a new `PCDPackage` into Zupass:

- https://github.com/proofcarryingdata/zupass/pull/290
- https://github.com/proofcarryingdata/zupass/pull/134
- https://github.com/proofcarryingdata/zupass/pull/154

In addition, you will also need to add your `PCDUI` class to the `passport-client` application here:

- https://github.com/proofcarryingdata/zupass/blob/main/apps/passport-client/src/pcdRenderers.ts

Remember to first add the relevant UI package as a dependency to `passport-client`'s `package.json`.

The Zupass team reserves the right to reject any proposed PCD according to our discretion.

### Internal vs. External

Some `PCDPackage` implementations live inside of the Zupass repository:

- https://github.com/proofcarryingdata/zupass/pull/290
- https://github.com/proofcarryingdata/zupass/pull/134

Others live outside of the Zupass repository:

- https://github.com/proofcarryingdata/zupass/pull/154

The choice between Internal and External is yours to make. In either case, we will review the code for security vulnerabilities, testing, code quality, and documentation.

### Testing

We recommend that you add an example of how a developer may create and consume your new type of PCD in the `consumer-client` app included in this repository. Check out how other PCDs have done this by navigating to http://localhost:3001/ after running `yarn dev` in the root of your project - this is where the `consumer-client` application lives.

We also recommend that you create a comprehensive test suite for your new PCD, so that we can be confident in your implementation. A few test suites we think are good can be found in the following PCD implementations:

- https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/semaphore-group-pcd/test/SemaphoreGroupPCD.spec.ts
- https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/rsa-pcd/test/RSAPCD.spec.ts
