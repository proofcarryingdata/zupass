# Podspec

A library for validating the structure of [POD](https://pod.org)s in TypeScript, providing static types and runtime validation.

## Usage

Install the package:

```bash
npm install @pcd/podspec
```

Create a POD spec:

```ts
import { p } from "@pcd/podspec";

const spec = p.entries({
  name: p.string(),
  email: p.string(),
  high_score: p.int()
});
```

Then use the spec to validate POD entries:

```ts
const entries = {
  name: { type: "string", value: "Bob Dugnutt" },
  email: { type: "string", value: "bob@dugnutt.com" },
  high_score: { type: "int", value: 999999 }
};

const result = spec.parse(entries);
```

If the entries are valid, the result will be `PODEntries` object, with static types for the entries which are part of the spec. Otherwise, an exception will be thrown.

## Use cases

### Validating PODEntries before signing a POD

When signing a POD, we want to make sure that the POD's entries meet our expectations. This means not just that the POD is well-formed, but that it also has the right structure and types.

For example, if we have a POD that represents a weapon in a game, we might have a spec that looks like this:

```ts
const weaponSpec = p.entries({
  name: p.string(),
  damage: p.int(),
  durability: p.int(),
  price: p.int()
});
```

Now we can use the spec to validate POD entries before signing a POD:

```ts
const entries = {
  name: { type: "string", value: "Narsil" },
  damage: { type: "int", value: 10n },
  durability: { type: "int", value: 100n },
  price: { type: "int", value: 100n }
};

const result = weaponSpec.parse(entries);
if (result.isValid) {
  // Ready to sign the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

### Turning JavaScript objects into PODEntries

In the above example, we assumed that already had POD entries to validate. However, we might have a JavaScript object that we want to turn into POD entries. `podspec` can do some simple transformations to turn JavaScript objects into POD entries.

First we specify that we want to coerce JavaScript objects into POD entries:

```ts
const coercingWeaponSpec = p.entries({
  name: p.coerce.string(),
  damage: p.coerce.int(),
  durability: p.coerce.int(),
  price: p.coerce.int()
});
```

Then we can use the spec to parse a JavaScript object:

```ts
const javascriptObject = {
  name: "Narsil",
  damage: 10,
  durability: 100,
  price: 100
};

const result = coercingWeaponSpec.parse(javascriptObject);
if (result.isValid) {
  // Ready to sign the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

Here, regular JavaScript objects are turned into POD entries. In particular, numbers are turned into `int`s, and strings are turned into `string`s.

### Validating an existing POD

If you have a POD that is already signed, you can use `podspec` to validate the POD, including both the entries and the signer public key.

```ts
const pod = getPodFromSomewhere();
const pubKey = "expected_public_key";
const podSpec = p
  .POD({
    eventId: p.string(),
    productId: p.string()
  })
  .signer(pubKey);

const result = podSpec.parse(pod);
if (result.isValid) {
  // Ready to use the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

This will check that the POD has the right structure and types, and that the signer is the expected signer.

You can also provide a list of valid signers:

```ts
const podSpec = p
  .POD({
    eventId: p.string(),
    productId: p.string()
  })
  .signerList([pubKey1, pubKey2]);
```

### Querying an array of PODs for matches

If you have an array of PODs, you can use the spec to query the array for PODs that match the spec:

```ts
const pods = [pod1, pod2, pod3];
const podSpec = p.entries({
  eventId: p.string(),
  productId: p.string()
});
const result = podSpec.query(pods);
result.matches; // Contains the PODs that match the spec
result.matchingIndexes; // Contains the array indexes of the PODs that match the spec
```

### Serializing Podspecs

To serialize a podspec to a JavaScript object, you can use the `serialize` method:

```ts
const serialized = podSpec.serialize();
```

Bear in mind that this will not serialize the podspec to a string, but rather to a JavaScript object. Since the object may contain `bigint` values, you may need to serialize it using a specialized library like `json-bigint`.

## Other constraints

### Range checks

As well as ensuring the existence and type of POD entries, `podspec` also provides some additional constraints, such as range and list checks.

```ts
const rangeSpec = p.entries({
  value: p.int().range(0n, 100n)
});

const entries = {
  value: { type: "int", value: 50n }
};

const result = rangeSpec.parse(entries);
```

This will parse successfully. This will not:

```ts
const entries = {
  value: { type: "int", value: 200n }
};

const result = rangeSpec.parse(entries);
```

### List checks

Entries can be checked against a list of values:

```ts
const listSpec = p.entries({
  value: p.int().list([1n, 2n, 3n])
});

const entries = {
  value: { type: "int", value: 2n }
};

const result = listSpec.parse(entries);
```

This will parse successfully because the value `2n` in the list.

Lists can also be used to specify invalid values which should not be allowed:

```ts
const listSpec = p.entries({
  value: p.int().list([1n, 2n, 3n], { exclude: true })
});

const entries = {
  value: { type: "int", value: 2n }
};

const result = listSpec.parse(entries);
```

This will not parse successfully because the value `2n` is in the list of excluded values.

### Tuple checks

Multiple entries can be checked against a list of valid tuples.

```ts
const tupleSpec = p
  .entries({
    foo: p.string(),
    bar: p.int()
  })
  .tuple({
    name: "test",
    exclude: false,
    entries: ["foo", "bar"],
    members: [
      [
        { type: "string", value: "test" },
        { type: "int", value: 1n }
      ],
      [
        { type: "string", value: "test2" },
        { type: "int", value: 2n }
      ]
    ]
  });
```

In this example, we will accept any set of POD entries which has either `a foo entry with value "test" and a bar entry with value 1n` or `a foo entry with value "test2" and a bar entry with value 2n`.

```ts
const entries = {
  foo: { type: "string", value: "test" },
  bar: { type: "int", value: 1n }
};

const result = tupleSpec.parse(entries);
```

This matches the first tuple in the list, so the result will be valid.

```ts
const entries = {
  foo: { type: "string", value: "test2" },
  bar: { type: "int", value: 2n }
};

const result = tupleSpec.parse(entries);
```

This matches the second tuple in the list, so the result will be valid.

```ts
const entries = {
  foo: { type: "string", value: "test" },
  bar: { type: "int", value: 2n }
};

const result = tupleSpec.parse(entries);
```

This has a `foo` entry which matches the first tuple, and a `bar` entry which matches the second tuple, but does not match either tuple as a whole. Therefore, the result will be invalid.
