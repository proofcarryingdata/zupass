pragma circom 2.0.3;

include "./rsa.circom";

template Main() {
  signal input x;

  signal output out;

  component rsa = RSAVerify65537(121, 17);

  out <-- 3;
}

component main = Main();
