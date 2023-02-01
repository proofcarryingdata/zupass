pragma circom 2.0.0;

include "./lt.circom";

template ChunkedAdd(m, n, base){
  var numOutputs = calculateNumOutputs(m, n, base);
  var i;
  var j;
  var power =  2 ** base;

  signal input in[n][m];
  signal psum[m];
  signal carry[numOutputs];
  signal output out[numOutputs];

  component lt1[n][m];

  for(i = 0; i < n; i++) {
    for (j = 0; j < m; j++) {
      lt1[i][j] = LessThanPower(base);
      lt1[i][j].in <== in[i][j];
      lt1[i][j].out === 1;
    } 
  }

  var acc;
  for (j = 0; j < m; j++){
    acc = 0;

    for (i = 0; i < n; i++) {
      acc += in[i][j];
    }

    psum[j] <== acc;
  }
  
  carry[0] <== 0;
  for (i = 0; i < m; i++){
    out[i] <-- (psum[i] + carry[i]) % power;
    carry[i + 1] <-- (psum[i] + carry[i]) \ power;
    psum[i] + carry[i] === carry[i + 1] * power + out[i];
  }

  for (i = m; i < numOutputs-1; i++) {
    out[i] <-- carry[i] % power;
    carry[i + 1] <-- carry[i] \ power;
  }

  out[numOutputs-1] <== carry[numOutputs-1];

  component lt2[numOutputs];
  for(i = 0; i < numOutputs; i++) {
    lt2[i] = LessThanPower(base);
    lt2[i].in <== out[i];
    out[i] * lt2[i].out === out[i];
  }
}

// This function assumes m>=n
template ChunkedAdderIrregular(m, n, base){
    signal input a[m];
    signal input b[n];
    signal psum[m];
    signal carry[m + 1];
    signal output sum[m + 1];

    var power =  2 ** base;

    for (var i = 0; i < n ; i++){
        psum[i] <== a[i] + b[i];
    }

    for (var i = n; i < m ; i++){
        psum[i] <== a[i];
    }

    carry[0] <== 0;

    for (var i = 0; i < m; i++){
        sum[i] <-- (psum[i] + carry[i]) % power;
        carry[i + 1] <-- (psum[i] + carry[i]) \ power;
        psum[i] + carry[i] === carry[i + 1] * power + sum[i];
    }
    sum[m] <== carry[m];

    component lt1 = LessThanPower(base);
    lt1.in <== sum[0];
    lt1.out === 1;

    component lt2 = LessThanPower(base);
    lt2.in <== sum[m];
    lt2.out === 1;
}

function calculateNumOutputs(m, n, base) {
  return m + (n \ base) + 1;
}
