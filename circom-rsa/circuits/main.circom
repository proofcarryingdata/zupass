include "./rsa_verify.circom";

component main { public [ modulus ] } = RSAVerify(960, 718, 121, 17);
