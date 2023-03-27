# 0xPARC PCD SDK

## What is a PCD?

'PCD' is short for 'Proof Carrying Data'. We use this term to mean any self-contained piece of data which makes a statement that can be verified by anyone to be true. In practice, a PCD has a 'claim', which is the human-interpretable statement that the PCD is making, and a 'proof' which is tied to the 'claim' which is a cryptographic or mathematical proof of the claim. All PCDs within this SDK also expose a `prove` and `verify` function, which allow you to instantiate them, and verify that they are indeed correct.

An example of a PCD is a [Zero Knowledge Proof](https://en.wikipedia.org/wiki/Zero-knowledge_proof). However, not all PCDs are zero knowledge proofs. For example, one PCD that is not a zero knowledge proof is a piece of data signed by an RSA private key along with the corresponding public key:

```
{
  "publicKey": "12345...",
  "signature": "asdfg...",
}
```

This is a PCD because anyone can verify that what it claims is true by running the RSA signature verification locally.

## What is the PCD SDK?s

The PCD SDK is a framework for developing applications that use PCDs for the proper functioning of their core feature set. It defines the set of interfaces necessary for correctly reasoning about and processing PCDs. It defines the interfaces through which PCDs are produced and consumed. It also includes a 'passport' web application that lets a user manage their personal PCDs, and enables third party applications to request PCDs from the passport, and add new PCDs into it.

## Local Development

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

The passport has its own client and server. We also included an example application set up with its own client and server as well (called the 'consumer', whose apps are `consumer-client` and `consumer-server`). After running `yarn dev` all four 'applications' will be available at the following ports:

- `apps/passport-client`: http://localhost:3000/ - this is the application that allows users to manage their PCDs, and 3rd party applications to save or load PCDs from
- `apps/consumer-client`: http://localhost:3001/ - this is an example 3rd party application, whose code demonstrates the API by which other 3rd party applications might interface with the passport, and how they might use the PCDs they get from the passport
- `apps/passport-server`: http://localhost:3002/ - this is the server-side application which backs the passport client. currently it is used to manage Zuzalu participants, send confirmation emails, end-to-end encrypted backup of PCDs from the passport client, and serving some heavy assets for the client.
- `apps/consumer-server`: http://localhost:3003/ - this is an example server application which would back an example 3rd party client app. currently this app is not useful as an example since it contains no meaningful example code, but we have included it for completeness, and for future examples.

## Packages

This repository includes many packages. They are all [published on NPM](https://www.npmjs.com/search?q=%40pcd)!

Some of these packages are used to share development configuration between the different apps. Others of these packages are intended to provide shared code that can be used on both a client and server. The third category of packages is PCD packages - those that implement the 'Proof Carrying Data' interface. This final category of packages allows you to instantiate (prove), verify, serialize and deserialize various PCDs.

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

All the packages and apps are linted using [eslint](https://eslint.org/).

## Production Deployment

### Passport

- static site is deployed to https://zupass.org/
- server is deployed to https://api.pcd-passport.com/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com
