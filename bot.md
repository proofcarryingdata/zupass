- [x] Command to just run passport client and server in dev mode
- [ ] Dev ticketing flow

## Notes on Dev Flow

Setup:

- Run `cp apps/passport-server/.env.local.example apps/passport-server/.env`
- Obtain a Telegram Bot [Token](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- Paste the token in `apps/passport-server/.env` for the `TELEGRAM_BOT_TOKEN` value

- `yarn`
- `yarn build`
- `yarn localdb:init && yarn localdb:up`
- `yarn dev:bot`
