# Zupass

## What is the Zuzalu Passport?

*This README is generally aimed at developers interested in building on top of the Zuzalu Passport. If you are a resident looking for instructions on how to set up your Passport, visit [this link](https://docs.google.com/document/d/1pADZ8ixBkKkJcw3NA1dNMhrB6dwWGfFx6H92IV6dKuU/edit?usp=sharing).*

The [Zuzalu Passport](https://zupass.org) allows Zuzalu residents to store personal data relating to identity, reputation, historical activity, and more, and to share any part of this data with any (physical and digital) Zuzalu service of their choosing. Zuzalu services may include anything built by Zuzalu administrators or other residents: physical authentication procedures, the Zuzalu website, Zuzalu message boards, Zuzalu governance infrastructure, a resident *Mafia* game, a community matchmaking service, a community newsletter, and more.

**Every Zuzalu resident and visitor has a Zuzalu Passport**, making it a simple "base" for anyone to build and experiment on top of. The goal of the Zuzalu Passport is to help the Zuzalu community collectively build out community infrastructure over the course of the next two months, by providing a solid foundation and by onboarding people onto new tools enabled by zero-knowledge. 

Under the hood, the Zuzalu Passport stores cryptographically-manipulable data such as keypairs, credentials, attestations, and more, and uses a very lightweight standard for arbitrary zero-knowledge proofs to pass along this data to applications. ZKPs enable three critical features in the Passport system:

- **Any Zuzalu resident can build applications that hook into the Passport system**, without needing permission from Zuzalu organizers or Passport maintainers. There are no API keys, centralized servers, proprietary standards, special tokens, or gated endpoints* that you need approval for in order to build an experimental governance project that anyone with a Zuzalu Passport can participate in. With the Passport architecture, application developers can simply give or request data from users directly.
- **Zuzalu applications are interoperable by default, and can understand and "talk to" one another without the need for special permissioning.** For example, one resident could build a message board where posters can accumulate "Zuzalu karma" for posting high-quality content, another resident can build a "private POAPs" service allowing Zuzalu event attendees to prove participation in community events, and a third resident could build a private polling app where users with either more "Zuzalu karma" OR greater community event participation can cast votes carrying more voting weight--without the three application builders having to coordinate at all!
- **Users store and control their own data.** Zuzalu user data is end-to-end encrypted, and by default only accessible by the user on their own devices--not by the Zuzalu organizers, the Passport maintainers, or the developers of any Zuzalu applications. Additionally, thanks to ZKPs, users have total control over who they share this data with, and how.

As mentioned above, we hope for the Zuzalu Passport to enable more permissionless experimentation in community and governance infrastructure at Zuzalu. You can find a list of starter ideas for things to build on the Zuzalu Passport [here](https://0xparc.notion.site/2023-03-28-Zuzalu-Passport-RFP-31f9fa45d3ba40289edcf45559536bbb). We'll also be running workshops and a hackathon track throughout ZK Week, for Zuzalu residents and visitors who are interested in hacking on top of the Passport!

**Currently, we run a server that serves a Merkle Tree of participant public keys and some metadata for convenience, though this could easily be migrated on-chain.*

## For Developers: Understanding the Zuzalu Passport Model

### Zuzalu Passport Cards

The Zuzalu Passport holds a collection of *cards*. UX-wise, the Zuzalu Passport interface is similar in concept to the [Apple Wallet](https://help.apple.com/assets/63BCA8F46048E91596771871/63BCA8F56048E9159677187F/en_US/36d4991d06798f24f230e7282a911222.png).

Initially, the only card in the Zuzalu Passport wallet is a [Semaphore keypair](https://semaphore.appliedzkp.org/) that acts as your primary identifier as a resident or visitor. This is a special card: it displays a QR code in one of two modes (identity-hiding or identity-revealing), which you can use to prove that you are indeed a Zuzalu resident.

However, anyone can create new types of cards, and publish a flow to allow others to a card of a new type into their passport. The flow for adding a new type of card to your Passport is similar to the Apple Wallet's "Add to Wallet" button. Examples of other cards you could potentially build, and allow others to add to their Passports in the future, include:

- An Ethereum signature proving that you are `janedoe.eth` on Ethereum.
- A signature from a Synthetic Biology subevent host, certifying that you attended the subevent.
- An email you've received from invites@zuzalu.org identifying the apartment number you're staying in.
- An [ETHdos](https://ethdos.xyz/)-style recursive ZK proof, certifying that you are 2 degrees of connection away from Vitalik.
- A ZKML proof composed with a timestamp server signature, certifying that you visited the Lustica Bay lighthouse on Sunday, April 2nd.

Any third-party service--for example, a Zuzalu voting app--can request a card, multiple cards, or some claim about one or multiple cards (i.e. "I have X card OR I have Y card") from the Zuzalu Passport ([live examples](https://consumer-client.onrender.com/)). For those who have used Ethereum apps before, this is a similar flow to how a dapp website might ask you to sign a message or a transaction by popping up Metamask.

### Cards and Card Requests as "PCDs"

As a developer, if you are interested in working with the Zuzalu Passport and with Zuzalu Passport Cards, you'll need to understand the "PCD" abstraction.

"PCD" is short for "Proof-Carrying Data"*. In this repository, we use this term to refer to any is any claim about the world that is attached to a proof of its own correctness, without the need for external context to verify--such as a user card, or a response to a third-party request for information about user cards.

All PCDs consist of a "claim", which is the human-interpretable statement that the PCD is making (i.e. "I am a Zuzalu resident"); and a "proof" attached to the "claim," which is a cryptographic or mathematical proof of the claim. All PCDs within this SDK also expose a `prove` and `verify` function, which allow you to instantiate them, and verify that they are indeed correct.

Many PCDs are [zkSNARKs](https://learn.0xparc.org/materials/circom/prereq-materials/topic-sampler). However, not all PCDs are zkSNARKs, or even zero-knowledge proofs. For example, one PCD that is not a zkSNARK is a piece of data signed by an RSA private key along with the corresponding public key:

```
{
  "publicKey": "12345...",
  "message": "Hello World!",
  "signature": "asdfg..."
}
```

This is a PCD because anyone can verify that what it claims is true by running the RSA signature verification locally.

**Our "PCD" abstraction is partially inspired by a spiritually similar academic cryptography concept of [the same name](https://dspace.mit.edu/handle/1721.1/61151). Note that the academic term has a slightly different technical definition.*

### What is the PCD SDK?

The PCD SDK is a framework for developing applications that use PCDs for the proper functioning of their core feature set. It defines the set of interfaces necessary for correctly reasoning about and processing PCDs. It defines the interfaces through which PCDs are produced and consumed. It also includes a "passport" web application that lets a user manage their personal PCDs, and enables third party applications to request PCDs from the passport, and add new PCDs into it.

## For Developers: Local Development

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
- `apps/consumer-server`: http://localhost:3003/ - this is an example server application which would back an example 3rd party client app. currently this app is not useful as an example since it contains no meaningful example code, but we have included it for completeness, and for future examples.

## Packages

This repository includes many packages. They are all [published on NPM](https://www.npmjs.com/search?q=%40pcd)!

Some of these packages are used to share development configuration between the different apps. Others of these packages are intended to provide shared code that can be used on both a client and server. The third category of packages is PCD packages - those that implement the "Proof Carrying Data" interface. This final category of packages allows you to instantiate (prove), verify, serialize and deserialize various PCDs.

#### pcd packages

- [`@pcd/semaphore-group-pcd`](packages/semaphore-group-pcd): a pcd which wraps the [Semaphore](https://semaphore.appliedzkp.org/docs/introduction) protocol, which allows PCD-consuming applications to consume and generate Semaphore proofs.
- [`@pcd/semaphore-identity-pcd`](packages/semaphore-identity-pcd): a 'self-evident' PCD, representing the public and private components of a Semaphore identity
- [`@pcd/semaphore-signature-pcd`](packages/semaphore-signature-pcd): like `@pcd/semaphore-group-pcd`, but with a more specific purpose of using the semaphore protocol to 'sign' a particular string message on behalf of a particular revealed commitment id.
- ... more to come!

#### shared code packages

- [`@pcd/passport-crypto`](packages/passport-crypto): package that implements cryptographic primitives like encryption and hashing, to be used by the passport server and client.
- [`@pcd/passport-interface`](packages/passport-interface): package that contains interfaces (both types and functions) that facilitate communication between the various components involved in a PCD application.
- [`@pcd/pcd-types`](packages/pcd-types): package that defines what a PCD _is_.

#### utility packages

- [`@pcd/eslint-config-custom`](packages/eslint-config-custom): shared eslint configuration files
- [`@pcd/tsconfig`](packages/tsconfig): shared tsconfig files

### Testing

Each package and app which needs testing has a `test` script in its `package.json`. You can invoke all the tests serially by running the command `yarn test` at the root of the repository. Please make sure to write tests for anything you need to not break as we develop.

### Linting

All the packages and apps are linted using [eslint](https://eslint.org/). The linting runs in GitHub Actions, and your branch must pass all the linting rules before it is merged. To run the linter locally, you can run the command `yarn lint` in the root of this project to lint all the packages and apps in the repository. If you want to run the linter on a particular project or package, navigate to its directory, and execute `yarn lint` from there.

## For Developers: Zupass Production Deployments

### Passport

- static site is deployed to https://zupass.org/
- server is deployed to https://api.pcd-passport.com/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com
