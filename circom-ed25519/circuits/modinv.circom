pragma circom 2.0.0;

include "./chunkedmul.circom";
include "./modulus.circom";
include "./utils.circom";
include "./lt.circom";

template BigModInv51() {
  signal input in[3];
  signal output out[3];

  var p[3] = [38685626227668133590597613, 38685626227668133590597631, 38685626227668133590597631];

  // length k
  var inv[100] = mod_inv(85, 3, in, p);
  for (var i = 0; i < 3; i++) {
    out[i] <-- inv[i];
  }
  component lt[3];
  for (var i = 0; i < 3; i++) {
    lt[i] = LessThanPower(85);
    lt[i].in <== out[i];
    lt[i].out * out[i] === out[i];
  }

  component mult = ChunkedMul(3, 3, 85);
  for (var i = 0; i < 3; i++) {
    mult.in1[i] <== in[i];
    mult.in2[i] <== out[i];
  }
  component mod = ModulusWith25519Chunked51(6);
  for (var i = 0; i < 6; i++) {
    mod.in[i] <== mult.out[i];
  }
  mod.out[0] === 1;
  for (var i = 1; i < 3; i++) {
    mod.out[i] === 0;
  }
}
