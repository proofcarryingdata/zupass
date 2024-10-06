!(function (_) {
  function a(_, a) {
    "use strict";
    var t,
      r = a.ready.then(function () {
        function r() {
          if (0 !== t._sodium_init())
            throw new Error("libsodium was not correctly initialized.");
          for (
            var a = [
                "crypto_aead_chacha20poly1305_ietf_decrypt",
                "crypto_aead_chacha20poly1305_ietf_decrypt_detached",
                "crypto_aead_chacha20poly1305_ietf_encrypt",
                "crypto_aead_chacha20poly1305_ietf_encrypt_detached",
                "crypto_aead_chacha20poly1305_ietf_keygen",
                "crypto_aead_chacha20poly1305_keygen",
                "crypto_aead_xchacha20poly1305_ietf_decrypt",
                "crypto_aead_xchacha20poly1305_ietf_decrypt_detached",
                "crypto_aead_xchacha20poly1305_ietf_encrypt",
                "crypto_aead_xchacha20poly1305_ietf_encrypt_detached",
                "crypto_aead_xchacha20poly1305_ietf_keygen",
                "crypto_pwhash",
                "crypto_pwhash_scryptsalsa208sha256",
                "crypto_pwhash_scryptsalsa208sha256_ll",
                "crypto_pwhash_scryptsalsa208sha256_str",
                "crypto_pwhash_scryptsalsa208sha256_str_verify",
                "crypto_pwhash_str",
                "crypto_pwhash_str_needs_rehash",
                "crypto_pwhash_str_verify",
                "randombytes_buf",
                "randombytes_buf_deterministic",
                "randombytes_close",
                "randombytes_random",
                "randombytes_set_implementation",
                "randombytes_stir",
                "randombytes_uniform",
                "sodium_version_string"
              ],
              r = [
                Y,
                m,
                B,
                b,
                v,
                A,
                M,
                I,
                w,
                x,
                N,
                L,
                O,
                k,
                U,
                C,
                R,
                P,
                K,
                X,
                G,
                D,
                F,
                V,
                W,
                H,
                j
              ],
              e = 0;
            e < r.length;
            e++
          )
            "function" == typeof t["_" + a[e]] && (_[a[e]] = r[e]);
          var o = [
            "SODIUM_LIBRARY_VERSION_MAJOR",
            "SODIUM_LIBRARY_VERSION_MINOR",
            "crypto_aead_aegis128l_ABYTES",
            "crypto_aead_aegis128l_KEYBYTES",
            "crypto_aead_aegis128l_MESSAGEBYTES_MAX",
            "crypto_aead_aegis128l_NPUBBYTES",
            "crypto_aead_aegis128l_NSECBYTES",
            "crypto_aead_aegis256_ABYTES",
            "crypto_aead_aegis256_KEYBYTES",
            "crypto_aead_aegis256_MESSAGEBYTES_MAX",
            "crypto_aead_aegis256_NPUBBYTES",
            "crypto_aead_aegis256_NSECBYTES",
            "crypto_aead_aes256gcm_ABYTES",
            "crypto_aead_aes256gcm_KEYBYTES",
            "crypto_aead_aes256gcm_MESSAGEBYTES_MAX",
            "crypto_aead_aes256gcm_NPUBBYTES",
            "crypto_aead_aes256gcm_NSECBYTES",
            "crypto_aead_chacha20poly1305_ABYTES",
            "crypto_aead_chacha20poly1305_IETF_ABYTES",
            "crypto_aead_chacha20poly1305_IETF_KEYBYTES",
            "crypto_aead_chacha20poly1305_IETF_MESSAGEBYTES_MAX",
            "crypto_aead_chacha20poly1305_IETF_NPUBBYTES",
            "crypto_aead_chacha20poly1305_IETF_NSECBYTES",
            "crypto_aead_chacha20poly1305_KEYBYTES",
            "crypto_aead_chacha20poly1305_MESSAGEBYTES_MAX",
            "crypto_aead_chacha20poly1305_NPUBBYTES",
            "crypto_aead_chacha20poly1305_NSECBYTES",
            "crypto_aead_chacha20poly1305_ietf_ABYTES",
            "crypto_aead_chacha20poly1305_ietf_KEYBYTES",
            "crypto_aead_chacha20poly1305_ietf_MESSAGEBYTES_MAX",
            "crypto_aead_chacha20poly1305_ietf_NPUBBYTES",
            "crypto_aead_chacha20poly1305_ietf_NSECBYTES",
            "crypto_aead_xchacha20poly1305_IETF_ABYTES",
            "crypto_aead_xchacha20poly1305_IETF_KEYBYTES",
            "crypto_aead_xchacha20poly1305_IETF_MESSAGEBYTES_MAX",
            "crypto_aead_xchacha20poly1305_IETF_NPUBBYTES",
            "crypto_aead_xchacha20poly1305_IETF_NSECBYTES",
            "crypto_aead_xchacha20poly1305_ietf_ABYTES",
            "crypto_aead_xchacha20poly1305_ietf_KEYBYTES",
            "crypto_aead_xchacha20poly1305_ietf_MESSAGEBYTES_MAX",
            "crypto_aead_xchacha20poly1305_ietf_NPUBBYTES",
            "crypto_aead_xchacha20poly1305_ietf_NSECBYTES",
            "crypto_auth_BYTES",
            "crypto_auth_KEYBYTES",
            "crypto_auth_hmacsha256_BYTES",
            "crypto_auth_hmacsha256_KEYBYTES",
            "crypto_auth_hmacsha512256_BYTES",
            "crypto_auth_hmacsha512256_KEYBYTES",
            "crypto_auth_hmacsha512_BYTES",
            "crypto_auth_hmacsha512_KEYBYTES",
            "crypto_box_BEFORENMBYTES",
            "crypto_box_MACBYTES",
            "crypto_box_MESSAGEBYTES_MAX",
            "crypto_box_NONCEBYTES",
            "crypto_box_PUBLICKEYBYTES",
            "crypto_box_SEALBYTES",
            "crypto_box_SECRETKEYBYTES",
            "crypto_box_SEEDBYTES",
            "crypto_box_curve25519xchacha20poly1305_BEFORENMBYTES",
            "crypto_box_curve25519xchacha20poly1305_MACBYTES",
            "crypto_box_curve25519xchacha20poly1305_MESSAGEBYTES_MAX",
            "crypto_box_curve25519xchacha20poly1305_NONCEBYTES",
            "crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES",
            "crypto_box_curve25519xchacha20poly1305_SEALBYTES",
            "crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES",
            "crypto_box_curve25519xchacha20poly1305_SEEDBYTES",
            "crypto_box_curve25519xsalsa20poly1305_BEFORENMBYTES",
            "crypto_box_curve25519xsalsa20poly1305_MACBYTES",
            "crypto_box_curve25519xsalsa20poly1305_MESSAGEBYTES_MAX",
            "crypto_box_curve25519xsalsa20poly1305_NONCEBYTES",
            "crypto_box_curve25519xsalsa20poly1305_PUBLICKEYBYTES",
            "crypto_box_curve25519xsalsa20poly1305_SECRETKEYBYTES",
            "crypto_box_curve25519xsalsa20poly1305_SEEDBYTES",
            "crypto_core_ed25519_BYTES",
            "crypto_core_ed25519_HASHBYTES",
            "crypto_core_ed25519_NONREDUCEDSCALARBYTES",
            "crypto_core_ed25519_SCALARBYTES",
            "crypto_core_ed25519_UNIFORMBYTES",
            "crypto_core_hchacha20_CONSTBYTES",
            "crypto_core_hchacha20_INPUTBYTES",
            "crypto_core_hchacha20_KEYBYTES",
            "crypto_core_hchacha20_OUTPUTBYTES",
            "crypto_core_hsalsa20_CONSTBYTES",
            "crypto_core_hsalsa20_INPUTBYTES",
            "crypto_core_hsalsa20_KEYBYTES",
            "crypto_core_hsalsa20_OUTPUTBYTES",
            "crypto_core_ristretto255_BYTES",
            "crypto_core_ristretto255_HASHBYTES",
            "crypto_core_ristretto255_NONREDUCEDSCALARBYTES",
            "crypto_core_ristretto255_SCALARBYTES",
            "crypto_core_salsa2012_CONSTBYTES",
            "crypto_core_salsa2012_INPUTBYTES",
            "crypto_core_salsa2012_KEYBYTES",
            "crypto_core_salsa2012_OUTPUTBYTES",
            "crypto_core_salsa208_CONSTBYTES",
            "crypto_core_salsa208_INPUTBYTES",
            "crypto_core_salsa208_KEYBYTES",
            "crypto_core_salsa208_OUTPUTBYTES",
            "crypto_core_salsa20_CONSTBYTES",
            "crypto_core_salsa20_INPUTBYTES",
            "crypto_core_salsa20_KEYBYTES",
            "crypto_core_salsa20_OUTPUTBYTES",
            "crypto_generichash_BYTES",
            "crypto_generichash_BYTES_MAX",
            "crypto_generichash_BYTES_MIN",
            "crypto_generichash_KEYBYTES",
            "crypto_generichash_KEYBYTES_MAX",
            "crypto_generichash_KEYBYTES_MIN",
            "crypto_generichash_blake2b_BYTES",
            "crypto_generichash_blake2b_BYTES_MAX",
            "crypto_generichash_blake2b_BYTES_MIN",
            "crypto_generichash_blake2b_KEYBYTES",
            "crypto_generichash_blake2b_KEYBYTES_MAX",
            "crypto_generichash_blake2b_KEYBYTES_MIN",
            "crypto_generichash_blake2b_PERSONALBYTES",
            "crypto_generichash_blake2b_SALTBYTES",
            "crypto_hash_BYTES",
            "crypto_hash_sha256_BYTES",
            "crypto_hash_sha512_BYTES",
            "crypto_kdf_BYTES_MAX",
            "crypto_kdf_BYTES_MIN",
            "crypto_kdf_CONTEXTBYTES",
            "crypto_kdf_KEYBYTES",
            "crypto_kdf_blake2b_BYTES_MAX",
            "crypto_kdf_blake2b_BYTES_MIN",
            "crypto_kdf_blake2b_CONTEXTBYTES",
            "crypto_kdf_blake2b_KEYBYTES",
            "crypto_kdf_hkdf_sha256_BYTES_MAX",
            "crypto_kdf_hkdf_sha256_BYTES_MIN",
            "crypto_kdf_hkdf_sha256_KEYBYTES",
            "crypto_kdf_hkdf_sha512_BYTES_MAX",
            "crypto_kdf_hkdf_sha512_BYTES_MIN",
            "crypto_kdf_hkdf_sha512_KEYBYTES",
            "crypto_kx_PUBLICKEYBYTES",
            "crypto_kx_SECRETKEYBYTES",
            "crypto_kx_SEEDBYTES",
            "crypto_kx_SESSIONKEYBYTES",
            "crypto_onetimeauth_BYTES",
            "crypto_onetimeauth_KEYBYTES",
            "crypto_onetimeauth_poly1305_BYTES",
            "crypto_onetimeauth_poly1305_KEYBYTES",
            "crypto_pwhash_ALG_ARGON2I13",
            "crypto_pwhash_ALG_ARGON2ID13",
            "crypto_pwhash_ALG_DEFAULT",
            "crypto_pwhash_BYTES_MAX",
            "crypto_pwhash_BYTES_MIN",
            "crypto_pwhash_MEMLIMIT_INTERACTIVE",
            "crypto_pwhash_MEMLIMIT_MAX",
            "crypto_pwhash_MEMLIMIT_MIN",
            "crypto_pwhash_MEMLIMIT_MODERATE",
            "crypto_pwhash_MEMLIMIT_SENSITIVE",
            "crypto_pwhash_OPSLIMIT_INTERACTIVE",
            "crypto_pwhash_OPSLIMIT_MAX",
            "crypto_pwhash_OPSLIMIT_MIN",
            "crypto_pwhash_OPSLIMIT_MODERATE",
            "crypto_pwhash_OPSLIMIT_SENSITIVE",
            "crypto_pwhash_PASSWD_MAX",
            "crypto_pwhash_PASSWD_MIN",
            "crypto_pwhash_SALTBYTES",
            "crypto_pwhash_STRBYTES",
            "crypto_pwhash_argon2i_BYTES_MAX",
            "crypto_pwhash_argon2i_BYTES_MIN",
            "crypto_pwhash_argon2i_MEMLIMIT_INTERACTIVE",
            "crypto_pwhash_argon2i_MEMLIMIT_MAX",
            "crypto_pwhash_argon2i_MEMLIMIT_MIN",
            "crypto_pwhash_argon2i_MEMLIMIT_MODERATE",
            "crypto_pwhash_argon2i_MEMLIMIT_SENSITIVE",
            "crypto_pwhash_argon2i_OPSLIMIT_INTERACTIVE",
            "crypto_pwhash_argon2i_OPSLIMIT_MAX",
            "crypto_pwhash_argon2i_OPSLIMIT_MIN",
            "crypto_pwhash_argon2i_OPSLIMIT_MODERATE",
            "crypto_pwhash_argon2i_OPSLIMIT_SENSITIVE",
            "crypto_pwhash_argon2i_PASSWD_MAX",
            "crypto_pwhash_argon2i_PASSWD_MIN",
            "crypto_pwhash_argon2i_SALTBYTES",
            "crypto_pwhash_argon2i_STRBYTES",
            "crypto_pwhash_argon2id_BYTES_MAX",
            "crypto_pwhash_argon2id_BYTES_MIN",
            "crypto_pwhash_argon2id_MEMLIMIT_INTERACTIVE",
            "crypto_pwhash_argon2id_MEMLIMIT_MAX",
            "crypto_pwhash_argon2id_MEMLIMIT_MIN",
            "crypto_pwhash_argon2id_MEMLIMIT_MODERATE",
            "crypto_pwhash_argon2id_MEMLIMIT_SENSITIVE",
            "crypto_pwhash_argon2id_OPSLIMIT_INTERACTIVE",
            "crypto_pwhash_argon2id_OPSLIMIT_MAX",
            "crypto_pwhash_argon2id_OPSLIMIT_MIN",
            "crypto_pwhash_argon2id_OPSLIMIT_MODERATE",
            "crypto_pwhash_argon2id_OPSLIMIT_SENSITIVE",
            "crypto_pwhash_argon2id_PASSWD_MAX",
            "crypto_pwhash_argon2id_PASSWD_MIN",
            "crypto_pwhash_argon2id_SALTBYTES",
            "crypto_pwhash_argon2id_STRBYTES",
            "crypto_pwhash_scryptsalsa208sha256_BYTES_MAX",
            "crypto_pwhash_scryptsalsa208sha256_BYTES_MIN",
            "crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE",
            "crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_MAX",
            "crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_MIN",
            "crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_SENSITIVE",
            "crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE",
            "crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_MAX",
            "crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_MIN",
            "crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE",
            "crypto_pwhash_scryptsalsa208sha256_PASSWD_MAX",
            "crypto_pwhash_scryptsalsa208sha256_PASSWD_MIN",
            "crypto_pwhash_scryptsalsa208sha256_SALTBYTES",
            "crypto_pwhash_scryptsalsa208sha256_STRBYTES",
            "crypto_scalarmult_BYTES",
            "crypto_scalarmult_SCALARBYTES",
            "crypto_scalarmult_curve25519_BYTES",
            "crypto_scalarmult_curve25519_SCALARBYTES",
            "crypto_scalarmult_ed25519_BYTES",
            "crypto_scalarmult_ed25519_SCALARBYTES",
            "crypto_scalarmult_ristretto255_BYTES",
            "crypto_scalarmult_ristretto255_SCALARBYTES",
            "crypto_secretbox_KEYBYTES",
            "crypto_secretbox_MACBYTES",
            "crypto_secretbox_MESSAGEBYTES_MAX",
            "crypto_secretbox_NONCEBYTES",
            "crypto_secretbox_xchacha20poly1305_KEYBYTES",
            "crypto_secretbox_xchacha20poly1305_MACBYTES",
            "crypto_secretbox_xchacha20poly1305_MESSAGEBYTES_MAX",
            "crypto_secretbox_xchacha20poly1305_NONCEBYTES",
            "crypto_secretbox_xsalsa20poly1305_KEYBYTES",
            "crypto_secretbox_xsalsa20poly1305_MACBYTES",
            "crypto_secretbox_xsalsa20poly1305_MESSAGEBYTES_MAX",
            "crypto_secretbox_xsalsa20poly1305_NONCEBYTES",
            "crypto_secretstream_xchacha20poly1305_ABYTES",
            "crypto_secretstream_xchacha20poly1305_HEADERBYTES",
            "crypto_secretstream_xchacha20poly1305_KEYBYTES",
            "crypto_secretstream_xchacha20poly1305_MESSAGEBYTES_MAX",
            "crypto_secretstream_xchacha20poly1305_TAG_FINAL",
            "crypto_secretstream_xchacha20poly1305_TAG_MESSAGE",
            "crypto_secretstream_xchacha20poly1305_TAG_PUSH",
            "crypto_secretstream_xchacha20poly1305_TAG_REKEY",
            "crypto_shorthash_BYTES",
            "crypto_shorthash_KEYBYTES",
            "crypto_shorthash_siphash24_BYTES",
            "crypto_shorthash_siphash24_KEYBYTES",
            "crypto_shorthash_siphashx24_BYTES",
            "crypto_shorthash_siphashx24_KEYBYTES",
            "crypto_sign_BYTES",
            "crypto_sign_MESSAGEBYTES_MAX",
            "crypto_sign_PUBLICKEYBYTES",
            "crypto_sign_SECRETKEYBYTES",
            "crypto_sign_SEEDBYTES",
            "crypto_sign_ed25519_BYTES",
            "crypto_sign_ed25519_MESSAGEBYTES_MAX",
            "crypto_sign_ed25519_PUBLICKEYBYTES",
            "crypto_sign_ed25519_SECRETKEYBYTES",
            "crypto_sign_ed25519_SEEDBYTES",
            "crypto_stream_KEYBYTES",
            "crypto_stream_MESSAGEBYTES_MAX",
            "crypto_stream_NONCEBYTES",
            "crypto_stream_chacha20_IETF_KEYBYTES",
            "crypto_stream_chacha20_IETF_MESSAGEBYTES_MAX",
            "crypto_stream_chacha20_IETF_NONCEBYTES",
            "crypto_stream_chacha20_KEYBYTES",
            "crypto_stream_chacha20_MESSAGEBYTES_MAX",
            "crypto_stream_chacha20_NONCEBYTES",
            "crypto_stream_chacha20_ietf_KEYBYTES",
            "crypto_stream_chacha20_ietf_MESSAGEBYTES_MAX",
            "crypto_stream_chacha20_ietf_NONCEBYTES",
            "crypto_stream_salsa2012_KEYBYTES",
            "crypto_stream_salsa2012_MESSAGEBYTES_MAX",
            "crypto_stream_salsa2012_NONCEBYTES",
            "crypto_stream_salsa208_KEYBYTES",
            "crypto_stream_salsa208_MESSAGEBYTES_MAX",
            "crypto_stream_salsa208_NONCEBYTES",
            "crypto_stream_salsa20_KEYBYTES",
            "crypto_stream_salsa20_MESSAGEBYTES_MAX",
            "crypto_stream_salsa20_NONCEBYTES",
            "crypto_stream_xchacha20_KEYBYTES",
            "crypto_stream_xchacha20_MESSAGEBYTES_MAX",
            "crypto_stream_xchacha20_NONCEBYTES",
            "crypto_stream_xsalsa20_KEYBYTES",
            "crypto_stream_xsalsa20_MESSAGEBYTES_MAX",
            "crypto_stream_xsalsa20_NONCEBYTES",
            "crypto_verify_16_BYTES",
            "crypto_verify_32_BYTES",
            "crypto_verify_64_BYTES"
          ];
          for (e = 0; e < o.length; e++)
            "function" == typeof (n = t["_" + o[e].toLowerCase()]) &&
              (_[o[e]] = n());
          var c = [
            "SODIUM_VERSION_STRING",
            "crypto_pwhash_STRPREFIX",
            "crypto_pwhash_argon2i_STRPREFIX",
            "crypto_pwhash_argon2id_STRPREFIX",
            "crypto_pwhash_scryptsalsa208sha256_STRPREFIX"
          ];
          for (e = 0; e < c.length; e++) {
            var n;
            "function" == typeof (n = t["_" + c[e].toLowerCase()]) &&
              (_[c[e]] = t.UTF8ToString(n()));
          }
        }
        t = a;
        try {
          r();
          var e = new Uint8Array([98, 97, 108, 108, 115]),
            o = _.randombytes_buf(_.crypto_secretbox_NONCEBYTES),
            c = _.randombytes_buf(_.crypto_secretbox_KEYBYTES),
            n = _.crypto_secretbox_easy(e, o, c),
            s = _.crypto_secretbox_open_easy(n, o, c);
          if (_.memcmp(e, s)) return;
        } catch (_) {
          if (null == t.useBackupModule)
            throw new Error("Both wasm and asm failed to load" + _);
        }
        t.useBackupModule(), r();
      });
    function e(_) {
      if ("function" == typeof TextEncoder) return new TextEncoder().encode(_);
      _ = unescape(encodeURIComponent(_));
      for (var a = new Uint8Array(_.length), t = 0, r = _.length; t < r; t++)
        a[t] = _.charCodeAt(t);
      return a;
    }
    function o(_) {
      if ("function" == typeof TextDecoder)
        return new TextDecoder("utf-8", { fatal: !0 }).decode(_);
      var a = 8192,
        t = Math.ceil(_.length / a);
      if (t <= 1)
        try {
          return decodeURIComponent(escape(String.fromCharCode.apply(null, _)));
        } catch (_) {
          throw new TypeError("The encoded data was not valid.");
        }
      for (var r = "", e = 0, c = 0; c < t; c++) {
        var n = Array.prototype.slice.call(_, c * a + e, (c + 1) * a + e);
        if (0 != n.length) {
          var s,
            p = n.length,
            h = 0;
          do {
            var y = n[--p];
            y >= 240
              ? ((h = 4), (s = !0))
              : y >= 224
              ? ((h = 3), (s = !0))
              : y >= 192
              ? ((h = 2), (s = !0))
              : y < 128 && ((h = 1), (s = !0));
          } while (!s);
          for (var i = h - (n.length - p), l = 0; l < i; l++) e--, n.pop();
          r += o(n);
        }
      }
      return r;
    }
    function c(_) {
      _ = f(null, _, "input");
      for (var a, t, r, e = "", o = 0; o < _.length; o++)
        (r =
          ((87 + (t = 15 & _[o]) + (((t - 10) >> 8) & -39)) << 8) |
          (87 + (a = _[o] >>> 4) + (((a - 10) >> 8) & -39))),
          (e += String.fromCharCode(255 & r) + String.fromCharCode(r >>> 8));
      return e;
    }
    var n = {
      ORIGINAL: 1,
      ORIGINAL_NO_PADDING: 3,
      URLSAFE: 5,
      URLSAFE_NO_PADDING: 7
    };
    function s(_) {
      if (null == _) return n.URLSAFE_NO_PADDING;
      if (
        _ !== n.ORIGINAL &&
        _ !== n.ORIGINAL_NO_PADDING &&
        _ !== n.URLSAFE &&
        _ != n.URLSAFE_NO_PADDING
      )
        throw new Error("unsupported base64 variant");
      return _;
    }
    function p(_, a) {
      (a = s(a)), (_ = f(e, _, "input"));
      var r,
        e = [],
        c = 0 | Math.floor(_.length / 3),
        n = _.length - 3 * c,
        p = 4 * c + (0 !== n ? (2 & a ? 2 + (n >>> 1) : 4) : 0),
        h = new l(p + 1),
        y = E(_);
      return (
        e.push(y),
        e.push(h.address),
        0 === t._sodium_bin2base64(h.address, h.length, y, _.length, a) &&
          S(e, "conversion failed"),
        (h.length = p),
        (r = o(h.to_Uint8Array())),
        d(e),
        r
      );
    }
    function h(_, a) {
      var t = a || "uint8array";
      if (!y(t)) throw new Error(t + " output format is not available");
      if (_ instanceof l) {
        if ("uint8array" === t) return _.to_Uint8Array();
        if ("text" === t) return o(_.to_Uint8Array());
        if ("hex" === t) return c(_.to_Uint8Array());
        if ("base64" === t) return p(_.to_Uint8Array(), n.URLSAFE_NO_PADDING);
        throw new Error('What is output format "' + t + '"?');
      }
      if ("object" == typeof _) {
        for (var r = Object.keys(_), e = {}, s = 0; s < r.length; s++)
          e[r[s]] = h(_[r[s]], t);
        return e;
      }
      if ("string" == typeof _) return _;
      throw new TypeError("Cannot format output");
    }
    function y(_) {
      for (
        var a = ["uint8array", "text", "hex", "base64"], t = 0;
        t < a.length;
        t++
      )
        if (a[t] === _) return !0;
      return !1;
    }
    function i(_) {
      if (_) {
        if ("string" != typeof _)
          throw new TypeError(
            "When defined, the output format must be a string"
          );
        if (!y(_)) throw new Error(_ + " is not a supported output format");
      }
    }
    function l(_) {
      (this.length = _), (this.address = u(_));
    }
    function E(_) {
      var a = u(_.length);
      return t.HEAPU8.set(_, a), a;
    }
    function u(_) {
      var a = t._malloc(_);
      if (0 === a) throw { message: "_malloc() failed", length: _ };
      return a;
    }
    function d(_) {
      if (_) for (var a = 0; a < _.length; a++) (r = _[a]), t._free(r);
      var r;
    }
    function S(_, a) {
      throw (d(_), new Error(a));
    }
    function T(_, a) {
      throw (d(_), new TypeError(a));
    }
    function g(_, a, t) {
      null == a && T(_, t + " cannot be null or undefined");
    }
    function f(_, a, t) {
      return (
        g(_, a, t),
        a instanceof Uint8Array
          ? a
          : "string" == typeof a
          ? e(a)
          : void T(_, "unsupported input type for " + t)
      );
    }
    function Y(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = null;
      null != _ &&
        ((s = E((_ = f(n, _, "secret_nonce")))), _.length, n.push(s)),
        (a = f(n, a, "ciphertext"));
      var p,
        y = t._crypto_aead_chacha20poly1305_ietf_abytes(),
        u = a.length;
      u < y && T(n, "ciphertext is too short"), (p = E(a)), n.push(p);
      var g = null,
        Y = 0;
      null != r &&
        ((g = E((r = f(n, r, "additional_data")))), (Y = r.length), n.push(g)),
        (e = f(n, e, "public_nonce"));
      var m,
        B = 0 | t._crypto_aead_chacha20poly1305_ietf_npubbytes();
      e.length !== B && T(n, "invalid public_nonce length"),
        (m = E(e)),
        n.push(m),
        (o = f(n, o, "key"));
      var b,
        v = 0 | t._crypto_aead_chacha20poly1305_ietf_keybytes();
      o.length !== v && T(n, "invalid key length"), (b = E(o)), n.push(b);
      var A = new l((u - t._crypto_aead_chacha20poly1305_ietf_abytes()) | 0),
        M = A.address;
      if (
        (n.push(M),
        0 ===
          t._crypto_aead_chacha20poly1305_ietf_decrypt(
            M,
            null,
            s,
            p,
            u,
            0,
            g,
            Y,
            0,
            m,
            b
          ))
      ) {
        var I = h(A, c);
        return d(n), I;
      }
      S(n, "ciphertext cannot be decrypted using that key");
    }
    function m(_, a, r, e, o, c, n) {
      var s = [];
      i(n);
      var p = null;
      null != _ &&
        ((p = E((_ = f(s, _, "secret_nonce")))), _.length, s.push(p));
      var y = E((a = f(s, a, "ciphertext"))),
        u = a.length;
      s.push(y), (r = f(s, r, "mac"));
      var g,
        Y = 0 | t._crypto_box_macbytes();
      r.length !== Y && T(s, "invalid mac length"), (g = E(r)), s.push(g);
      var m = null,
        B = 0;
      null != e &&
        ((m = E((e = f(s, e, "additional_data")))), (B = e.length), s.push(m)),
        (o = f(s, o, "public_nonce"));
      var b,
        v = 0 | t._crypto_aead_chacha20poly1305_ietf_npubbytes();
      o.length !== v && T(s, "invalid public_nonce length"),
        (b = E(o)),
        s.push(b),
        (c = f(s, c, "key"));
      var A,
        M = 0 | t._crypto_aead_chacha20poly1305_ietf_keybytes();
      c.length !== M && T(s, "invalid key length"), (A = E(c)), s.push(A);
      var I = new l(0 | u),
        w = I.address;
      if (
        (s.push(w),
        0 ===
          t._crypto_aead_chacha20poly1305_ietf_decrypt_detached(
            w,
            p,
            y,
            u,
            0,
            g,
            m,
            B,
            0,
            b,
            A
          ))
      ) {
        var x = h(I, n);
        return d(s), x;
      }
      S(s, "ciphertext cannot be decrypted using that key");
    }
    function B(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = E((_ = f(n, _, "message"))),
        p = _.length;
      n.push(s);
      var y = null,
        u = 0;
      null != a &&
        ((y = E((a = f(n, a, "additional_data")))), (u = a.length), n.push(y));
      var g = null;
      null != r &&
        ((g = E((r = f(n, r, "secret_nonce")))), r.length, n.push(g)),
        (e = f(n, e, "public_nonce"));
      var Y,
        m = 0 | t._crypto_aead_chacha20poly1305_ietf_npubbytes();
      e.length !== m && T(n, "invalid public_nonce length"),
        (Y = E(e)),
        n.push(Y),
        (o = f(n, o, "key"));
      var B,
        b = 0 | t._crypto_aead_chacha20poly1305_ietf_keybytes();
      o.length !== b && T(n, "invalid key length"), (B = E(o)), n.push(B);
      var v = new l((p + t._crypto_aead_chacha20poly1305_ietf_abytes()) | 0),
        A = v.address;
      if (
        (n.push(A),
        0 ===
          t._crypto_aead_chacha20poly1305_ietf_encrypt(
            A,
            null,
            s,
            p,
            0,
            y,
            u,
            0,
            g,
            Y,
            B
          ))
      ) {
        var M = h(v, c);
        return d(n), M;
      }
      S(n, "invalid usage");
    }
    function b(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = E((_ = f(n, _, "message"))),
        p = _.length;
      n.push(s);
      var y = null,
        u = 0;
      null != a &&
        ((y = E((a = f(n, a, "additional_data")))), (u = a.length), n.push(y));
      var g = null;
      null != r &&
        ((g = E((r = f(n, r, "secret_nonce")))), r.length, n.push(g)),
        (e = f(n, e, "public_nonce"));
      var Y,
        m = 0 | t._crypto_aead_chacha20poly1305_ietf_npubbytes();
      e.length !== m && T(n, "invalid public_nonce length"),
        (Y = E(e)),
        n.push(Y),
        (o = f(n, o, "key"));
      var B,
        b = 0 | t._crypto_aead_chacha20poly1305_ietf_keybytes();
      o.length !== b && T(n, "invalid key length"), (B = E(o)), n.push(B);
      var v = new l(0 | p),
        A = v.address;
      n.push(A);
      var M = new l(0 | t._crypto_aead_chacha20poly1305_ietf_abytes()),
        I = M.address;
      if (
        (n.push(I),
        0 ===
          t._crypto_aead_chacha20poly1305_ietf_encrypt_detached(
            A,
            I,
            null,
            s,
            p,
            0,
            y,
            u,
            0,
            g,
            Y,
            B
          ))
      ) {
        var w = h({ ciphertext: v, mac: M }, c);
        return d(n), w;
      }
      S(n, "invalid usage");
    }
    function v(_) {
      var a = [];
      i(_);
      var r = new l(0 | t._crypto_aead_chacha20poly1305_ietf_keybytes()),
        e = r.address;
      a.push(e), t._crypto_aead_chacha20poly1305_ietf_keygen(e);
      var o = h(r, _);
      return d(a), o;
    }
    function A(_) {
      var a = [];
      i(_);
      var r = new l(0 | t._crypto_aead_chacha20poly1305_keybytes()),
        e = r.address;
      a.push(e), t._crypto_aead_chacha20poly1305_keygen(e);
      var o = h(r, _);
      return d(a), o;
    }
    function M(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = null;
      null != _ &&
        ((s = E((_ = f(n, _, "secret_nonce")))), _.length, n.push(s)),
        (a = f(n, a, "ciphertext"));
      var p,
        y = t._crypto_aead_xchacha20poly1305_ietf_abytes(),
        u = a.length;
      u < y && T(n, "ciphertext is too short"), (p = E(a)), n.push(p);
      var g = null,
        Y = 0;
      null != r &&
        ((g = E((r = f(n, r, "additional_data")))), (Y = r.length), n.push(g)),
        (e = f(n, e, "public_nonce"));
      var m,
        B = 0 | t._crypto_aead_xchacha20poly1305_ietf_npubbytes();
      e.length !== B && T(n, "invalid public_nonce length"),
        (m = E(e)),
        n.push(m),
        (o = f(n, o, "key"));
      var b,
        v = 0 | t._crypto_aead_xchacha20poly1305_ietf_keybytes();
      o.length !== v && T(n, "invalid key length"), (b = E(o)), n.push(b);
      var A = new l((u - t._crypto_aead_xchacha20poly1305_ietf_abytes()) | 0),
        M = A.address;
      if (
        (n.push(M),
        0 ===
          t._crypto_aead_xchacha20poly1305_ietf_decrypt(
            M,
            null,
            s,
            p,
            u,
            0,
            g,
            Y,
            0,
            m,
            b
          ))
      ) {
        var I = h(A, c);
        return d(n), I;
      }
      S(n, "ciphertext cannot be decrypted using that key");
    }
    function I(_, a, r, e, o, c, n) {
      var s = [];
      i(n);
      var p = null;
      null != _ &&
        ((p = E((_ = f(s, _, "secret_nonce")))), _.length, s.push(p));
      var y = E((a = f(s, a, "ciphertext"))),
        u = a.length;
      s.push(y), (r = f(s, r, "mac"));
      var g,
        Y = 0 | t._crypto_box_macbytes();
      r.length !== Y && T(s, "invalid mac length"), (g = E(r)), s.push(g);
      var m = null,
        B = 0;
      null != e &&
        ((m = E((e = f(s, e, "additional_data")))), (B = e.length), s.push(m)),
        (o = f(s, o, "public_nonce"));
      var b,
        v = 0 | t._crypto_aead_xchacha20poly1305_ietf_npubbytes();
      o.length !== v && T(s, "invalid public_nonce length"),
        (b = E(o)),
        s.push(b),
        (c = f(s, c, "key"));
      var A,
        M = 0 | t._crypto_aead_xchacha20poly1305_ietf_keybytes();
      c.length !== M && T(s, "invalid key length"), (A = E(c)), s.push(A);
      var I = new l(0 | u),
        w = I.address;
      if (
        (s.push(w),
        0 ===
          t._crypto_aead_xchacha20poly1305_ietf_decrypt_detached(
            w,
            p,
            y,
            u,
            0,
            g,
            m,
            B,
            0,
            b,
            A
          ))
      ) {
        var x = h(I, n);
        return d(s), x;
      }
      S(s, "ciphertext cannot be decrypted using that key");
    }
    function w(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = E((_ = f(n, _, "message"))),
        p = _.length;
      n.push(s);
      var y = null,
        u = 0;
      null != a &&
        ((y = E((a = f(n, a, "additional_data")))), (u = a.length), n.push(y));
      var g = null;
      null != r &&
        ((g = E((r = f(n, r, "secret_nonce")))), r.length, n.push(g)),
        (e = f(n, e, "public_nonce"));
      var Y,
        m = 0 | t._crypto_aead_xchacha20poly1305_ietf_npubbytes();
      e.length !== m && T(n, "invalid public_nonce length"),
        (Y = E(e)),
        n.push(Y),
        (o = f(n, o, "key"));
      var B,
        b = 0 | t._crypto_aead_xchacha20poly1305_ietf_keybytes();
      o.length !== b && T(n, "invalid key length"), (B = E(o)), n.push(B);
      var v = new l((p + t._crypto_aead_xchacha20poly1305_ietf_abytes()) | 0),
        A = v.address;
      if (
        (n.push(A),
        0 ===
          t._crypto_aead_xchacha20poly1305_ietf_encrypt(
            A,
            null,
            s,
            p,
            0,
            y,
            u,
            0,
            g,
            Y,
            B
          ))
      ) {
        var M = h(v, c);
        return d(n), M;
      }
      S(n, "invalid usage");
    }
    function x(_, a, r, e, o, c) {
      var n = [];
      i(c);
      var s = E((_ = f(n, _, "message"))),
        p = _.length;
      n.push(s);
      var y = null,
        u = 0;
      null != a &&
        ((y = E((a = f(n, a, "additional_data")))), (u = a.length), n.push(y));
      var g = null;
      null != r &&
        ((g = E((r = f(n, r, "secret_nonce")))), r.length, n.push(g)),
        (e = f(n, e, "public_nonce"));
      var Y,
        m = 0 | t._crypto_aead_xchacha20poly1305_ietf_npubbytes();
      e.length !== m && T(n, "invalid public_nonce length"),
        (Y = E(e)),
        n.push(Y),
        (o = f(n, o, "key"));
      var B,
        b = 0 | t._crypto_aead_xchacha20poly1305_ietf_keybytes();
      o.length !== b && T(n, "invalid key length"), (B = E(o)), n.push(B);
      var v = new l(0 | p),
        A = v.address;
      n.push(A);
      var M = new l(0 | t._crypto_aead_xchacha20poly1305_ietf_abytes()),
        I = M.address;
      if (
        (n.push(I),
        0 ===
          t._crypto_aead_xchacha20poly1305_ietf_encrypt_detached(
            A,
            I,
            null,
            s,
            p,
            0,
            y,
            u,
            0,
            g,
            Y,
            B
          ))
      ) {
        var w = h({ ciphertext: v, mac: M }, c);
        return d(n), w;
      }
      S(n, "invalid usage");
    }
    function N(_) {
      var a = [];
      i(_);
      var r = new l(0 | t._crypto_aead_xchacha20poly1305_ietf_keybytes()),
        e = r.address;
      a.push(e), t._crypto_aead_xchacha20poly1305_ietf_keygen(e);
      var o = h(r, _);
      return d(a), o;
    }
    function L(_, a, r, e, o, c, n) {
      var s = [];
      i(n),
        g(s, _, "keyLength"),
        ("number" != typeof _ || (0 | _) !== _ || _ < 0) &&
          T(s, "keyLength must be an unsigned integer");
      var p = E((a = f(s, a, "password"))),
        y = a.length;
      s.push(p), (r = f(s, r, "salt"));
      var u,
        Y = 0 | t._crypto_pwhash_saltbytes();
      r.length !== Y && T(s, "invalid salt length"),
        (u = E(r)),
        s.push(u),
        g(s, e, "opsLimit"),
        ("number" != typeof e || (0 | e) !== e || e < 0) &&
          T(s, "opsLimit must be an unsigned integer"),
        g(s, o, "memLimit"),
        ("number" != typeof o || (0 | o) !== o || o < 0) &&
          T(s, "memLimit must be an unsigned integer"),
        g(s, c, "algorithm"),
        ("number" != typeof c || (0 | c) !== c || c < 0) &&
          T(s, "algorithm must be an unsigned integer");
      var m = new l(0 | _),
        B = m.address;
      if (
        (s.push(B), !(0 | t._crypto_pwhash(B, _, 0, p, y, 0, u, e, 0, o, c)))
      ) {
        var b = h(m, n);
        return d(s), b;
      }
      S(s, "invalid usage");
    }
    function O(_, a, r, e, o, c) {
      var n = [];
      i(c),
        g(n, _, "keyLength"),
        ("number" != typeof _ || (0 | _) !== _ || _ < 0) &&
          T(n, "keyLength must be an unsigned integer");
      var s = E((a = f(n, a, "password"))),
        p = a.length;
      n.push(s), (r = f(n, r, "salt"));
      var y,
        u = 0 | t._crypto_pwhash_scryptsalsa208sha256_saltbytes();
      r.length !== u && T(n, "invalid salt length"),
        (y = E(r)),
        n.push(y),
        g(n, e, "opsLimit"),
        ("number" != typeof e || (0 | e) !== e || e < 0) &&
          T(n, "opsLimit must be an unsigned integer"),
        g(n, o, "memLimit"),
        ("number" != typeof o || (0 | o) !== o || o < 0) &&
          T(n, "memLimit must be an unsigned integer");
      var Y = new l(0 | _),
        m = Y.address;
      if (
        (n.push(m),
        !(
          0 |
          t._crypto_pwhash_scryptsalsa208sha256(m, _, 0, s, p, 0, y, e, 0, o)
        ))
      ) {
        var B = h(Y, c);
        return d(n), B;
      }
      S(n, "invalid usage");
    }
    function k(_, a, r, e, o, c, n) {
      var s = [];
      i(n);
      var p = E((_ = f(s, _, "password"))),
        y = _.length;
      s.push(p);
      var u = E((a = f(s, a, "salt"))),
        Y = a.length;
      s.push(u),
        g(s, r, "opsLimit"),
        ("number" != typeof r || (0 | r) !== r || r < 0) &&
          T(s, "opsLimit must be an unsigned integer"),
        g(s, e, "r"),
        ("number" != typeof e || (0 | e) !== e || e < 0) &&
          T(s, "r must be an unsigned integer"),
        g(s, o, "p"),
        ("number" != typeof o || (0 | o) !== o || o < 0) &&
          T(s, "p must be an unsigned integer"),
        g(s, c, "keyLength"),
        ("number" != typeof c || (0 | c) !== c || c < 0) &&
          T(s, "keyLength must be an unsigned integer");
      var m = new l(0 | c),
        B = m.address;
      if (
        (s.push(B),
        !(
          0 |
          t._crypto_pwhash_scryptsalsa208sha256_ll(p, y, u, Y, r, 0, e, o, B, c)
        ))
      ) {
        var b = h(m, n);
        return d(s), b;
      }
      S(s, "invalid usage");
    }
    function U(_, a, r, e) {
      var o = [];
      i(e);
      var c = E((_ = f(o, _, "password"))),
        n = _.length;
      o.push(c),
        g(o, a, "opsLimit"),
        ("number" != typeof a || (0 | a) !== a || a < 0) &&
          T(o, "opsLimit must be an unsigned integer"),
        g(o, r, "memLimit"),
        ("number" != typeof r || (0 | r) !== r || r < 0) &&
          T(o, "memLimit must be an unsigned integer");
      var s = new l(0 | t._crypto_pwhash_scryptsalsa208sha256_strbytes())
        .address;
      if (
        (o.push(s),
        !(0 | t._crypto_pwhash_scryptsalsa208sha256_str(s, c, n, 0, a, 0, r)))
      ) {
        var p = t.UTF8ToString(s);
        return d(o), p;
      }
      S(o, "invalid usage");
    }
    function C(_, a, r) {
      var o = [];
      i(r),
        "string" != typeof _ && T(o, "hashed_password must be a string"),
        (_ = e(_ + "\0")),
        null != n &&
          _.length - 1 !== n &&
          T(o, "invalid hashed_password length");
      var c = E(_),
        n = _.length - 1;
      o.push(c);
      var s = E((a = f(o, a, "password"))),
        p = a.length;
      o.push(s);
      var h = !(
        0 | t._crypto_pwhash_scryptsalsa208sha256_str_verify(c, s, p, 0)
      );
      return d(o), h;
    }
    function R(_, a, r, e) {
      var o = [];
      i(e);
      var c = E((_ = f(o, _, "password"))),
        n = _.length;
      o.push(c),
        g(o, a, "opsLimit"),
        ("number" != typeof a || (0 | a) !== a || a < 0) &&
          T(o, "opsLimit must be an unsigned integer"),
        g(o, r, "memLimit"),
        ("number" != typeof r || (0 | r) !== r || r < 0) &&
          T(o, "memLimit must be an unsigned integer");
      var s = new l(0 | t._crypto_pwhash_strbytes()).address;
      if ((o.push(s), !(0 | t._crypto_pwhash_str(s, c, n, 0, a, 0, r)))) {
        var p = t.UTF8ToString(s);
        return d(o), p;
      }
      S(o, "invalid usage");
    }
    function P(_, a, r, o) {
      var c = [];
      i(o),
        "string" != typeof _ && T(c, "hashed_password must be a string"),
        (_ = e(_ + "\0")),
        null != s &&
          _.length - 1 !== s &&
          T(c, "invalid hashed_password length");
      var n = E(_),
        s = _.length - 1;
      c.push(n),
        g(c, a, "opsLimit"),
        ("number" != typeof a || (0 | a) !== a || a < 0) &&
          T(c, "opsLimit must be an unsigned integer"),
        g(c, r, "memLimit"),
        ("number" != typeof r || (0 | r) !== r || r < 0) &&
          T(c, "memLimit must be an unsigned integer");
      var p = !!(0 | t._crypto_pwhash_str_needs_rehash(n, a, 0, r));
      return d(c), p;
    }
    function K(_, a, r) {
      var o = [];
      i(r),
        "string" != typeof _ && T(o, "hashed_password must be a string"),
        (_ = e(_ + "\0")),
        null != n &&
          _.length - 1 !== n &&
          T(o, "invalid hashed_password length");
      var c = E(_),
        n = _.length - 1;
      o.push(c);
      var s = E((a = f(o, a, "password"))),
        p = a.length;
      o.push(s);
      var h = !(0 | t._crypto_pwhash_str_verify(c, s, p, 0));
      return d(o), h;
    }
    function X(_, a) {
      var r = [];
      i(a),
        g(r, _, "length"),
        ("number" != typeof _ || (0 | _) !== _ || _ < 0) &&
          T(r, "length must be an unsigned integer");
      var e = new l(0 | _),
        o = e.address;
      r.push(o), t._randombytes_buf(o, _);
      var c = h(e, a);
      return d(r), c;
    }
    function G(_, a, r) {
      var e = [];
      i(r),
        g(e, _, "length"),
        ("number" != typeof _ || (0 | _) !== _ || _ < 0) &&
          T(e, "length must be an unsigned integer"),
        (a = f(e, a, "seed"));
      var o,
        c = 0 | t._randombytes_seedbytes();
      a.length !== c && T(e, "invalid seed length"), (o = E(a)), e.push(o);
      var n = new l(0 | _),
        s = n.address;
      e.push(s), t._randombytes_buf_deterministic(s, _, o);
      var p = h(n, r);
      return d(e), p;
    }
    function D(_) {
      i(_), t._randombytes_close();
    }
    function F(_) {
      i(_);
      var a = t._randombytes_random() >>> 0;
      return d([]), a;
    }
    function V(_, a) {
      var r = [];
      i(a);
      for (var e = t._malloc(24), o = 0; o < 6; o++)
        t.setValue(
          e + 4 * o,
          t.Runtime.addFunction(
            _[
              [
                "implementation_name",
                "random",
                "stir",
                "uniform",
                "buf",
                "close"
              ][o]
            ]
          ),
          "i32"
        );
      0 | t._randombytes_set_implementation(e) &&
        S(r, "unsupported implementation"),
        d(r);
    }
    function W(_) {
      i(_), t._randombytes_stir();
    }
    function H(_, a) {
      var r = [];
      i(a),
        g(r, _, "upper_bound"),
        ("number" != typeof _ || (0 | _) !== _ || _ < 0) &&
          T(r, "upper_bound must be an unsigned integer");
      var e = t._randombytes_uniform(_) >>> 0;
      return d(r), e;
    }
    function j() {
      var _ = t._sodium_version_string(),
        a = t.UTF8ToString(_);
      return d([]), a;
    }
    return (
      (l.prototype.to_Uint8Array = function () {
        var _ = new Uint8Array(this.length);
        return (
          _.set(t.HEAPU8.subarray(this.address, this.address + this.length)), _
        );
      }),
      (_.add = function (_, a) {
        if (!(_ instanceof Uint8Array && a instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can added");
        var t = _.length,
          r = 0,
          e = 0;
        if (a.length != _.length)
          throw new TypeError("Arguments must have the same length");
        for (e = 0; e < t; e++) (r >>= 8), (r += _[e] + a[e]), (_[e] = 255 & r);
      }),
      (_.base64_variants = n),
      (_.compare = function (_, a) {
        if (!(_ instanceof Uint8Array && a instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can be compared");
        if (_.length !== a.length)
          throw new TypeError(
            "Only instances of identical length can be compared"
          );
        for (var t = 0, r = 1, e = _.length; e-- > 0; )
          (t |= ((a[e] - _[e]) >> 8) & r), (r &= ((a[e] ^ _[e]) - 1) >> 8);
        return t + t + r - 1;
      }),
      (_.from_base64 = function (_, a) {
        a = s(a);
        var r,
          e = [],
          o = new l((3 * (_ = f(e, _, "input")).length) / 4),
          c = E(_),
          n = u(4),
          p = u(4);
        return (
          e.push(c),
          e.push(o.address),
          e.push(o.result_bin_len_p),
          e.push(o.b64_end_p),
          0 !==
            t._sodium_base642bin(
              o.address,
              o.length,
              c,
              _.length,
              0,
              n,
              p,
              a
            ) && S(e, "invalid input"),
          t.getValue(p, "i32") - c !== _.length && S(e, "incomplete input"),
          (o.length = t.getValue(n, "i32")),
          (r = o.to_Uint8Array()),
          d(e),
          r
        );
      }),
      (_.from_hex = function (_) {
        var a,
          r = [],
          e = new l((_ = f(r, _, "input")).length / 2),
          o = E(_),
          c = u(4);
        return (
          r.push(o),
          r.push(e.address),
          r.push(e.hex_end_p),
          0 !== t._sodium_hex2bin(e.address, e.length, o, _.length, 0, 0, c) &&
            S(r, "invalid input"),
          t.getValue(c, "i32") - o !== _.length && S(r, "incomplete input"),
          (a = e.to_Uint8Array()),
          d(r),
          a
        );
      }),
      (_.from_string = e),
      (_.increment = function (_) {
        if (!(_ instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can be incremented");
        for (var a = 256, t = 0, r = _.length; t < r; t++)
          (a >>= 8), (a += _[t]), (_[t] = 255 & a);
      }),
      (_.is_zero = function (_) {
        if (!(_ instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can be checked");
        for (var a = 0, t = 0, r = _.length; t < r; t++) a |= _[t];
        return 0 === a;
      }),
      (_.libsodium = a),
      (_.memcmp = function (_, a) {
        if (!(_ instanceof Uint8Array && a instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can be compared");
        if (_.length !== a.length)
          throw new TypeError(
            "Only instances of identical length can be compared"
          );
        for (var t = 0, r = 0, e = _.length; r < e; r++) t |= _[r] ^ a[r];
        return 0 === t;
      }),
      (_.memzero = function (_) {
        if (!(_ instanceof Uint8Array))
          throw new TypeError("Only Uint8Array instances can be wiped");
        for (var a = 0, t = _.length; a < t; a++) _[a] = 0;
      }),
      (_.output_formats = function () {
        return ["uint8array", "text", "hex", "base64"];
      }),
      (_.pad = function (_, a) {
        if (!(_ instanceof Uint8Array))
          throw new TypeError("buffer must be a Uint8Array");
        if ((a |= 0) <= 0) throw new Error("block size must be > 0");
        var r,
          e = [],
          o = u(4),
          c = 1,
          n = 0,
          s = 0 | _.length,
          p = new l(s + a);
        e.push(o), e.push(p.address);
        for (var h = p.address, y = p.address + s + a; h < y; h++)
          (t.HEAPU8[h] = _[n]),
            (n += c =
              1 &
              ~(
                ((65535 & (((s -= c) >>> 48) | (s >>> 32) | (s >>> 16) | s)) -
                  1) >>
                16
              ));
        return (
          0 !== t._sodium_pad(o, p.address, _.length, a, p.length) &&
            S(e, "internal error"),
          (p.length = t.getValue(o, "i32")),
          (r = p.to_Uint8Array()),
          d(e),
          r
        );
      }),
      (_.unpad = function (_, a) {
        if (!(_ instanceof Uint8Array))
          throw new TypeError("buffer must be a Uint8Array");
        if ((a |= 0) <= 0) throw new Error("block size must be > 0");
        var r = [],
          e = E(_),
          o = u(4);
        return (
          r.push(e),
          r.push(o),
          0 !== t._sodium_unpad(o, e, _.length, a) &&
            S(r, "unsupported/invalid padding"),
          (_ = (_ = new Uint8Array(_)).subarray(0, t.getValue(o, "i32"))),
          d(r),
          _
        );
      }),
      (_.ready = r),
      (_.symbols = function () {
        return Object.keys(_).sort();
      }),
      (_.to_base64 = p),
      (_.to_hex = c),
      (_.to_string = o),
      _
    );
  }
  var t =
    "object" == typeof _.sodium && "function" == typeof _.sodium.onload
      ? _.sodium.onload
      : null;
  "function" == typeof define && define.amd
    ? define(["exports", "libsodium-sumo"], a)
    : "object" == typeof exports && "string" != typeof exports.nodeName
    ? a(exports, require("@pcd/libsodium-sumo"))
    : (_.sodium = a((_.commonJsStrict = {}), _.libsodium)),
    t &&
      _.sodium.ready.then(function () {
        t(_.sodium);
      });
})(this);
