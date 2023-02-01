pragma circom 2.0.0;

include "./chunkify.circom";
include "./binadd.circom";
include "./lt.circom";

template BinMulFast(m, n) {
  signal input in1[m];
  signal input in2[n];
  signal output out[m+n];

  var i;
  var j;

  component chunkify1 = Chunkify(m, 51);
  var numChunks1 = calcChunks(m, 51);
  for (i=0; i<m; i++) {
    chunkify1.in[i] <== in1[i];
  }

  component chunkify2 = Chunkify(n, 51);
  var numChunks2 = calcChunks(n, 51);
  for (i=0; i<n; i++) {
    chunkify2.in[i] <== in2[i];
  }

  component bitifiers[numChunks1*numChunks2];
  var bitifiedProduct[numChunks1*numChunks2][m+n];
  var k;
  var endOfBits;
  component adders[numChunks1*numChunks2-1];
  for (i=0; i<numChunks1; i++) {
    for (j=0; j<numChunks2; j++) {
      bitifiers[i*numChunks2 + j] = Num2Bits(102);
      bitifiers[i*numChunks2 + j].in <== chunkify1.out[i] * chunkify2.out[j];

      if ((i+j)*51+102 < m+n) {
        endOfBits = (i+j)*51+102;
      } else {
        endOfBits = m+n;
      }
      for (k=0; k<(i+j)*51; k++) {
        bitifiedProduct[i*numChunks2 + j][k] = 0;
      }
      for (k=(i+j)*51; k<endOfBits; k++) {
        bitifiedProduct[i*numChunks2 + j][k] = bitifiers[i*numChunks2 + j].out[k-(i+j)*51];
      }
      for (k=endOfBits; k<m+n; k++) {
        bitifiedProduct[i*numChunks2 + j][k] = 0;
      }

      if (i!=0 || j!=0) {
        if ((numChunks2 > 1 && i==0 && j==1) || (numChunks2 ==1 && i==1 && j==0)) {
          adders[0] = BinAdd(m+n);
          for (k=0; k<m+n; k++) {
            adders[0].in[0][k] <== bitifiedProduct[0][k];
            adders[0].in[1][k] <== bitifiedProduct[1][k];
          }
        } else {
          adders[i*numChunks2 + j-1] = BinAdd(m+n);
          for (k=0; k<m+n; k++) {
            adders[i*numChunks2 + j-1].in[0][k] <== adders[i*numChunks2 + j-2].out[k];
            adders[i*numChunks2 + j-1].in[1][k] <== bitifiedProduct[i*numChunks2 + j][k];
          }
        }
      }
    }
  }

  if (numChunks1*numChunks2 == 1) {
    for (i=0; i<m+n; i++) {
      out[i] <== bitifiedProduct[0][i];
    }
  } else {
    if (numChunks1 * numChunks2 == 2) {
      for (i=0; i<m+n; i++) {
        out[i] <== adders[0].out[i];
      }
    } else {
      for (i=0; i<m+n; i++) {
        out[i] <== adders[numChunks1*numChunks2-2].out[i];
      }
    }
  }
}

template ChunkedMul(m, n, base){ //base 2**51 multiplier
  signal input in1[m];
  signal input in2[n];
  signal pp[n][m+n-1];
  signal sum[m+n-1];
  signal carry[m+n];
  signal output out[m+n];

  var power =  2 ** base;
  var i;
  var j;

  component lt1[m];
  for (i = 0; i < m; i++) {
    lt1[i] = LessThanPower(base);
    lt1[i].in <== in1[i];
    lt1[i].out === 1;
  } 

  component lt2[n];
  for (i = 0; i < n; i++) {
    lt2[i] = LessThanPower(base);
    lt2[i].in <== in2[i];
    lt2[i].out === 1;
  } 
  
  for (i = 0; i < n; i++){
    for (j = 0; j < m+n-1; j++){
      if (j<i){
        pp[i][j] <== 0;
      }
      else if (j>=i && j<=m-1+i){
        pp[i][j] <== in1[j-i] * in2[i];
      }
      else {
        pp[i][j] <== 0;
      }
    }
  }

  var vsum = 0;
  for (j=0; j<m+n-1; j++){
    vsum = 0;
    for (i=0; i<n; i++){
      vsum = vsum + pp[i][j];
    }
    sum[j] <== vsum;
  }
  
  carry[0] <== 0;
  for (j = 0; j < m+n-1; j++) {
    out[j] <-- (sum[j] + carry[j]) % power;
    carry[j+1] <-- (sum[j] + carry[j]) \ power;
    //Note: removing this line does not change the no of constraints
    sum[j]+carry[j] === carry[j+1] * power + out[j];
  }
  out[m+n-1] <-- carry[m+n-1];

  component lt[m+n];
  for(i = 0; i< m+n; i++) {
    lt[i] = LessThanPower(base);
    lt[i].in <== out[i];
    out[i] * lt[i].out === out[i];
  }
}

