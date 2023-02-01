pragma circom 2.0.0;

include "chunkedmul.circom";
include "modulus.circom";

template InverseModulo(nBits){
  signal input in[nBits];
  signal output out[255];
  component pow0;
  component pow1;
  component pow2;
  component pow3;
  component pow4;
  component pow5;
  component pow6;
  component pow7;
  component pow8;
  component pow9;
  component pow10;
  component pow11;
  component pow12;
  component pow13;
  component pow14;
  component pow15;
  component pow16;
  component pow17;
  component pow18;
  component pow19;
  component pow20;
  component pow21;
  component pow22;
  component pow23;
  component pow24;
  component pow25;
  component pow26;
  component pow27;
  component pow28;
  component pow29;
  component pow30;
  component pow31;

  var i;
  //REALLY UGLY CODE COMING UP

  pow0=square(nBits);
  for(i=0;i<nBits;i++){
    pow0.in[i] <== in[i];
  }

  pow1=multred(255,nBits);
  for(i=0;i<255;i++){
    pow1.in1[i] <== pow0.out[i];
  }
  for(i=0;i<nBits;i++){
    pow1.in2[i] <== in[i];
  }

  pow2=square(255);
  for(i=0;i<255;i++){
    pow2.in[i] <== pow1.out[i];
  }

  pow3=multred(255,nBits);
  for(i=0;i<255;i++){
    pow3.in1[i] <== pow2.out[i];
  }
  for(i=0;i<nBits;i++){
    pow3.in2[i] <== in[i];
  }

  pow4=power2(3);
  for(i=0;i<255;i++){
    pow4.in[i] <== pow3.out[i];
  }

  pow5=multred(255,255);
  for(i=0;i<255;i++){
    pow5.in1[i] <== pow4.out[i];
  }
  for(i=0;i<255;i++){
    pow5.in2[i] <== pow3.out[i];
  }

  pow6=square(255);
  for(i=0;i<255;i++){
    pow6.in[i] <== pow5.out[i];
  }

  pow7=multred(255,nBits);
  for(i=0;i<255;i++){
    pow7.in1[i] <== pow6.out[i];
  }
  for(i=0;i<nBits;i++){
    pow7.in2[i] <== in[i];
  }

  pow8=power2(7);
  for(i=0;i<255;i++){
    pow8.in[i] <== pow7.out[i];
  }

  pow9=multred(255,255);
  for(i=0;i<255;i++){
    pow9.in1[i] <== pow8.out[i];
  }
  for(i=0;i<255;i++){
    pow9.in2[i] <== pow7.out[i];
  }

  pow10=square(255);
  for(i=0;i<255;i++){
    pow10.in[i] <== pow9.out[i];
  }

  pow11=multred(255,nBits);
  for(i=0;i<255;i++){
    pow11.in1[i] <== pow10.out[i];
  }
  for(i=0;i<nBits;i++){
    pow11.in2[i] <== in[i];
  }

  pow12=power2(15);
  for(i=0;i<255;i++){
    pow12.in[i] <== pow11.out[i];
  }

  pow13=multred(255,255);
  for(i=0;i<255;i++){
    pow13.in1[i] <== pow12.out[i];
  }
  for(i=0;i<255;i++){
    pow13.in2[i] <== pow11.out[i];
  }

  pow14=square(255);
  for(i=0;i<255;i++){
    pow14.in[i] <== pow13.out[i];
  }

  pow15=multred(255,nBits);
  for(i=0;i<255;i++){
    pow15.in1[i] <== pow14.out[i];
  }
  for(i=0;i<nBits;i++){
    pow15.in2[i] <== in[i];
  }

  pow16=power2(31);
  for(i=0;i<255;i++){
    pow16.in[i] <== pow15.out[i];
  }

  pow17=multred(255,255);
  for(i=0;i<255;i++){
    pow17.in1[i] <== pow16.out[i];
  }
  for(i=0;i<255;i++){
    pow17.in2[i] <== pow15.out[i];
  }

  pow18=power2(62);
  for(i=0;i<255;i++){
    pow18.in[i] <== pow17.out[i];
  }

  pow19=multred(255,255);
  for(i=0;i<255;i++){
    pow19.in1[i] <== pow18.out[i];
  }
  for(i=0;i<255;i++){
    pow19.in2[i] <== pow17.out[i];
  }

  pow20=square(255);
  for(i=0;i<255;i++){
    pow20.in[i] <== pow19.out[i];
  }

  pow21=multred(255,nBits);
  for(i=0;i<255;i++){
    pow21.in1[i] <== pow20.out[i];
  }
  for(i=0;i<nBits;i++){
    pow21.in2[i] <== in[i];
  }

  pow22=power2(125);
  for(i=0;i<255;i++){
    pow22.in[i] <== pow21.out[i];
  }

  pow23=multred(255,255);
  for(i=0;i<255;i++){
    pow23.in1[i] <== pow22.out[i];
  }
  for(i=0;i<255;i++){
    pow23.in2[i] <== pow21.out[i];
  }

  pow24=square(255);
  for(i=0;i<255;i++){
    pow24.in[i] <== pow23.out[i];
  }

  pow25=square(255);
  for(i=0;i<255;i++){
    pow25.in[i] <== pow24.out[i];
  }

  pow26=multred(255,nBits);
  for(i=0;i<255;i++){
    pow26.in1[i] <== pow25.out[i];
  }
  for(i=0;i<nBits;i++){
    pow26.in2[i] <== in[i];
  }

  pow27=square(255);
  for(i=0;i<255;i++){
    pow27.in[i] <== pow26.out[i];
  }

  pow28=square(255);
  for(i=0;i<255;i++){
    pow28.in[i] <== pow27.out[i];
  }

  pow29=multred(255,nBits);
  for(i=0;i<255;i++){
    pow29.in1[i] <== pow28.out[i];
  }
  for(i=0;i<nBits;i++){
    pow29.in2[i] <== in[i];
  }

  pow30=square(255);
  for(i=0;i<255;i++){
    pow30.in[i] <== pow29.out[i];
  }

  pow31=multred(255,nBits);
  for(i=0;i<255;i++){
    pow31.in1[i] <== pow30.out[i];
  }
  for(i=0;i<nBits;i++){
    pow31.in2[i] <== in[i];
  }

  for(i=0;i<255;i++){
    out[i] <== pow31.out[i];
  }

}

