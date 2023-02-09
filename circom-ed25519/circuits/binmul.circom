pragma circom 2.0.0;

include "binadd.circom";

template BinMul(m, n) {
  signal input in1[m];
  signal input in2[n];
  signal output out[m+n];

  var intermediate[m+n];
  var addends[n][m+n];

  var i;
  var j;
  for(i=0; i<n; i++) {
    for(j=0; j<i; j++) {
      addends[i][j] = 0;
    }
    for(j=0; j<m; j++) {
      addends[i][i+j] = in1[j]*in2[i];
    }
    for(j=i+m; j<m+n; j++) {
      addends[i][j] = 0;
    }
  }

  for(i=0; i<m+n; i++) {
    intermediate[i] = 0;
  }
  component adders[n];
  for(i=0; i<n; i++) {
    adders[i] = BinAdd(m+n);
    for(j=0; j<m+n; j++) {
      adders[i].in[0][j] <== intermediate[j];
      adders[i].in[1][j] <== addends[i][j];
    }
    for(j=0; j<m+n; j++) {
      intermediate[j] = adders[i].out[j];
    }
  }

  for(i=0; i<m+n; i++) {
    out[i] <== intermediate[i];
  }
}