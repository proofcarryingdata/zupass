# Dev Instructions for Testing ZKMS Bot

_Doing these steps in order is more likely to result in success_

### 0. Prerequisites

- Install [Telegram Desktop](https://desktop.telegram.org/)
- In the Telegram app, [Enable Web View Debug](https://core.telegram.org/bots/webapps#debug-mode-for-mini-apps)
- Obtain a Telegram Bot [Token](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- Get a Pretix API token from a member of the 0xPARC PCD team.

### 1. Set up environment

In the environment file `apps/passport-server/.env`, fill in the `TELEGRAM_BOT_TOKEN` with the Telegram token you obtained in the prerequisites section. If this file does not exist, follow the instructions in the [README](README.md#environment-variables).

### 2. Start the Passport Client and Server

```bash
  yarn
  yarn build
  yarn localdb:init && yarn localdb:up
  yarn passport:dev
```

### 3. Sync the Dev Tickets

- `cd apps/passport-server && yarn scratch new-dev-event <token>`
  - _Note: You can call `yarn scratch new-dev-event <token> <orgUrl> <eventId> <activeItemIds>` to pull from a specific event_
- Copy the output from the `scratch` script (ex: `/link ProgCrypto (Internal Test)`)
- You will paste the output in the following step.

### 4. PCD Join / Auth flow in Telegram

- Make a new private group chat in the Telegram app (ex: `test chat`).
- Go to the chat with your bot (ex: https://t.me/zulearn_bot)
- Go to `Info`, then click `Add to group or channel`. Add the bot to `test chat`
- Now, in `test chat`, type `/link`. You should get a message confirming that the test event was linked to the TG chat.
- You can double check by using a GUI like Postico to view the `telegram_bot_events` table.

### 5. Putting it All Together

- In the Telegram app, go to the chat with your bot and type `/start`
- Click `Generate ZKP`
- Follow the link to Zupass within Telegram (http://localhost:3000) and hit `Prove` when your ticket appears
- If this is your first time, you will need to make a new Zupass account:

  - Make a new Zupass account with an email you **know** has a ticket for the event in question (`ivan@0xparc.org` should work).
  - _Note: This account will only exist locally on your device_

- You should be returned to the Telegram app and presented with the `Send ZKP` option.
- Click `Send ZKP`, then you will be redirected to `test_chat`

### 6. (optional) Hot Reloading for TG Development

This is a one-time setup for serving https locally. You need it for Telegram, because Telegram hates http and localhost. At the end, you will be able to access 127.0.0.1 (aka localhost) from a fake domain, `dev.local` (this is important for https)

1. Install mkcert - [https://github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert)
2. After installing, create a new local Certificate Authority (CA)

   ```bash
   mkcert -install
   ```

3. Now, run the following commands from the repo root to generate a new certificate

   ```bash
   mkdir apps/certificates && cd apps/certificates && mkcert dev.local
   ```

4. Add the local domain to the hosts file.

   ```bash
   sudo vi /etc/hosts
   # and add a line in /etc/hosts,
   127.0.0.1 dev.local localhost
   ```

5. In `passport-client/.env` and `passport-server/.env`

   ```python
   # passport-client
   IS_LOCAL_HTTPS=true
   PASSPORT_SERVER_URL="https://dev.local:3002"
   ```

   ```python
   # passport-server

   # ... a bunch of other stuff
   IS_LOCAL_HTTPS=true
   PASSPORT_SERVER_URL="https://dev.local:3002"
   PASSPORT_CLIENT_URL="https://dev.local:3000"
   ```

### Troubleshooting

- When restarting your database, make sure to run `localdb:restart` not `yarn localdb:init && yarn localdb:up`.

  - If you do accidentally run `init`, you will clear all local data. This is ok, but it causes some problems because your local Zupass ticket still exists in localStorage in the Telegram Web View of Zupass, but doesn't exist in the database.
  - To rectify this situation, you should clear localStorage on Telegram Zupass by right-clicking on the Web view, then selecting `Inspect Element`. From there, you can go to the `Storage` tab and clear everything.
  - Then, you just have to login again with an account that has a ticket
