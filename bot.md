# Dev Instructions for Testing ZKMS Bot

### Set up a Telegram Bot

- Run `cp apps/passport-server/.env.local.example apps/passport-server/.env`
- Obtain a Telegram Bot [Token](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- Paste the token in `apps/passport-server/.env` for the `TELEGRAM_BOT_TOKEN` value

### Start The Passport client and server

- `yarn`
- `yarn build`
- `yarn localdb:init && yarn localdb:up`
- `yarn dev:bot`

### Setting up a Test Event

- `yarn workspace passport-server ticketed-event:dev`

- Go to [http://localhost:3000](http://localhost:3000)
- Make a new PCDPass account with that email. The account MUST have the email: `dev@gmail.com`.
- Refresh the site. You should see two folders with `Devconnect` and `Email` and inside `Devconnect` is a folder with the name of your event. Then `Devconnect/localTest` should have a QR Code ticket.

- email: dev@gmail.com, pw: devconnect

### Testing the PCD Join / Auth flow in Telegram

- Make a new private group chat in the Telegram app (ex: `test chat`).
- Go to the chat with your bot (ex: https://t.me/zulearn_bot)
- Go to `Info`, then click `Add to group or channel`. Add the bot to `test chat`
- Now, in `test chat`, type `/setup`. Copy the Id that is logged (ex: `-1001916377435`)
- TODO: Command line to update the DB with this value

### Putting it all together

- In the Telegram app, go to the chat with your bot and type `/start`
- Click `Generate ZKP`
- Follow the link to PCDPass (http://localhost:3000) and hit `Prove` when your ticket appears
- You should be returned to the Telegram app and presented with the `Send ZKP` option.
- Click `Send ZKP`, then you will be redirected to `test_chat`