template square(nBits){
  signal input in[nBits];
  signal output out[255];
  component intermediate;
  intermediate = BinMulFast(nBits,nBits);
  var i;
  for(i=0;i<nBits;i++){
    intermediate.in1[i] <== in[i];
    intermediate.in2[i] <== in[i];
  }
  
  component mod_red = ModulusWith25519(2*nBits);
  for(i=0;i<2*nBits;i++){
    mod_red.in[i] <== intermediate.out[i];
  }
  for(i=0;i<255;i++){
    out[i] <== mod_red.out[i];
  }
}

template power2(k){
  signal input in[255];
  signal output out[255];
  component sq[k];
  var i;
  var j;
  for(i=0;i<k;i++){
    sq[i] = square(255);
  }
  for(i=0;i<255;i++){
    sq[0].in[i] <== in[i];
  }
  for(i=1;i<k;i++){
    for(j=0;j<255;j++){
      sq[i].in[j] <== sq[i-1].out[j];
    }
  }
  for(i=0;i<255;i++){
    out[i] <== sq[k-1].out[i];
  }
}

template multred(a,b){
  signal input in1[a];
  signal input in2[b];
  signal output out[255];
  component prod;
  prod = BinMulFast(a,b);
  var i;
  for(i=0;i<a;i++){
    prod.in1[i] <== in1[i];
  }
  for(i=0;i<b;i++){
    prod.in2[i] <== in2[i];
  }
  component reduce;
  reduce = ModulusWith25519(a+b);
  for(i=0;i<a+b;i++){
    reduce.a[i] <== prod.out[i];
  }
  for(i=0;i<255;i++){
    out[i] <== reduce.out[i];
  }
}
