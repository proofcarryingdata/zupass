# ZuAuth

If you want to authenticate users with Zupass, this guide will get you started quickly. We're assuming that you're using JavaScript, but no framework is required.

# Install the ZuAuth package

Authentication with Zupass is done with the ZuAuth library. The first step is to add this library to your project. If you're using npm, you can run the following command:

```
npm install @pcd/zuauth
```

Or, if you're using yarn:

```
yarn add @pcd/zuauth
```

# Import ZuAuth

Next, you will need to import ZuAuth to your project. Add the following line to the top of your file:

```jsx
import { zuAuthPopup } from "@pcd/zuauth";
```

This will let you call the `zuAuthPopup` function, which starts the authentication process.

# Begin authentication

Because the user’s data is held in browser local storage, we need to open a popup window that can access this data. The user interacts with this popup in order to approve the generation of a proof, and the proof contents are returned to your app.

![An example of an authentication popup being opened by the PoWFaucet app at Devconnect](https://0xparc.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2F49789257-8634-4c86-a9e2-dcecb65edf1c%2F28f7f173-df66-4e00-aadc-d9738956634a%2FUntitled.png?table=block&id=e474c4be-2cf4-4416-a9fe-313fc3f6355c&spaceId=49789257-8634-4c86-a9e2-dcecb65edf1c&width=1420&userId=&cache=v2)

An example of an authentication popup being opened by the PoWFaucet app at Devconnect

To start authentication, call `zuAuthPopup` like this:

```jsx
const result = await zuAuthPopup({
  fieldsToReveal: {
    revealAttendeeEmail: true,
    revealAttendeeName: true,
    revealEventId: true
  },
  watermark: 12345n,
  config: [
    {
      pcdType: "eddsa-ticket-pcd",
      publicKey: [
        "1ebfb986fbac5113f8e2c72286fe9362f8e7d211dbc68227a468d7b919e75003",
        "10ec38f11baacad5535525bbe8e343074a483c051aa1616266f3b1df3fb7d204"
      ],
      productId: "f4cbd4c9-819e-55eb-8c68-90a660bacf49",
      eventId: "3cf75131-6631-5096-b2e8-03c25d00f4de",
      eventName: "Example Ticket",
      productName: "EdDSA"
    }
  ]
});

// Result should be { type: "pcd", pcdStr: "a long JSON-encoded blob" }
```

Let's break these parameters down one-by-one:

- `fieldsToReveal` determines which fields from the user's ticket will be revealed by the ZK proof
- `watermark` is a caller-specified [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) value that will be included in the ZK proof. You can use this to include app-specific or session-specific values in the proof, which you can check for when verifying. This prevents proofs produced for other apps or sessions being re-used.
- `config` is a collection of data about the kinds of tickets that your app will accept as valid for authentication. To view configurations for events that used Zupass, see the [Sample configurations](https://www.notion.so/Sample-configurations-ad7c80808fd04a48ba898eab60f530fb?pvs=21) section below.

<aside>
💡 To use the example configuration above, you will need to subscribe to the “Example Ticket” feed in Zupass, which will give you a ticket that matches the configuration above. You can subscribe to the feed [here](https://api.zupass.org/generic-issuance/api/feed/e5c41360-3a46-458e-9e12-41c807f9e77e/0).

</aside>

This will open a popup window. The function is asynchronous, so will not return until the popup has closed.

- `"pcd"`, indicating that proof-carrying data was received from the popup window
- `"popupClosed"`, indicating that the user closed the popup window without creating a proof
- `"popupBlocked"`, indicating that the browser blocked the opening of the popup, perhaps due to the user’s security settings or the use of a popup blocker

# Verifying the authentication result

Let’s assume that the user generated a proof, and you got a `"pcd"` result type. To see what the result contains, you could just deserialize it:

```jsx
import { ZkEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";

const result = await zuAuthPopup(/* parameters as in the previous example */);

if (result.type === "pcd") {
  const pcd = await ZkEdDSAEventTicketPCDPackage.deserialize(result.pcdStr);

  console.log(
    "The user's email address is " +
      pcd.claim.partialTicket.attendeeEmailAddress
  );
}
```

If this were just regular data, then you would have to trust that this really _did_ come from Zupass, and that the user really _does_ have a ticket. But since this is [proof-carrying data](https://github.com/proofcarryingdata/zupass?tab=readme-ov-file#for-developers-understanding-the-pcd-model), we have cryptographic proof that we can verify. This is how your app can trust data that the user produced on their own device.

The details are complex, but using ZuAuth's `authenticate` function to do our cryptographic verification makes it simple to do. Let's look at a full example:

```jsx
import { zuAuthPopup } from "@pcd/zuauth";
import { authenticate } from "@pcd/zuauth/server";

const watermark = 12345n;
const config = [
  {
    pcdType: "eddsa-ticket-pcd",
    publicKey: [
      "1ebfb986fbac5113f8e2c72286fe9362f8e7d211dbc68227a468d7b919e75003",
      "10ec38f11baacad5535525bbe8e343074a483c051aa1616266f3b1df3fb7d204"
    ],
    productId: "f4cbd4c9-819e-55eb-8c68-90a660bacf49",
    eventId: "3cf75131-6631-5096-b2e8-03c25d00f4de",
    eventName: "Example Ticket",
    productName: "EdDSA"
  }
];

const result = await zuAuthPopup({
  fieldsToReveal: {
    revealAttendeeEmail: true,
    revealAttendeeName: true,
    revealEventId: true,
    revealProductId: true
  },
  watermark,
  config
});

if (result.type === "pcd") {
  try {
    const pcd = await authenticate(result.pcdStr, watermark, eventMetadata);
    console.log("Got PCD data: ", pcd.claim.partialTicket);
    // Prints { attendeeEmail: "", attendeeName: "", eventId: "", productId: ""}
  } catch (e) {
    console.log("Authentication failed: ", e);
  }
}
```

It's important that we use the same values to authenticate that we did to open the popup window, because we need to validate that the PCD we received from Zupass matches the values we asked for.

## Server-side verification

In the above example, we showed the opening of the popup and the verification of the result happening in the same place. Because a popup window is being opened, that place must be the browser. However, there are good reasons to choose to do verification on the server-side.

First of all, client-side verification might not fit your security model: if the client verifies the PCD, should your server trust that? It often makes more sense for the server to verify the PCD, and then use cookies or other session mechanisms to remember which users have verified PCDs.

Secondly, verification is a cryptographic operation with some heavyweight dependencies. ZK circuits and cryptographic libraries are large and relatively slow compared to typical JavaScript code. You don't want your users to have to download several megabytes of WASM to do client-side verification if you can do it on your server.

To authenticate values on the server-side, you can receive the serialized PCD from the popup window in the client like this:

```jsx
import { zuAuthPopup } from "@pcd/zuauth";

const watermark = 12345n;
const config = [
  {
    pcdType: "eddsa-ticket-pcd",
    publicKey: [
      "1ebfb986fbac5113f8e2c72286fe9362f8e7d211dbc68227a468d7b919e75003",
      "10ec38f11baacad5535525bbe8e343074a483c051aa1616266f3b1df3fb7d204"
    ],
    productId: "f4cbd4c9-819e-55eb-8c68-90a660bacf49",
    eventId: "3cf75131-6631-5096-b2e8-03c25d00f4de",
    eventName: "Example Ticket",
    productName: "EdDSA"
  }
];

const result = await zuAuthPopup({
  fieldsToReveal: {
    revealAttendeeEmail: true,
    revealAttendeeName: true,
    revealEventId: true,
    revealProductId: true
  },
  watermark,
  config
});

if (result.type === "pcd") {
  // Send the contents of result.pcdStr to a back-end server
}
```

On the back-end server, you can receive the string and then authenticate it:

```jsx
import { authenticate } from "@pcd/zuauth/server";

try {
  const pcdStr = request.body.pcdStr; // Use your server's request object here
  const pcd = await authenticate(pcdStr, 12345n, config);

  // Save the user's email address, create a session, etc.
} catch (e) {
  // The submitted pcdStr does not meet our requirements
  // Return a HTTP error response
}
```

For an example of server-side verification in NextJS, see [https://github.com/proofcarryingdata/zupass/tree/main/examples/zuauth](https://github.com/proofcarryingdata/zupass/tree/main/examples/zuauth)

## Using watermarks to add security

The `watermark` parameter allows you to insert a special value into the zero-knowledge proof. This is an important security mechanism, because it allows you to create proofs that are unique to your application, or to a user session. Without this, you can’t distinguish between a proof created for authenticating with your application, or a proof created for some other purpose. If your application accepts unwatermarked proofs then this would allow malicious third-parties to trick the user into generating a proof for use with their app or service, which they can reuse to authenticate as that user with _your_ app or service.

The safest solution is to generate a unique watermark for each authentication attempt, which is stored on the server side of your app.

This means that before opening the popup window, you should make a request to your back-end service for a unique watermark number, then pass that to `zuAuthPopup`. If you pass the same watermark number to `authenticate`, it will check that the watermark matches.

This will require some session management in your app, which is out of scope for this tutorial. However, [this example](https://github.com/proofcarryingdata/zupass/tree/main/examples/zuauth) shows how a watermark can be generated, stored in a session, and used during authentication.

# Sample configurations

If you would like to see some configurations you can use with ZuAuth, please visit the documentation page [here](https://0xparc.notion.site/ZuAuth-Tutorial-777392e05ea449c6bf8b5568349023bb?pvs=25#0fb4f5728e5649a9b8681c58d786d467).
