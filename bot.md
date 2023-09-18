# Dev Instructions for Testing ZKMS Bot

_Doing this steps in order is more likely to result in success_

### 1. Set up a Telegram Bot

- Run `cp apps/passport-server/.env.local.example apps/passport-server/.env`
- Obtain a Telegram Bot [Token](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- Paste the token in `apps/passport-server/.env` for the `TELEGRAM_BOT_TOKEN` value

### 2. Start the Passport Client and Server

- `yarn`
- `yarn build`
- `yarn localdb:init && yarn localdb:up`
- `yarn dev:bot`

### 3. Setting up a Test Event

- `yarn workspace passport-server ticketed-event:dev`

- Go to [http://localhost:3000](http://localhost:3000)
- Make a new PCDPass account with that email. The account MUST have the email: `dev@gmail.com`.
- Refresh the site. You should see two folders with `Devconnect` and `Email` and inside `Devconnect` is a folder with the name of your event. Then `Devconnect/localTest` should have a QR Code ticket.

- email: dev@gmail.com, pw: devconnect

### 4. PCD Join / Auth flow in Telegram

- Make a new private group chat in the Telegram app (ex: `test chat`).
- Go to the chat with your bot (ex: https://t.me/zulearn_bot)
- Go to `Info`, then click `Add to group or channel`. Add the bot to `test chat`
- Now, in `test chat`, type `/link`. You should get a message confirming that the test event was linked to the TG chat.
- You can double check by using a GUI like Postico to view the `telegram_bot_events` table.

### 5. Putting it All Together

- In the Telegram app, go to the chat with your bot and type `/start`
- Click `Generate ZKP`
- Follow the link to PCDPass (http://localhost:3000) and hit `Prove` when your ticket appears
- You should be returned to the Telegram app and presented with the `Send ZKP` option.
- Click `Send ZKP`, then you will be redirected to `test_chat`

### 6. (optional) Hot Reloading for TG Development

This is a one-time setup for serving https locally. You need it for Telegram, because Telegram hates http and localhost. At the end, you will be able to access 127.0.0.1 (aka localhost) from a fake domain, `dev.local` (this is important for https)

1. Install mkcert - [https://github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert)
2. `mkcert -install`
3. From root of repo: `mkdir apps/certificates && cd apps/certificates && mkcert dev.local`
4. `sudo vi /etc/hosts` and add a line, `127.0.0.1 dev.local localhost`
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
