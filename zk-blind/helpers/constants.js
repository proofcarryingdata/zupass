"use strict";
exports.__esModule = true;
exports.STRING_PRESELECTOR = exports.CIRCOM_LEVELS = exports.CIRCOM_BIGINT_K = exports.CIRCOM_BIGINT_N = exports.MAX_BODY_PADDED_BYTES = exports.MAX_HEADER_PADDED_BYTES = exports.CIRCOM_FIELD_MODULUS = exports.MAGIC_DOUBLE_BLIND_BASE_MESSAGE_LEN = exports.MAGIC_DOUBLE_BLIND_BASE_MESSAGE = void 0;
// the numeric form of the payload1 passed into the primitive
// corresponds to the openssh signature produced by the following command:
// echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa | pbcopy
exports.MAGIC_DOUBLE_BLIND_BASE_MESSAGE = 14447023197094784173331616578829287000074783130802912942914027114823662617007553911501158244718575362051758829289159984830457466395841150324770159971462582912755545324694933673046215187947905307019469n;
// Length in bits
exports.MAGIC_DOUBLE_BLIND_BASE_MESSAGE_LEN = 672;
exports.CIRCOM_FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
exports.MAX_HEADER_PADDED_BYTES = 960; // NOTE: this must be the same as the first arg in the email in main args circom
exports.MAX_BODY_PADDED_BYTES = 1536; // NOTE: this must be the same as the arg to sha the remainder number of bytes in the email in main args circom
// circom constants from main.circom / https://zkrepl.dev/?gist=30d21c7a7285b1b14f608325f172417b
// template RSAGroupSigVerify(n, k, levels) {
// component main { public [ modulus ] } = RSAVerify(121, 17);
// component main { public [ root, payload1 ] } = RSAGroupSigVerify(121, 17, 30);
exports.CIRCOM_BIGINT_N = 121;
exports.CIRCOM_BIGINT_K = 17;
exports.CIRCOM_LEVELS = 30;
// This is the string that comes right before the target string in the email. Ideally as close to the end of the email as possible.
exports.STRING_PRESELECTOR = 'meant for @';
