# 0xPARC PCD SDK

## Local Development

### Environment Variables

In order to develop locally, you will need to set some environment variables. The only place
where this needs to happen is in the `passport-server` project. We have included an example
environment variable which allows you to start a minimal version of the passport application
that depends on no external services. You can find this file here [apps/passport-server/.env.example](apps/passport-server/.env.example). In order to make the `passport-server` use these environment variables,
all you need to do is copy the contents of that file into an adjacent file called `.env`.

### Running the project

In the root of this project, execute the following to start the servers and the static sites locally.

```bash
# installs dependencies for all apps and packages in this repository
yarn

# starts local Postgres - you must have Postgres installed for this
# to work properly. in case you want to restart a Postgres instance
# you previously started in this project, you can also run the command
# yarn localdb:restart
yarn localdb:init && yarn localdb:up

# starts all the applications contained in the `/apps` directory of the
# repository.
yarn dev

# open up the passport app in your browser.
open http://localhost:3000
```

### Ports

The passport has its own client and server. We also included an example application set up with its own client and server as well. After running `yarn dev` they will be available at the following ports:

- `apps/passport-client`: http://localhost:3000/
- `apps/consumer-client`: http://localhost:3001/
- `apps/passport-server`: http://localhost:3002/
- `apps/consumer-server`: http://localhost:3003/

## Packages

This repository includes many packages. They are all [published on NPM](https://www.npmjs.com/search?q=%40pcd)!

Some of these packages are used to share development configuration between the
different apps. Others of these packages are intended to provide shared code that
can be used on both a client and server. The third category of packages is PCD
packages - those that implement the 'Proof Carrying Data' interface.

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

## Testing

Each package and app which needs testing has a `test` script in its `package.json`. You can invoke all the tests serially by running the command `yarn test` at the root of the repository. Please make sure to write tests for anything you need to not break as we develop.

## Production Deployment

### Passport

- static site is deployed to https://zupass.org/
- server is deployed to https://api.pcd-passport.com/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com
