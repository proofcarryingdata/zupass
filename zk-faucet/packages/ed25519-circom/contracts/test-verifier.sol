//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.11;
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );

/*
        // Changed by Jordi point
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
*/
    }
    /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory r) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-add-failed");
    }
    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}
contract Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }
    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            20491192805390485299153009773594534940189261866228447918068658471970481763042,
            9383485363053290200918347156157836566562967994039712273449902621266178545958
        );

        vk.beta2 = Pairing.G2Point(
            [4252822878758300859123897981450591353533073413197771768651442665752259397132,
             6375614351688725206403948262868962793625744043794305715222011528459656738731],
            [21847035105528745403288232691147584728191162732299865338377159692350059136679,
             10505242626370262277552901082094356697409835680220590971873171140371331206856]
        );
        vk.gamma2 = Pairing.G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
        vk.delta2 = Pairing.G2Point(
            [14264224196899353800543367999525075765943744025449601386425105981609273614701,
             16809031008450260338666218659281275370828342486329981864349494337906939571887],
            [19575774426779481952987745556743272872528397589822551825491193352706249147828,
             11890256881228627469373664690032300678627026600164400771388911741873652827176]
        );
        vk.IC = new Pairing.G1Point[](20);
        
        vk.IC[0] = Pairing.G1Point( 
            703628372913608924678229163876049246019207425954662225921071872483627421722,
            12211995813319149655177018938770234811518560618061207904053494967754185713570
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            245257359888022973124621370122921842349425470670527924595405093609495308747,
            16424211039905278739428973076501641419102983596574674938829868639077765818142
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            11110164462478062380497336442107420783806541677398299686522715666379498138472,
            11772875621558518653532220728777759671658134704623077088185806874340215959359
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            18074393405015025057791386123633410704735277649988577562824116025859630543119,
            6512362579817099053449579131846840340322546772440905776424666285439665971742
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            16324035526312367325456640773935782752062271159753322602146362004262088969135,
            1959877669644004327327941905732419844609901799055849407390385762919820073782
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            7958732978061398276873406529212832852529841068044035448997300713023105585033,
            17143584956740843297694279539007817220119917091654840292522900244927912727369
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            19790616331302654635046558077934057923437716290995001520546062733967158884432,
            3876239317603061711287361903875372717184929107501147494633374979429019396018
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            14590717951490734152256639590507997933809755442616725401381713035954026634761,
            3225155507246149008951243692824143870155533409045696678069139586430835695226
        );                                      
        
        vk.IC[8] = Pairing.G1Point( 
            8650680088861200059927247719422818384661114515347998151694550511594524540419,
            9638849577460518420520485529873913372767621068985215869067476349645606505077
        );                                      
        
        vk.IC[9] = Pairing.G1Point( 
            17562317824746836410714834945198951796768727084595092618069846988441315688042,
            19452027031432595136507137552742780122072574021124781097949079775870562190348
        );                                      
        
        vk.IC[10] = Pairing.G1Point( 
            13182231104070542193327121010898638946743037034726286337778578885258172200370,
            757187892995880849330492963674577612574015215504544964795700288326850257327
        );                                      
        
        vk.IC[11] = Pairing.G1Point( 
            14409932519884296032513716882778643894210345146972579810764887578771580357222,
            814882272533738805340475214361663264998713952212684412413716253117631329790
        );                                      
        
        vk.IC[12] = Pairing.G1Point( 
            12509202143372575765947197406153125630356821791569394199509048702081149394252,
            7737627039987972603153686057063377754848525136672116479087023797531609007397
        );                                      
        
        vk.IC[13] = Pairing.G1Point( 
            8407744049840718757455802166031970590203865445336729285031156887247294225651,
            188049909694651097938181392474312752814356026969638293041076738773396096245
        );                                      
        
        vk.IC[14] = Pairing.G1Point( 
            334110586971536499255771782557320020258112908015957001506636732710862874984,
            16580656581000952485971124280378233725304032835996723142898957560222784358519
        );                                      
        
        vk.IC[15] = Pairing.G1Point( 
            7727226277603419079704813924510379012883865378360151539308685989224075286070,
            12912566309035429310049884735227185094569540217854933912859497659097301533657
        );                                      
        
        vk.IC[16] = Pairing.G1Point( 
            7681998061757907807252614087798324369243677279399770153101699113400315047554,
            17481742211680301513436042099326808806059638013948490790089189392596297352637
        );                                      
        
        vk.IC[17] = Pairing.G1Point( 
            12569417065062182916398142101141299032330235062582799620914438471333638326044,
            17523163572024314338870129158401181066960544407476643264775649919375538750903
        );                                      
        
        vk.IC[18] = Pairing.G1Point( 
            20366720006081427400904331708710783224493502999618856932501475384256136971442,
            12984908039677137046692512896720328898650869058550411984382690230037651160819
        );                                      
        
        vk.IC[19] = Pairing.G1Point( 
            8428544296631560843765157901673529267885840366893744558046063361202851291828,
            16289478447662297604149997612134385555472387391722487532370257859531844209269
        );                                      
        
    }
    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.IC.length,"verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (!Pairing.pairingProd4(
            Pairing.negate(proof.A), proof.B,
            vk.alfa1, vk.beta2,
            vk_x, vk.gamma2,
            proof.C, vk.delta2
        )) return 1;
        return 0;
    }
    /// @return r  bool true if proof is valid
    function verifyProof(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[19] memory input
        ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}