pragma circom 2.0.0;

include "./verifier.circom";

component main /* {public [msg, A, R8, S, PointA, PointR]} */ = Ed25519Verifier(16);