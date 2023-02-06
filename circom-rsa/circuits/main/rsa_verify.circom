pragma circom 2.0.3;

include "../rsa.circom";

component main { public [ base_message ] } = RSAVerify65537(121, 34);
