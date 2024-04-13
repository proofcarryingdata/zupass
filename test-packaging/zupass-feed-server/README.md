# Zupass Feed Server

This demonstrates a feed server for the issuance of ticket PCDs.

The server offers a feed which you can subscribe to in Zupass. The feed requests your Email PCD as a credential, which allows it to issue tickets to you based on your email address.

You should set the ZUPASS_PUBLIC_KEY in `.env.local` to match the public key of the Zupass server you are using. If testing with production Zupass, use the key found at `https://api.zupass.org/issue/eddsa-public-key`, or if testing locally use the key found at `https://localhost:3002/issue/eddsa-public-key` (assuming the default ports are being used).

## Installation

Run `yarn` or `npm install`.

Copy artifacts to the `artifacts` directory using `./copy-artifacts.sh`.

## Running

Run `yarn dev` or `npm run dev`.

## Configuration

Test tickets are specified in `feed/tickets.json`. You can edit this file to change the folders and ticket types that the feed offers, and the email addresses to which tickets will be issued.
