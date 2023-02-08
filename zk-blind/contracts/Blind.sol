// SPDX-License-Identifier: MIT
pragma solidity ^0.6.11;

import {Verifier} from "./Verifier.sol";

contract Blind {
    mapping(address => string) public companies;
    Verifier public verifier;

    constructor(address _verifier) public {
        verifier = Verifier(_verifier);
    }

    function add(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[48] memory input // Just the Hex representation of our public circuit inputs
        ) public {

        // 0 to 16 modulus 
        // 17 pubkey 
        // 18 to 47 domain 

        // Verify Proof
        require(verifier.verifyProof(a, b, c, input) == true, "Proof failed to verify");

        // Verify right address
        uint256[] memory openaiPubkey = new uint256[](17);
        openaiPubkey[0] = 0x0000000000000000000000000000000000c8430c6464e64ddda07a9b863d8881;
        openaiPubkey[1] = 0x0000000000000000000000000000000001cd0da2c4ae4218b0cade824b613b37;
        openaiPubkey[2] = 0x000000000000000000000000000000000062e5c346b31c47a050182d2eafd848;
        openaiPubkey[3] = 0x00000000000000000000000000000000000618669ce3a3538eaddc8d6ced08b9;
        openaiPubkey[4] = 0x0000000000000000000000000000000000d75cdc8d790c81ab9c23625464a414;
        openaiPubkey[5] = 0x00000000000000000000000000000000011954a4b6d45c95fa48f63ffec9f0ad;
        openaiPubkey[6] = 0x0000000000000000000000000000000001e075c1b0cf7069eac655ee53f6cb80;
        openaiPubkey[7] = 0x000000000000000000000000000000000060409af02b53bf34965950c557a044;
        openaiPubkey[8] = 0x000000000000000000000000000000000016b77d2e3917ea5af4e7363a68cffe;
        openaiPubkey[9] = 0x00000000000000000000000000000000007283ffb204c691aaf1bce0ac279328;
        openaiPubkey[10] = 0x0000000000000000000000000000000001785e45f8b6da078bb330084a557dbd;
        openaiPubkey[11] = 0x00000000000000000000000000000000003520db147c498f546c95853efc64f3;
        openaiPubkey[12] = 0x0000000000000000000000000000000001a652f8aede242fe83a7af1091cc560;
        openaiPubkey[13] = 0x000000000000000000000000000000000177e578067b3fc1873b4838e2597d79;
        openaiPubkey[14] = 0x000000000000000000000000000000000082c7f533459aff65a02e6f635fae51;
        openaiPubkey[15] = 0x0000000000000000000000000000000000a00bcf4e84dc9a972a8eab541dfb33;
        openaiPubkey[16] = 0x000000000000000000000000000000000000dbbace12b0ce3ef3dcde63800d8b;


        for (uint256 i = 0; i < 17; i++) {
            require(uint256(input[i]) == openaiPubkey[i], "Ivalid input key to snark");
        }

        // User's eth pubkey
        address addr = address(uint160(uint256(bytes32(input[17]))));

        bytes memory domain = new bytes(0);

        // Domain
        for (uint256 i = 18; i < 47; i++) {
            //domain.push(byte(input[i]));
            if (input[i] != uint256(0)) {
                domain = abi.encodePacked(domain, byte(uint8(input[i])));
            }
        }

        companies[addr] = string(domain);
    }

    function get(address addr) public view returns (string memory){
        return companies[addr];
    }
}
