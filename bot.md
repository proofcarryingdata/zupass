- [x] Command to just run passport client and server in dev mode
- [ ] Dev ticketing flow
- Are emails case sensitive?

## Notes on Dev Flow

Setup:

- Run `cp apps/passport-server/.env.local.example apps/passport-server/.env`
- Obtain a Telegram Bot [Token](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- Paste the token in `apps/passport-server/.env` for the `TELEGRAM_BOT_TOKEN` value

- `yarn`
- `yarn build`
- `yarn localdb:init && yarn localdb:up`
- `yarn dev:bot`

## Setting up a Test Event

(If querying public pretix-event)

- Make a new Pretix organiztion account and get the url for your org (ex: https://pretix.eu/emergence/)
- Get a Pretix API [Token](https://docs.pretix.eu/en/latest/api/tokenauth.html)

(If doing local dev)

- `yarn scratch new-dev-event <your_event_name>`
  - (ex: `yarn scratch new-dev-event chaos`)
- `yarn scratch new-dev-ticket <your_email> <your_event_name>`

  - (ex: `yarn scratch new-dev-ticket 0xcha0sg0d@gmail.com chaos`)

- Make a new PCDPass account with that email, then refresh PCDPass. You should see two folders with `Devconnect` and `Email` and inside `Devconnect` is a folder with the name of your event. Then `Devconnect<your_event_name>` should have a QR Code ticket.

- email: dev, pw: devconnect
