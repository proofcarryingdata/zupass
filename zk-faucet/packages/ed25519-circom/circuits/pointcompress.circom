pragma circom 2.0.0;

include "modinv.circom";
include "chunkedmul.circom";
include "modulus.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";

template PointCompress(){
    signal input P[4][3];
    signal output out[256];
    var i;

    component mul_x = ChunkedMul(3, 3, 85);
    component mul_y = ChunkedMul(3, 3, 85);
    component modinv_z = BigModInv51();
    component mod_x = ModulusWith25519Chunked51(6);
    component mod_y = ModulusWith25519Chunked51(6);
    
    for(i=0;i<3;i++){
        modinv_z.in[i] <== P[2][i];
    }

    for(i=0;i<3;i++){
        mul_x.in1[i] <== P[0][i];
        mul_x.in2[i] <== modinv_z.out[i];
        mul_y.in1[i] <== P[1][i];
        mul_y.in2[i] <== modinv_z.out[i]; 
    }

    for(i=0;i<6;i++){
        mod_x.in[i] <== mul_x.out[i];
        mod_y.in[i] <== mul_y.out[i];
    }   

    component bits_y[3];
    for(i=0;i<3;i++){
        bits_y[i] = Num2Bits(85);
    }
    for(i=0;i<3;i++){
        bits_y[i].in <== mod_y.out[i];
    }
    
    component bits_x = Num2Bits(85);
    bits_x.in <== mod_x.out[0];
    
    for(i=0;i<85;i++){
        out[i] <== bits_y[0].out[i];
        out[i+85] <== bits_y[1].out[i];
        out[i+170] <== bits_y[2].out[i];
    }

    out[255] <-- mod_x.out[0] & 1;
    out[255] * (out[255] - 1) === 0;
}
