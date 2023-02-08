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
            [10810770841576515053953767162438870461362239250731074627498762179708269841285,
             10340880241403762570731255339643555223772419744416534675698107532472955518651],
            [13046068176828995283006738615526840366079364487115724226292406556773121545371,
             2599885161466684180112342647667776278021831857303199206169148165689121262454]
        );
        vk.IC = new Pairing.G1Point[](49);
        
        vk.IC[0] = Pairing.G1Point( 
            19971060480162749183142895434145258505879782172808239578851681681826046484461,
            18131408702781451211935062888974728659889336531002905202809065184359407021941
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            19843211326099583431086633750873617672250246486606869731753292945795044669303,
            220314190786397587668077414999047234648767241062021224003155312283001917667
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            20300370378814633280915921321625154572545975394692659600393590258442633139968,
            6061026957879402977633581746036346069929512120048153554016255027951032357462
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            11797497393183617165331188193697205287181420525339189106454826809410902175640,
            14035463348012183850075742588975705411445293415696992888785928734406126200753
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            7768987483112967525520508041833747459111800170790838040493828471522076098116,
            15132735323981593459000049557174895474307404783307954163370241324198737702597
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            11473299217131403418246668775199491954704251125447688494218594934145659834267,
            14491486921716147043763423897981276584353580041769700138921239461172430940457
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            12884531168420314515357270487847045577649835006899643421003566508980477486024,
            11419140340301327711032747291916568793687252231157479119471005996480142468846
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            6897500604829811270403965494484958072529798790159336081043584689408572915798,
            3929138997485753244153702270217145018016341824852045480532347704941050124140
        );                                      
        
        vk.IC[8] = Pairing.G1Point( 
            11784110499148003292380932468341007534917506236450433554080495109350251593391,
            20533151709235747678204783146030388566270360755060023430408161664478240756501
        );                                      
        
        vk.IC[9] = Pairing.G1Point( 
            12549172867180206604050618395001704455857674961259148715973791705450198887521,
            1960997445123198023976466625756676542703112403302093751876383400372905712581
        );                                      
        
        vk.IC[10] = Pairing.G1Point( 
            17313289563470940380501818894217228489114602383567928086706603419054450254931,
            5486456589771352380965639230438932169689266714220977707049663881246451447430
        );                                      
        
        vk.IC[11] = Pairing.G1Point( 
            4704210474599375181037546249436972794677165102595779116446577716315168311481,
            5183043141033818652449931019708976186539880133998768910589402585308680162087
        );                                      
        
        vk.IC[12] = Pairing.G1Point( 
            2210968976620503094393503739757111740938180907495944843229612801665767543218,
            12370119165148459878283781732552068648871918641277882137081773939346814684618
        );                                      
        
        vk.IC[13] = Pairing.G1Point( 
            17887616428984516176191218682861610147931923353746172221072083967819873200569,
            9315722720059969935376502792439445793274596959257276922634229971346481675907
        );                                      
        
        vk.IC[14] = Pairing.G1Point( 
            4458789656041041161852468566217365171149180330909097028369087670472539079125,
            19064308069578952762781646341749490100397247316382940133564897479550397407696
        );                                      
        
        vk.IC[15] = Pairing.G1Point( 
            206364618884266589221791121371199463430479375077486220224847214396160064618,
            8417765511652154010579612570602786181135023240534901557933342627233007065840
        );                                      
        
        vk.IC[16] = Pairing.G1Point( 
            6923928663273393268889232744511908564301140789095390997407584464973485730220,
            3934544820784779700285165971040426297593262037602647198565757626974784308486
        );                                      
        
        vk.IC[17] = Pairing.G1Point( 
            20374803430864621313576640870688290151845966725880317252922171260542806865332,
            9271305821363455988451565748900194298756118884326304769029822163116292814786
        );                                      
        
        vk.IC[18] = Pairing.G1Point( 
            4680565188968220838847774338250673181131660090125407716052943197916950774281,
            8827222371243098359816545305918457178766215150633313942249714302568092947606
        );                                      
        
        vk.IC[19] = Pairing.G1Point( 
            738583000528156405442430017458386422995843199909775150070111447777535375882,
            6051800320595176420140205235908263304403806528723107052277699655243607339027
        );                                      
        
        vk.IC[20] = Pairing.G1Point( 
            9364461291233421364558789855317554246187595991270221814824116340155006891165,
            1899079885996217409679315480453059948280026462501779482496453343454835321066
        );                                      
        
        vk.IC[21] = Pairing.G1Point( 
            1536574254496242361383770244143884460039525770123540937607938636758856232561,
            17039360180174479126393768620558243418734879412223632627917664640533794876825
        );                                      
        
        vk.IC[22] = Pairing.G1Point( 
            20368379967916833337598932564206063900989163449102256127883249543934660139607,
            6131096508380696159817138123175170093632549633868105037361105365625951614174
        );                                      
        
        vk.IC[23] = Pairing.G1Point( 
            16530062562612328930538328097193745961859225013443778416892853653322077962701,
            2112119589783008743517424801705516824799536909554704673806942396284619774560
        );                                      
        
        vk.IC[24] = Pairing.G1Point( 
            13466622876241256912161484779520163424292998400781048080482470038725810028198,
            3010327395033497105944089096389308290441617446543839127111472175010935160142
        );                                      
        
        vk.IC[25] = Pairing.G1Point( 
            19523530906637130765952733055612263181965531863586837025895994847764318887289,
            2246874850940607385641573871222870594379389486777654757179929735191216412428
        );                                      
        
        vk.IC[26] = Pairing.G1Point( 
            20244780795263213159970346440760332137249943289540568681801574747776010287642,
            13571036875758303353980477212395473394049828920299456243342691321601053099179
        );                                      
        
        vk.IC[27] = Pairing.G1Point( 
            6241525140782499902977764476184004179633065404244040157807083014057698454112,
            21546368946080362253819850495835341065140208312171070639212520488177196849794
        );                                      
        
        vk.IC[28] = Pairing.G1Point( 
            1595973634451056821574796701130660418635723900744540560180270061981885089789,
            14716242990138707153008085500691846749270269229677316492163154017929796072036
        );                                      
        
        vk.IC[29] = Pairing.G1Point( 
            10338715911088668385420541805208081779320791474158260625361426128193523498200,
            17498190159314146692247588357911497202935316380305438670961327481856415951641
        );                                      
        
        vk.IC[30] = Pairing.G1Point( 
            9250932372468356654263166806011048225714123140421972695725232956023859719389,
            18989795569833096921347686993812023110576105829656478386633158202198281108264
        );                                      
        
        vk.IC[31] = Pairing.G1Point( 
            20025841252609847658390490205373630611009539567143620378469572170958722688770,
            17294246487225138492911644370252732117499786462007720086811186448771189663830
        );                                      
        
        vk.IC[32] = Pairing.G1Point( 
            8144901923418697445728259392288035623424468400642136268921425817103072451659,
            10968691849147985057081678161561788861723176166781084673244257081920502051147
        );                                      
        
        vk.IC[33] = Pairing.G1Point( 
            11764099174104479334080437928175962800471026672800289419793700695983052996202,
            6920112192371894999201603459415936471100352274111720425883232392773418560300
        );                                      
        
        vk.IC[34] = Pairing.G1Point( 
            4050382287450510688775860913322987364537338678693843703792333304201658690144,
            6931630944813145085360334368449399586631014116582537818760150227419561370837
        );                                      
        
        vk.IC[35] = Pairing.G1Point( 
            21016692038920894327529200383099556247087303419286729264272753882232214240473,
            21751075969902591973147417893654411597704797674419128181599509160561412785651
        );                                      
        
        vk.IC[36] = Pairing.G1Point( 
            76423816980637363367431112750668843296426696503031070625637710194600011105,
            8815106009846275068182224019083850824988705530206234910808578530002814154980
        );                                      
        
        vk.IC[37] = Pairing.G1Point( 
            18381200374180875665747963299500708871636846879701081130541535486873223105023,
            16501361709329648086195658819869485457472571484249543826480247103884625169752
        );                                      
        
        vk.IC[38] = Pairing.G1Point( 
            12368195191604149684017161843073948645019068621412092888026484510814094792287,
            13566671602833482912884749362334785683091478301911066008560920511953623535802
        );                                      
        
        vk.IC[39] = Pairing.G1Point( 
            14019972123522107832018606886145140086680156654672811071428771778445470817542,
            9969923278094040121164244396703162058228536467777758940312271420230329203206
        );                                      
        
        vk.IC[40] = Pairing.G1Point( 
            8445005681899955744088954418109292767628797961389755373969055789601404111880,
            15130193464476762658654262484515898544999218618570181976319430208177616795202
        );                                      
        
        vk.IC[41] = Pairing.G1Point( 
            14815577198253942125276950386242360668049948468781904393651023066071916753730,
            11433017885515137704979281489798285292163536296118693202025002770469985994012
        );                                      
        
        vk.IC[42] = Pairing.G1Point( 
            10231940026593411876726460272405561008984204143568558332051054757773571669672,
            18224579157550370280925228920843445673293474382669305067792769264319799796855
        );                                      
        
        vk.IC[43] = Pairing.G1Point( 
            14127099452939608992761390453324265431347682622402307048435806027631746685479,
            20165799516328903936130641276056101153578716331199538095009303403041655083534
        );                                      
        
        vk.IC[44] = Pairing.G1Point( 
            2307374705245970026706266446664223262492678814716778943919732945055462619164,
            6840824064811405821238293467028149190836360666424606225912779565755794053006
        );                                      
        
        vk.IC[45] = Pairing.G1Point( 
            8150142854355017493582848347172468870023789882558386526789512886712567231420,
            21006986831047250108751467534966509995142679993735871483862229990204989232113
        );                                      
        
        vk.IC[46] = Pairing.G1Point( 
            1333291408489406714349650826061002894069725519065952562632451819662029895089,
            5869628617253195503269367913841908413383708328913525144779045324387348850927
        );                                      
        
        vk.IC[47] = Pairing.G1Point( 
            4422598295448550677122892760393305508417499341913987525220060103936991948496,
            12003172859870603754559282995004358894043777793440835629619215174917808315981
        );                                      
        
        vk.IC[48] = Pairing.G1Point( 
            10396849131044974575601413191487886792725879001803809783998110196571941216315,
            9796615991845718677533577963311675606953982307913994081838431427711370606624
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
            uint[48] memory input
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
