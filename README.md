# 0xPARC PCD SDK

## Local Development

In the root of this project, execute the following to start the servers and the static sites locally.

```bash
yarn # installs dependencies
yarn dev
```

### Database

If you don't have a Render DB, you can create one locally using "yarn localdb:init" followed by "yarn localdb:up". Copy over `.env.local` to `.env`. When you're done, use "yarn localdb:down" to stop the local DB.

### Ports

The passport has its own client and server, and we have an example application set up with its own client and server. After running `yarn dev` they will be loaded into the following ports:

- `apps/passport-client`: http://localhost:3000/
- `apps/consumer-client`: http://localhost:3001/
- `apps/passport-server`: http://localhost:3002/
- `apps/consumer-server`: http://localhost:3003/

## Packages

- `pcd-types`: Typescript types for `PCD` and `PCDPackage`
- `semaphore-group-pcd`: Implementation of `pcd-types` for Semaphore, wrapping the code from `@semaphore-protocol`. Additionally defines a serialization format for Semaphore groups
- `passport-interface`: Implements the glue code between different parties using the PCD SDK
  - `passport-interface.ts` is glue between third-party applications and `passport-client`
  - `request-type.ts` is glue between `passport-client` and `passport-server`
- `eslint-config-custom` and `tsconfig` are helper packages for turborepo

## Production Deployment

### Passport

- static site is deployed to https://pcd-passport.com/
- server is deployed to https://api.pcd-passport.com/

### Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com

## Other notes

All are deployed on render.com. Their build settings are configured in the web UI. This means that if build scripts change for any of these 4 applications, those changes must be reflected in render.com's configurations for the changed application.
