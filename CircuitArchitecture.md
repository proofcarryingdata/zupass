This circuit will, given:

- ed25519 public key and a message signed by it
- OR an RSA public key and a message signed by it
- verify that this public key is included in a merkle tree
- verify that the message was signed by the private key corresponding to the given public key
- without revealing the public key

The ed25519 circuits are provided by https://github.com/Electron-Labs/ed25519-circom.

The inputs to this circuit are as follows:

- `msg` is the data for the signature (I am assuming this means in binary, LSB to MSB, in bits, where the amount of bits is a multiple of 8, i.e. bytes)
- `R8` is the first 256 bits of the signature (LSB to MSB, 256 bits)
- `S` is the first 255 bits of the last 256 bits of the signature (LSB to MSB, 255 bits)
- `A` is the public key in binary (LSB to MSB, 256 bits)
- `PointA` is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)
- `PointR` is the point representing the R8 value on the elliptic curve (encoded in base 2^85)

## Format of public key ed25519

- The public key is encoded as compressed EC point: the y-coordinate, combined with the lowest bit (the parity) of the x-coordinate. For Ed25519 the public key is 32 bytes
