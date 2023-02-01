pragma circom 2.0.0;
include "point-addition.circom";

template Multiplexor2() {
    signal input sel;
    signal input in[2][4][3];
    signal output out[4][3];
    var i;
    for(i=0;i<3;i++){
        out[0][i] <== (in[1][0][i] - in[0][0][i])*sel + in[0][0][i];
        out[1][i] <== (in[1][1][i] - in[0][1][i])*sel + in[0][1][i];
        out[2][i] <== (in[1][2][i] - in[0][2][i])*sel + in[0][2][i];
        out[3][i] <== (in[1][3][i] - in[0][3][i])*sel + in[0][3][i];
    }
}

template BitElementMulAny() {
    signal input sel;
    signal input dblIn[4][3];
    signal input addIn[4][3];
    signal output dblOut[4][3];
    signal output addOut[4][3];

    component doubler = DoublePt();
    component adder = PointAdd();
    component selector = Multiplexor2();

    var i;

    sel ==> selector.sel;

    for(i=0;i<3;i++){
        dblIn[0][i] ==> doubler.P[0][i];
        dblIn[1][i] ==> doubler.P[1][i];
        dblIn[2][i] ==> doubler.P[2][i];
        dblIn[3][i] ==> doubler.P[3][i];
    }
   
    for(i=0;i<3;i++){
        doubler.out_2P[0][i] ==> adder.P[0][i];
        doubler.out_2P[1][i] ==> adder.P[1][i];
        doubler.out_2P[2][i] ==> adder.P[2][i];
        doubler.out_2P[3][i] ==> adder.P[3][i];
    }

    for(i=0;i<3;i++){
        addIn[0][i] ==> adder.Q[0][i];
        addIn[1][i] ==> adder.Q[1][i];
        addIn[2][i] ==> adder.Q[2][i];
        addIn[3][i] ==> adder.Q[3][i];
    }

    for(i=0;i<3;i++){
        addIn[0][i] ==> selector.in[0][0][i];
        addIn[1][i] ==> selector.in[0][1][i];
        addIn[2][i] ==> selector.in[0][2][i];
        addIn[3][i] ==> selector.in[0][3][i];

        adder.R[0][i] ==> selector.in[1][0][i];
        adder.R[1][i] ==> selector.in[1][1][i];
        adder.R[2][i] ==> selector.in[1][2][i];
        adder.R[3][i] ==> selector.in[1][3][i];
    }
    

    for(i=0;i<3;i++){
        doubler.out_2P[0][i] ==> dblOut[0][i];
        doubler.out_2P[1][i] ==> dblOut[1][i];
        doubler.out_2P[2][i] ==> dblOut[2][i];
        doubler.out_2P[3][i] ==> dblOut[3][i];

        selector.out[0][i] ==> addOut[0][i];
        selector.out[1][i] ==> addOut[1][i];
        selector.out[2][i] ==> addOut[2][i];
        selector.out[3][i] ==> addOut[3][i];
    }   
}

template ScalarMul(){
    signal input s[255];
    signal input P[4][3];
    signal output sP[4][3];

    component bits[254];

    var i;
    var j;

    bits[0] = BitElementMulAny();
    for(i=0;i<3;i++){
        bits[0].dblIn[0][i] <== P[0][i];
        bits[0].dblIn[1][i] <== P[1][i];
        bits[0].dblIn[2][i] <== P[2][i];
        bits[0].dblIn[3][i] <== P[3][i];

        bits[0].addIn[0][i] <== P[0][i];
        bits[0].addIn[1][i] <== P[1][i];
        bits[0].addIn[2][i] <== P[2][i];
        bits[0].addIn[3][i] <== P[3][i];
    }
    bits[0].sel <== s[1];

    for(i=1;i<254;i++){
        bits[i] = BitElementMulAny();
        for(j=0;j<3;j++){
            bits[i-1].dblOut[0][j] ==> bits[i].dblIn[0][j];
            bits[i-1].dblOut[1][j] ==> bits[i].dblIn[1][j];
            bits[i-1].dblOut[2][j] ==> bits[i].dblIn[2][j];
            bits[i-1].dblOut[3][j] ==> bits[i].dblIn[3][j];

            bits[i-1].addOut[0][j] ==> bits[i].addIn[0][j];
            bits[i-1].addOut[1][j] ==> bits[i].addIn[1][j];
            bits[i-1].addOut[2][j] ==> bits[i].addIn[2][j];
            bits[i-1].addOut[3][j] ==> bits[i].addIn[3][j];
        }

        s[i+1] ==> bits[i].sel;
    }

    var prime_p[3] = [38685626227668133590597613, 38685626227668133590597631, 38685626227668133590597631];
    component sub_x = ChunkedSub(3, 85);
    for(i=0;i<3;i++){
        sub_x.a[i] <== prime_p[i];
        sub_x.b[i] <== P[0][i];
    }
    component sub_t = ChunkedSub(3, 85);
    for(i=0;i<3;i++){
        sub_t.a[i] <== prime_p[i];
        sub_t.b[i] <== P[3][i];
    }
    component finaladder = PointAdd();
    for(i=0;i<3;i++){
        finaladder.P[0][i] <== bits[253].addOut[0][i];
        finaladder.P[1][i] <== bits[253].addOut[1][i];
        finaladder.P[2][i] <== bits[253].addOut[2][i];
        finaladder.P[3][i] <== bits[253].addOut[3][i];

        finaladder.Q[0][i] <== sub_x.out[i];
        finaladder.Q[1][i] <== P[1][i];
        finaladder.Q[2][i] <== P[2][i];
        finaladder.Q[3][i] <== sub_t.out[i];
    }
    component lastSel = Multiplexor2();
    s[0] ==> lastSel.sel;
    
    for(i=0;i<3;i++){
        finaladder.R[0][i] ==> lastSel.in[0][0][i]; 
        finaladder.R[1][i] ==> lastSel.in[0][1][i];
        finaladder.R[2][i] ==> lastSel.in[0][2][i]; 
        finaladder.R[3][i] ==> lastSel.in[0][3][i];

        bits[253].addOut[0][i] ==> lastSel.in[1][0][i];
        bits[253].addOut[1][i] ==> lastSel.in[1][1][i];
        bits[253].addOut[2][i] ==> lastSel.in[1][2][i];
        bits[253].addOut[3][i] ==> lastSel.in[1][3][i];
    }

    for(i=0;i<3;i++){
        sP[0][i] <== lastSel.out[0][i];
        sP[1][i] <== lastSel.out[1][i];
        sP[2][i] <== lastSel.out[2][i];
        sP[3][i] <== lastSel.out[3][i];
    }
}
