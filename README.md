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

# starts local postgres - you must have postgress installed for this
# to work properly. in case you want to restart a postgres instance
# you previously started in this project, you can also run the command
# yarn localdb:restart
yarn localdb:init && yarn localdb:up

# starts all the applications contained in the `/apps` directory of the
# repository.
yarn dev

#
open http://localhost:3000
```

### Ports

The passport has its own client and server, and we have an example application set up with its own client and server. After running `yarn dev` they will be loaded into the following ports:

- `apps/passport-client`: http://localhost:3000/
- `apps/consumer-client`: http://localhost:3001/
- `apps/passport-server`: http://localhost:3002/
- `apps/consumer-server`: http://localhost:3003/

## Packages

- `@pcd/pcd-types`: Typescript types for `PCD` and `PCDPackage`
- `@pcd/semaphore-group-pcd`: Implementation of `@pcd/pcd-types` for Semaphore, wrapping the code from `@semaphore-protocol`. Additionally defines a serialization format for Semaphore groups
- `@pcd/passport-interface`: Implements the glue code between different parties using the PCD SDK
  - `@pcd/passport-interface.ts` is glue between third-party applications and `passport-client`
  - `request-type.ts` is glue between `passport-client` and `passport-server`
- `@pcd/eslint-config-custom` and `@pcd/tsconfig` are helper packages for turborepo

## Testing

Each package and app which needs testing has a `test` script in its `package.json`. You can invoke all the tests serially by running the command `yarn test` at the root of the repository. Please make sure to write tests for anything you need to not break as we develop.

## Production Deployment

### Passport

- static site is deployed to https://zupass.org/
- server is deployed to https://api.pcd-passport.com/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com
