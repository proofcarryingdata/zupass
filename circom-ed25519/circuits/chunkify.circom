pragma circom 2.0.0;

include "../../circuits/node_modules/circomlib/circuits/bitify.circom";

template Chunkify(n, chunkSize) {
  signal input in[n];
  var numChunks = calcChunks(n, chunkSize);
  signal output out[numChunks];

  component bitifer[numChunks];
  var left = n;
  var i;
  var offset;
  var numBitsToConvert;
  for (var chunkIndex=0; chunkIndex<numChunks; chunkIndex++) {
    if (left < chunkSize) {
      numBitsToConvert = left;
    } else {
      numBitsToConvert = chunkSize;
    }

    bitifer[chunkIndex] = Bits2Num(numBitsToConvert);
    offset = chunkSize * chunkIndex;
    for (i=0; i<numBitsToConvert; i++) {
      bitifer[chunkIndex].in[i] <== in[offset+i];
    }
    out[chunkIndex] <== bitifer[chunkIndex].out;
    left -= chunkSize;
  }
}

function calcChunks(n, chunkSize) {
  var numChunks = n\chunkSize;
  if (n % chunkSize != 0) {
    numChunks++;
  }
  return numChunks;
}