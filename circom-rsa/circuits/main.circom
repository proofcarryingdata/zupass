include "./rsa_verify.circom";

component main { public [ modulus, signature ] } = RSAVerify(960, 718, 121, 17);
