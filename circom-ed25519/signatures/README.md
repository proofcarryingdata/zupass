The verify circuit takes a message input as an array with length multiple of 2.

```
template Ed25519Verifier(n) {
  assert(n % 8 == 0);

  signal input msg[n];
```

> `msg` is the data for the signature

What the fuck does 'is the data' mean???

I am assuming this is because the input is represented in binary. I was able to determine this by:

1. infering that the input is in bytes, since signatures generally operate on binary representations of data
2. by looking into the file `../node_modules/@electron-labs/sha512/circuits/sha512/sha512.circom`, which contains a template that is used by the verification circuit, and noting that its template parameter is called `nBits`. 