export const MAX_HEADER_PADDED_BYTES = 960; // NOTE: this must be the same as the first arg in the email in main args circom

// circom constants from main.circom / https://zkrepl.dev/?gist=30d21c7a7285b1b14f608325f172417b
// template RSAGroupSigVerify(n, k, levels) {
// component main { public [ modulus ] } = RSAVerify(121, 17);
// component main { public [ root, payload1 ] } = RSAGroupSigVerify(121, 17, 30);
export const CIRCOM_BIGINT_N = 121;
export const CIRCOM_BIGINT_K = 17;
export const CIRCOM_LEVELS = 30;
