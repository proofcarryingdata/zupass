# Zupoll

## For Developers: Local Development

### Environment Variables

In order to develop locally, you will need to set some environment variables.

#### `zupoll-client`

In `zupoll-client` project, we have included an example environment variable file here: [apps/zupoll-client/.env.example](apps/zupoll-client/.env.example).

In order to make the `zupoll-client` use these environment variables, you will need to copy the contents of the example file into an adjacent file called `.env`.

#### `zupoll-server`

In `zupoll-server` project, we have included an example environment variable file here: [apps/zupoll-server/.env.example](apps/zupoll-server/.env.example).
In order to make the `zupoll-server` use these environment variables, you will need to copy the contents of the example file into an adjacent file called `.env`.

### Running the project

Note, this project depends on the [Zupass](https://github.com/proofcarryingdata/zupass).

You have to make sure the passport server and client running first.

In the root of this project, execute the following to start the servers and static sites locally.

```bash
# installs dependencies for all apps and packages in this repository
yarn

# set the postgres connection url in the env file (DATABASE_URL)
# this will need to you manually create a database for zupoll.

# prepare local Postgres - you must have Postgres installed for this
# to work properly.
yarn db:generate && yarn db:push

# starts all the applications contained in the `/apps` directory of the
# repository. this includes the zupoll server and client.
yarn dev

# open up the zupoll app in your browser.
open http://localhost:3012
```
