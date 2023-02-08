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
            [18544638906086121171118871116170961953426091439139609996870406638788229373020,
             715538371034411339277751729069237502699927104627537455820434210512367705985],
            [11753930873452988346066542037707049561658726555697243166697344873279789905192,
             3598368322950998483574205653201669644154744860811902410494662818071384600586]
        );
        vk.IC = new Pairing.G1Point[](49);
        
        vk.IC[0] = Pairing.G1Point( 
            17661716809183448168162515771259483075838955098961129383298314079863477601449,
            6263567341573275105551691440848160547233988837894524518916300905326703045253
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            12923605208793568435279609365875635649437232070848598851458990119370952221711,
            6927861033958029938465343899090468361616655281120220190844320375034157046024
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            18243467576984156023783851096587277395775498081329644191658188296853598696467,
            6402735366078391942405661445595155145552496003109599549058685700274726432897
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            17267713561552951629850766175865076144913309086365978315888973075267297634252,
            2721323322723911751350049959252166416554485801622717748105400573423436193501
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            19783811358438225483365415480796706723177840640418567852645331634005798050217,
            3184081331973337450986434556833045851404203675340065299894788467819354844117
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            8735161386665676579750251202039837471103077768028457111565979983708353598070,
            18765810552230646754445062293073383863137252813371466605999495535019067714250
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            18047140819214174317405627137495606187172386512858882473660203457095022148337,
            4184124196232739412763332349095942825270401819240771528557770162439427957218
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            4274961249341010464143487300308662294810349471229241247536317808822202879414,
            9993056592896107956825641096580580650935501287588791353999488306016741174119
        );                                      
        
        vk.IC[8] = Pairing.G1Point( 
            14075533997654502399924020582480479789099308251706388272191272487486251833707,
            598845394194538601427252704227406977109659367494195203265455581329348018039
        );                                      
        
        vk.IC[9] = Pairing.G1Point( 
            11155231481343039172682802929121658943658369728674127426722113448290594517336,
            4908808339638792041481572136677538162305225203181708295793512396471479389256
        );                                      
        
        vk.IC[10] = Pairing.G1Point( 
            3460659266778328393956775318205712811132054480135011940880604826324743180279,
            12211615192632753292600965123620577805359495300906192591932175444707837861320
        );                                      
        
        vk.IC[11] = Pairing.G1Point( 
            5405636998835333832463410408070290888834875295242534514787687125552574802420,
            4631690464080578478165168004368417299178825046611592449857028198234984083410
        );                                      
        
        vk.IC[12] = Pairing.G1Point( 
            5217912257749984549983375686093715873268564455530600979526135502739849595529,
            21817759644405860446141287605364371209185428804778040895786055788494735240629
        );                                      
        
        vk.IC[13] = Pairing.G1Point( 
            15842597373294900461784683580932528096451587762710660533965806430872006868696,
            14898949089792823479474087543440623081364239720758402134432823415949672308821
        );                                      
        
        vk.IC[14] = Pairing.G1Point( 
            9754544615907021206072303235654470915683063067461574334839532159955741553620,
            9728952296509738882572316309500385535493470134352459913791067004885932587520
        );                                      
        
        vk.IC[15] = Pairing.G1Point( 
            9692787274511781375948322342043314274797982520261668322970232111551669689420,
            14818271965470626241739478284571740869289595816375132283566278858101924831614
        );                                      
        
        vk.IC[16] = Pairing.G1Point( 
            18741639197112483546339977997200669906476621822420789827742753579914290062266,
            17310666425281316088405468696991914493522501451570622010651524925714258079978
        );                                      
        
        vk.IC[17] = Pairing.G1Point( 
            14646178765267242119749708836548859208020583071875110013991341411235336846014,
            9730934916565119084858342461310160530143722328492825115459659446468343712134
        );                                      
        
        vk.IC[18] = Pairing.G1Point( 
            9283330700151366022907819724008876615123738457014320669745276158170009517585,
            19928231646319834587235336386217842895091674559850560837476972288638723453136
        );                                      
        
        vk.IC[19] = Pairing.G1Point( 
            16705872545223628541829217553072540793396896168355743389889831060097488754523,
            6794113201706220875436359721400753492051176855618878038522862629472424490353
        );                                      
        
        vk.IC[20] = Pairing.G1Point( 
            14826583720530789328895566334312027398061740468515206605692142255740197726414,
            699988620169860744060154891564087409746132858501177177398578934670238039024
        );                                      
        
        vk.IC[21] = Pairing.G1Point( 
            3089235559877144810687802469509646894371975362263874283043143020571996013476,
            10576182942302877829511196233914310539374120359969002441476049018272371689678
        );                                      
        
        vk.IC[22] = Pairing.G1Point( 
            3185701072190726581788658326794846845557923355374406079631176160729567836422,
            3865733439184536447954806404104475959186719355173642790816247686932437588472
        );                                      
        
        vk.IC[23] = Pairing.G1Point( 
            21765854252484905530985896546114138704213318326548234778919829021156312214847,
            18828414283352702485046973341292712787706736606636602669024428262232219118800
        );                                      
        
        vk.IC[24] = Pairing.G1Point( 
            18153505205152818903220167606791804124882340867004061310802106938190253225680,
            6172557031149758428512347853169856465780631956476693251767410204714885968235
        );                                      
        
        vk.IC[25] = Pairing.G1Point( 
            7608750810400956189215774974568168747570118307795427096466651882033862611618,
            7203280687723191663594050821669883787795450168089811058441527432775059629189
        );                                      
        
        vk.IC[26] = Pairing.G1Point( 
            9588569202829084802314756991166859069301005309082542781013817322357459855895,
            11237394002211475621194680785537799962938816825438224455243374066520105621308
        );                                      
        
        vk.IC[27] = Pairing.G1Point( 
            20843569561650068442835005635772499707047807008204080093253389202956906873980,
            16830369410194576230777833448633984521214203897884303135957782057447704938155
        );                                      
        
        vk.IC[28] = Pairing.G1Point( 
            4325174142862580470025618915752003087711899121800770329829347451688818715094,
            19510353462304483708467363644937484605690112667180368905884500950835665407742
        );                                      
        
        vk.IC[29] = Pairing.G1Point( 
            16405818597126582077635414661921805966170305060454025463765521950423652212492,
            16588738406540731099450561339266919718189595292169661957482535607613615708583
        );                                      
        
        vk.IC[30] = Pairing.G1Point( 
            1531740332666391670072515231851101518103096738957759254503690685659022821659,
            13797695988940197063109066952363042252783954722715388021041622392588181910542
        );                                      
        
        vk.IC[31] = Pairing.G1Point( 
            14460500231212950705499950441380509954255964958344187979322336079995722366679,
            16543607271156762492232180006410098981921379131818743439059599132345696290235
        );                                      
        
        vk.IC[32] = Pairing.G1Point( 
            10882075063608978429909840818219892552829134180172511393345025619807477066148,
            15524914387134790038339312353508722419809870270717740844150745783287895396312
        );                                      
        
        vk.IC[33] = Pairing.G1Point( 
            1559309380535942059633753328221100710481214933005098801960848655688759689075,
            19380843381577213174480626549378561448251165711720168609140578755433284064016
        );                                      
        
        vk.IC[34] = Pairing.G1Point( 
            20330659852601014145594970866569058215343606909544821583369388235148706909643,
            18941923757328027022307348684629738598814465390808541621611653282749972497338
        );                                      
        
        vk.IC[35] = Pairing.G1Point( 
            4095134041562556951410725814104609983661101615743876483010843968927098882437,
            21379956568280239777837997070493890144053076744146485643836611495718043913772
        );                                      
        
        vk.IC[36] = Pairing.G1Point( 
            4842075174191285641421508820297566574422672104123154666688624657700548271219,
            16176681614628433486772152733967091107327316035625366436258950821339539051078
        );                                      
        
        vk.IC[37] = Pairing.G1Point( 
            10776303630687456937240280907034368393515004045242064503173548453887474714206,
            15074883367551806434635099349840938033292294132489328819132899995555516401589
        );                                      
        
        vk.IC[38] = Pairing.G1Point( 
            3737317154035159789013702527572120467635626358115498915780671584744566995778,
            10696868333805819492862965447334787917543074522257373406681261764984640383721
        );                                      
        
        vk.IC[39] = Pairing.G1Point( 
            21445222161396663423559363871961110283264484810089273650382221448125395005070,
            1708668417071000632156805938492324519590268772010759386024872782169022866925
        );                                      
        
        vk.IC[40] = Pairing.G1Point( 
            14984222448046060012829309914889075678495931890476120693695880014225584347521,
            12945822944315502693536952010377626415218466087021228949724169637782073519960
        );                                      
        
        vk.IC[41] = Pairing.G1Point( 
            11759066234953098556544449736818129691817030537483140011469068564948183598967,
            16076258691067489278387243208053783226836088273702746847280815317879080689297
        );                                      
        
        vk.IC[42] = Pairing.G1Point( 
            3206031036584064466401940159991323294378314296112030662149081806377563501956,
            15891155202198164210232710914602158515395802365245571502695417369819763667362
        );                                      
        
        vk.IC[43] = Pairing.G1Point( 
            18718761267981654766073203107262875657484011032474671411186958306242048458622,
            654379973859746579557342968897394203761702433934459933565240803508342250057
        );                                      
        
        vk.IC[44] = Pairing.G1Point( 
            622777811948013201304795112033135510406876190161256680301001091554576725101,
            11228765943011929698806495489134709138327819973403835542389375892940739472340
        );                                      
        
        vk.IC[45] = Pairing.G1Point( 
            15354824191206377953005849683183879942958555926070956452747320926182315722077,
            11084048902301823920797176656700468519955697847290675924909589663127266073929
        );                                      
        
        vk.IC[46] = Pairing.G1Point( 
            7778917103691977254828712646010321627610496037078165931531719025230688748938,
            11285702884568757080611323789691114599757739440345832071591749962905704919573
        );                                      
        
        vk.IC[47] = Pairing.G1Point( 
            13394390294568893003299857008491586169410270547671960523040476817024993458777,
            13031930941274595163551395091867696638366344012189291694281601026033042140679
        );                                      
        
        vk.IC[48] = Pairing.G1Point( 
            5896647505969740701910824899696684554929975931642492756407825285222450161735,
            5608930985984183602043212393343220602412810559703867668543301762999706033082
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
