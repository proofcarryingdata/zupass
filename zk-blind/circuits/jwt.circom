pragma circom 2.0.3;

// include "../node_modules/circomlib/circuits/bitify.circom";
include "./sha.circom";
include "./rsa.circom";
include "./base64.circom";
include "./jwt_email_regex.circom";
include "./jwt_type_regex.circom";

// k - bignum
template JWTVerify(max_msg_bytes, max_json_bytes, n, k) {
    // signal input in_padded[max_header_bytes]; // prehashed email data, includes up to 512 + 64? bytes of padding pre SHA256, and padded with lots of 0s at end after the length
    signal input message[max_msg_bytes]; // TODO: header + . + payload. idk if it's k, we should pad this in javascript beforehand
    signal input modulus[k]; // rsa pubkey, verified with smart contract + optional oracle
    signal input signature[k];

    signal input message_padded_bytes; // length of the message including the padding

    signal input address;
    signal input address_plus_one;

    signal input period_idx; // index of the period in the base64 encoded msg
    var max_domain_len = 30;

    signal input domain_idx; // index of email domain in message
    signal input domain[max_domain_len]; // input domain with padding
    signal reveal_email[max_domain_len][max_json_bytes]; // reveals found email domain

    // *********** hash the padded message ***********
    component sha = Sha256Bytes(max_msg_bytes);
    for (var i = 0; i < max_msg_bytes; i++) {
        sha.in_padded[i] <== message[i];
    }
    sha.in_len_padded_bytes <== message_padded_bytes;

    var msg_len = (256+n)\n;
    component base_msg[msg_len];
    for (var i = 0; i < msg_len; i++) {
        base_msg[i] = Bits2Num(n);
    }
    for (var i = 0; i < 256; i++) {
        base_msg[i\n].in[i%n] <== sha.out[255 - i];
    }
    for (var i = 256; i < n*msg_len; i++) {
        base_msg[i\n].in[i%n] <== 0;
    }

    // *********** verify signature for the message *********** 
    component rsa = RSAVerify65537(n, k);
    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== base_msg[i].out;
    }
    for (var i = msg_len; i < k; i++) {
        rsa.base_message[i] <== 0;
    }
    for (var i = 0; i < k; i++) {
        rsa.modulus[i] <== modulus[i];
    }
    for (var i = 0; i < k; i++) {
        rsa.signature[i] <== signature[i];
    }

    // decode to JSON format
    component message_b64 = Base64Decode(max_json_bytes);
    component eqs[max_msg_bytes];
    signal int[max_msg_bytes];

    for (var i = 0; i < max_msg_bytes - 1; i++) {
        eqs[i] = GreaterEqThan(15);
        eqs[i].in[0] <== i;
        eqs[i].in[1] <== period_idx; 

        var i_plus_one = eqs[i].out;
        var i_normal = 1 - eqs[i].out;

        int[i] <== (message[i] * i_normal);
        message_b64.in[i] <== (message[i + 1] * (i_plus_one)) + int[i];
    }
    message_b64.in[max_msg_bytes - 1] <== 0;

    /************************** JWT REGEXES *****************************/

    /* ensures signature is type jwt */
    component type_jwt_regex = MessageType(max_json_bytes);
    for (var i = 0; i < max_json_bytes; i++) {
        type_jwt_regex.msg[i] <== message_b64.out[i];
    }
    type_jwt_regex.out === 1; 

    // /* ensures an email in json found */
    component email_regex = EmailDomain(max_json_bytes);
    for (var i = 0; i < max_json_bytes; i++) {
        email_regex.msg[i] <== message_b64.out[i];
    }
    email_regex.out === 1;

    // isolate where email domain index is
    component email_eq[max_json_bytes];
    for (var i = 0; i < max_json_bytes; i++) {
        email_eq[i] = IsEqual();
        email_eq[i].in[0] <== i;
        email_eq[i].in[1] <== domain_idx;
    }
    
    // shifts email domain to start of string
    for (var j = 0; j < max_domain_len; j++) {
        reveal_email[j][j] <== email_eq[j].out * email_regex.reveal[j];
        for (var i = j + 1; i < max_json_bytes; i++) {
            reveal_email[j][i] <== reveal_email[j][i - 1] + email_eq[i-j].out * email_regex.reveal[i];
        }
    }

    // constrain the found email domain and passed email domain
    for (var i = 0; i < max_domain_len; i++) {
        domain[i] === reveal_email[i][max_json_bytes - 1];
    }
}

// In circom, all output signals of the main component are public (and cannot be made private), the input signals of the main component are private if not stated otherwise using the keyword public as above. The rest of signals are all private and cannot be made public.
// This makes modulus and reveal_email_packed public. hash(signature) can optionally be made public, but is not recommended since it allows the mailserver to trace who the offender is.

component main { public [ modulus, address, domain ] } = JWTVerify(960, 718, 121, 17);
