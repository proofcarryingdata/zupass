"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// ../../node_modules/js-sha256/src/sha256.js
var require_sha256 = __commonJS({
  "../../node_modules/js-sha256/src/sha256.js"(exports, module2) {
    (function() {
      "use strict";
      var ERROR = "input is invalid type";
      var WINDOW = typeof window === "object";
      var root = WINDOW ? window : {};
      if (root.JS_SHA256_NO_WINDOW) {
        WINDOW = false;
      }
      var WEB_WORKER = !WINDOW && typeof self === "object";
      var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === "object" && process.versions && process.versions.node;
      if (NODE_JS) {
        root = global;
      } else if (WEB_WORKER) {
        root = self;
      }
      var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module2 === "object" && module2.exports;
      var AMD = typeof define === "function" && define.amd;
      var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== "undefined";
      var HEX_CHARS = "0123456789abcdef".split("");
      var EXTRA = [-2147483648, 8388608, 32768, 128];
      var SHIFT = [24, 16, 8, 0];
      var K = [
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ];
      var OUTPUT_TYPES = ["hex", "array", "digest", "arrayBuffer"];
      var blocks = [];
      if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
        Array.isArray = function(obj) {
          return Object.prototype.toString.call(obj) === "[object Array]";
        };
      }
      if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
        ArrayBuffer.isView = function(obj) {
          return typeof obj === "object" && obj.buffer && obj.buffer.constructor === ArrayBuffer;
        };
      }
      var createOutputMethod = function(outputType, is224) {
        return function(message) {
          return new Sha256(is224, true).update(message)[outputType]();
        };
      };
      var createMethod = function(is224) {
        var method = createOutputMethod("hex", is224);
        if (NODE_JS) {
          method = nodeWrap(method, is224);
        }
        method.create = function() {
          return new Sha256(is224);
        };
        method.update = function(message) {
          return method.create().update(message);
        };
        for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
          var type = OUTPUT_TYPES[i];
          method[type] = createOutputMethod(type, is224);
        }
        return method;
      };
      var nodeWrap = function(method, is224) {
        var crypto = require("crypto");
        var Buffer2 = require("buffer").Buffer;
        var algorithm = is224 ? "sha224" : "sha256";
        var bufferFrom;
        if (Buffer2.from && !root.JS_SHA256_NO_BUFFER_FROM) {
          bufferFrom = Buffer2.from;
        } else {
          bufferFrom = function(message) {
            return new Buffer2(message);
          };
        }
        var nodeMethod = function(message) {
          if (typeof message === "string") {
            return crypto.createHash(algorithm).update(message, "utf8").digest("hex");
          } else {
            if (message === null || message === void 0) {
              throw new Error(ERROR);
            } else if (message.constructor === ArrayBuffer) {
              message = new Uint8Array(message);
            }
          }
          if (Array.isArray(message) || ArrayBuffer.isView(message) || message.constructor === Buffer2) {
            return crypto.createHash(algorithm).update(bufferFrom(message)).digest("hex");
          } else {
            return method(message);
          }
        };
        return nodeMethod;
      };
      var createHmacOutputMethod = function(outputType, is224) {
        return function(key, message) {
          return new HmacSha256(key, is224, true).update(message)[outputType]();
        };
      };
      var createHmacMethod = function(is224) {
        var method = createHmacOutputMethod("hex", is224);
        method.create = function(key) {
          return new HmacSha256(key, is224);
        };
        method.update = function(key, message) {
          return method.create(key).update(message);
        };
        for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
          var type = OUTPUT_TYPES[i];
          method[type] = createHmacOutputMethod(type, is224);
        }
        return method;
      };
      function Sha256(is224, sharedMemory) {
        if (sharedMemory) {
          blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
          this.blocks = blocks;
        } else {
          this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        if (is224) {
          this.h0 = 3238371032;
          this.h1 = 914150663;
          this.h2 = 812702999;
          this.h3 = 4144912697;
          this.h4 = 4290775857;
          this.h5 = 1750603025;
          this.h6 = 1694076839;
          this.h7 = 3204075428;
        } else {
          this.h0 = 1779033703;
          this.h1 = 3144134277;
          this.h2 = 1013904242;
          this.h3 = 2773480762;
          this.h4 = 1359893119;
          this.h5 = 2600822924;
          this.h6 = 528734635;
          this.h7 = 1541459225;
        }
        this.block = this.start = this.bytes = this.hBytes = 0;
        this.finalized = this.hashed = false;
        this.first = true;
        this.is224 = is224;
      }
      Sha256.prototype.update = function(message) {
        if (this.finalized) {
          return;
        }
        var notString, type = typeof message;
        if (type !== "string") {
          if (type === "object") {
            if (message === null) {
              throw new Error(ERROR);
            } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
              message = new Uint8Array(message);
            } else if (!Array.isArray(message)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                throw new Error(ERROR);
              }
            }
          } else {
            throw new Error(ERROR);
          }
          notString = true;
        }
        var code, index = 0, i, length = message.length, blocks2 = this.blocks;
        while (index < length) {
          if (this.hashed) {
            this.hashed = false;
            blocks2[0] = this.block;
            blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
          }
          if (notString) {
            for (i = this.start; index < length && i < 64; ++index) {
              blocks2[i >> 2] |= message[index] << SHIFT[i++ & 3];
            }
          } else {
            for (i = this.start; index < length && i < 64; ++index) {
              code = message.charCodeAt(index);
              if (code < 128) {
                blocks2[i >> 2] |= code << SHIFT[i++ & 3];
              } else if (code < 2048) {
                blocks2[i >> 2] |= (192 | code >> 6) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              } else if (code < 55296 || code >= 57344) {
                blocks2[i >> 2] |= (224 | code >> 12) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              } else {
                code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                blocks2[i >> 2] |= (240 | code >> 18) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code >> 12 & 63) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              }
            }
          }
          this.lastByteIndex = i;
          this.bytes += i - this.start;
          if (i >= 64) {
            this.block = blocks2[16];
            this.start = i - 64;
            this.hash();
            this.hashed = true;
          } else {
            this.start = i;
          }
        }
        if (this.bytes > 4294967295) {
          this.hBytes += this.bytes / 4294967296 << 0;
          this.bytes = this.bytes % 4294967296;
        }
        return this;
      };
      Sha256.prototype.finalize = function() {
        if (this.finalized) {
          return;
        }
        this.finalized = true;
        var blocks2 = this.blocks, i = this.lastByteIndex;
        blocks2[16] = this.block;
        blocks2[i >> 2] |= EXTRA[i & 3];
        this.block = blocks2[16];
        if (i >= 56) {
          if (!this.hashed) {
            this.hash();
          }
          blocks2[0] = this.block;
          blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
        }
        blocks2[14] = this.hBytes << 3 | this.bytes >>> 29;
        blocks2[15] = this.bytes << 3;
        this.hash();
      };
      Sha256.prototype.hash = function() {
        var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks2 = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;
        for (j = 16; j < 64; ++j) {
          t1 = blocks2[j - 15];
          s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
          t1 = blocks2[j - 2];
          s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
          blocks2[j] = blocks2[j - 16] + s0 + blocks2[j - 7] + s1 << 0;
        }
        bc = b & c;
        for (j = 0; j < 64; j += 4) {
          if (this.first) {
            if (this.is224) {
              ab = 300032;
              t1 = blocks2[0] - 1413257819;
              h = t1 - 150054599 << 0;
              d = t1 + 24177077 << 0;
            } else {
              ab = 704751109;
              t1 = blocks2[0] - 210244248;
              h = t1 - 1521486534 << 0;
              d = t1 + 143694565 << 0;
            }
            this.first = false;
          } else {
            s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
            s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
            ab = a & b;
            maj = ab ^ a & c ^ bc;
            ch = e & f ^ ~e & g;
            t1 = h + s1 + ch + K[j] + blocks2[j];
            t2 = s0 + maj;
            h = d + t1 << 0;
            d = t1 + t2 << 0;
          }
          s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
          s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
          da = d & a;
          maj = da ^ d & b ^ ab;
          ch = h & e ^ ~h & f;
          t1 = g + s1 + ch + K[j + 1] + blocks2[j + 1];
          t2 = s0 + maj;
          g = c + t1 << 0;
          c = t1 + t2 << 0;
          s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
          s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
          cd = c & d;
          maj = cd ^ c & a ^ da;
          ch = g & h ^ ~g & e;
          t1 = f + s1 + ch + K[j + 2] + blocks2[j + 2];
          t2 = s0 + maj;
          f = b + t1 << 0;
          b = t1 + t2 << 0;
          s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
          s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
          bc = b & c;
          maj = bc ^ b & d ^ cd;
          ch = f & g ^ ~f & h;
          t1 = e + s1 + ch + K[j + 3] + blocks2[j + 3];
          t2 = s0 + maj;
          e = a + t1 << 0;
          a = t1 + t2 << 0;
          this.chromeBugWorkAround = true;
        }
        this.h0 = this.h0 + a << 0;
        this.h1 = this.h1 + b << 0;
        this.h2 = this.h2 + c << 0;
        this.h3 = this.h3 + d << 0;
        this.h4 = this.h4 + e << 0;
        this.h5 = this.h5 + f << 0;
        this.h6 = this.h6 + g << 0;
        this.h7 = this.h7 + h << 0;
      };
      Sha256.prototype.hex = function() {
        this.finalize();
        var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
        var hex = HEX_CHARS[h0 >> 28 & 15] + HEX_CHARS[h0 >> 24 & 15] + HEX_CHARS[h0 >> 20 & 15] + HEX_CHARS[h0 >> 16 & 15] + HEX_CHARS[h0 >> 12 & 15] + HEX_CHARS[h0 >> 8 & 15] + HEX_CHARS[h0 >> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >> 28 & 15] + HEX_CHARS[h1 >> 24 & 15] + HEX_CHARS[h1 >> 20 & 15] + HEX_CHARS[h1 >> 16 & 15] + HEX_CHARS[h1 >> 12 & 15] + HEX_CHARS[h1 >> 8 & 15] + HEX_CHARS[h1 >> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >> 28 & 15] + HEX_CHARS[h2 >> 24 & 15] + HEX_CHARS[h2 >> 20 & 15] + HEX_CHARS[h2 >> 16 & 15] + HEX_CHARS[h2 >> 12 & 15] + HEX_CHARS[h2 >> 8 & 15] + HEX_CHARS[h2 >> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >> 28 & 15] + HEX_CHARS[h3 >> 24 & 15] + HEX_CHARS[h3 >> 20 & 15] + HEX_CHARS[h3 >> 16 & 15] + HEX_CHARS[h3 >> 12 & 15] + HEX_CHARS[h3 >> 8 & 15] + HEX_CHARS[h3 >> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >> 28 & 15] + HEX_CHARS[h4 >> 24 & 15] + HEX_CHARS[h4 >> 20 & 15] + HEX_CHARS[h4 >> 16 & 15] + HEX_CHARS[h4 >> 12 & 15] + HEX_CHARS[h4 >> 8 & 15] + HEX_CHARS[h4 >> 4 & 15] + HEX_CHARS[h4 & 15] + HEX_CHARS[h5 >> 28 & 15] + HEX_CHARS[h5 >> 24 & 15] + HEX_CHARS[h5 >> 20 & 15] + HEX_CHARS[h5 >> 16 & 15] + HEX_CHARS[h5 >> 12 & 15] + HEX_CHARS[h5 >> 8 & 15] + HEX_CHARS[h5 >> 4 & 15] + HEX_CHARS[h5 & 15] + HEX_CHARS[h6 >> 28 & 15] + HEX_CHARS[h6 >> 24 & 15] + HEX_CHARS[h6 >> 20 & 15] + HEX_CHARS[h6 >> 16 & 15] + HEX_CHARS[h6 >> 12 & 15] + HEX_CHARS[h6 >> 8 & 15] + HEX_CHARS[h6 >> 4 & 15] + HEX_CHARS[h6 & 15];
        if (!this.is224) {
          hex += HEX_CHARS[h7 >> 28 & 15] + HEX_CHARS[h7 >> 24 & 15] + HEX_CHARS[h7 >> 20 & 15] + HEX_CHARS[h7 >> 16 & 15] + HEX_CHARS[h7 >> 12 & 15] + HEX_CHARS[h7 >> 8 & 15] + HEX_CHARS[h7 >> 4 & 15] + HEX_CHARS[h7 & 15];
        }
        return hex;
      };
      Sha256.prototype.toString = Sha256.prototype.hex;
      Sha256.prototype.digest = function() {
        this.finalize();
        var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
        var arr = [
          h0 >> 24 & 255,
          h0 >> 16 & 255,
          h0 >> 8 & 255,
          h0 & 255,
          h1 >> 24 & 255,
          h1 >> 16 & 255,
          h1 >> 8 & 255,
          h1 & 255,
          h2 >> 24 & 255,
          h2 >> 16 & 255,
          h2 >> 8 & 255,
          h2 & 255,
          h3 >> 24 & 255,
          h3 >> 16 & 255,
          h3 >> 8 & 255,
          h3 & 255,
          h4 >> 24 & 255,
          h4 >> 16 & 255,
          h4 >> 8 & 255,
          h4 & 255,
          h5 >> 24 & 255,
          h5 >> 16 & 255,
          h5 >> 8 & 255,
          h5 & 255,
          h6 >> 24 & 255,
          h6 >> 16 & 255,
          h6 >> 8 & 255,
          h6 & 255
        ];
        if (!this.is224) {
          arr.push(h7 >> 24 & 255, h7 >> 16 & 255, h7 >> 8 & 255, h7 & 255);
        }
        return arr;
      };
      Sha256.prototype.array = Sha256.prototype.digest;
      Sha256.prototype.arrayBuffer = function() {
        this.finalize();
        var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
        var dataView = new DataView(buffer);
        dataView.setUint32(0, this.h0);
        dataView.setUint32(4, this.h1);
        dataView.setUint32(8, this.h2);
        dataView.setUint32(12, this.h3);
        dataView.setUint32(16, this.h4);
        dataView.setUint32(20, this.h5);
        dataView.setUint32(24, this.h6);
        if (!this.is224) {
          dataView.setUint32(28, this.h7);
        }
        return buffer;
      };
      function HmacSha256(key, is224, sharedMemory) {
        var i, type = typeof key;
        if (type === "string") {
          var bytes = [], length = key.length, index = 0, code;
          for (i = 0; i < length; ++i) {
            code = key.charCodeAt(i);
            if (code < 128) {
              bytes[index++] = code;
            } else if (code < 2048) {
              bytes[index++] = 192 | code >> 6;
              bytes[index++] = 128 | code & 63;
            } else if (code < 55296 || code >= 57344) {
              bytes[index++] = 224 | code >> 12;
              bytes[index++] = 128 | code >> 6 & 63;
              bytes[index++] = 128 | code & 63;
            } else {
              code = 65536 + ((code & 1023) << 10 | key.charCodeAt(++i) & 1023);
              bytes[index++] = 240 | code >> 18;
              bytes[index++] = 128 | code >> 12 & 63;
              bytes[index++] = 128 | code >> 6 & 63;
              bytes[index++] = 128 | code & 63;
            }
          }
          key = bytes;
        } else {
          if (type === "object") {
            if (key === null) {
              throw new Error(ERROR);
            } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
              key = new Uint8Array(key);
            } else if (!Array.isArray(key)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
                throw new Error(ERROR);
              }
            }
          } else {
            throw new Error(ERROR);
          }
        }
        if (key.length > 64) {
          key = new Sha256(is224, true).update(key).array();
        }
        var oKeyPad = [], iKeyPad = [];
        for (i = 0; i < 64; ++i) {
          var b = key[i] || 0;
          oKeyPad[i] = 92 ^ b;
          iKeyPad[i] = 54 ^ b;
        }
        Sha256.call(this, is224, sharedMemory);
        this.update(iKeyPad);
        this.oKeyPad = oKeyPad;
        this.inner = true;
        this.sharedMemory = sharedMemory;
      }
      HmacSha256.prototype = new Sha256();
      HmacSha256.prototype.finalize = function() {
        Sha256.prototype.finalize.call(this);
        if (this.inner) {
          this.inner = false;
          var innerHash = this.array();
          Sha256.call(this, this.is224, this.sharedMemory);
          this.update(this.oKeyPad);
          this.update(innerHash);
          Sha256.prototype.finalize.call(this);
        }
      };
      var exports2 = createMethod();
      exports2.sha256 = exports2;
      exports2.sha224 = createMethod(true);
      exports2.sha256.hmac = createHmacMethod();
      exports2.sha224.hmac = createHmacMethod(true);
      if (COMMON_JS) {
        module2.exports = exports2;
      } else {
        root.sha256 = exports2.sha256;
        root.sha224 = exports2.sha224;
        if (AMD) {
          define(function() {
            return exports2;
          });
        }
      }
    })();
  }
});

// ../util/dist/index.js
var require_dist = __commonJS({
  "../util/dist/index.js"(exports, module2) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var __async2 = (__this, __arguments, generator) => {
      return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        };
        var rejected = (value) => {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        };
        var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
      });
    };
    var src_exports2 = {};
    __export2(src_exports2, {
      BABY_JUB_NEGATIVE_ONE: () => BABY_JUB_NEGATIVE_ONE,
      ONE_HOUR_MS: () => ONE_HOUR_MS,
      PSEUDONYM_TO_EMOJI: () => PSEUDONYM_TO_EMOJI,
      ZUPASS_GITHUB_REPOSITORY_URL: () => ZUPASS_GITHUB_REPOSITORY_URL,
      ZUPASS_SENDER_EMAIL: () => ZUPASS_SENDER_EMAIL,
      ZUPASS_SUPPORT_EMAIL: () => ZUPASS_SUPPORT_EMAIL,
      babyJubIsNegativeOne: () => babyJubIsNegativeOne,
      bigIntToPseudonymEmoji: () => bigIntToPseudonymEmoji,
      bigIntToPseudonymName: () => bigIntToPseudonymName,
      bigintToPseudonym: () => bigintToPseudonym,
      booleanToBigInt: () => booleanToBigInt,
      decStringToBigIntToUuid: () => decStringToBigIntToUuid,
      encodeAnonMessageIdAndReaction: () => encodeAnonMessageIdAndReaction,
      fromHexString: () => fromHexString,
      generateSnarkMessageHash: () => generateSnarkMessageHash,
      getAnonTopicNullifier: () => getAnonTopicNullifier,
      getErrorMessage: () => getErrorMessage,
      getMessageWatermark: () => getMessageWatermark,
      getRandomValues: () => getRandomValues,
      hexToBigInt: () => hexToBigInt,
      isBrowser: () => isBrowser,
      isFulfilled: () => isFulfilled,
      isNode: () => isNode,
      isWebAssemblySupported: () => isWebAssemblySupported,
      numberToBigInt: () => numberToBigInt,
      requireDefinedParameter: () => requireDefinedParameter2,
      sleep: () => sleep,
      toHexString: () => toHexString,
      uuidToBigInt: () => uuidToBigInt
    });
    module2.exports = __toCommonJS2(src_exports2);
    var ONE_HOUR_MS = 1e3 * 60 * 60;
    var ZUPASS_SUPPORT_EMAIL = "support@zupass.org";
    var ZUPASS_SENDER_EMAIL = "noreply@zupass.org";
    var ZUPASS_GITHUB_REPOSITORY_URL = "https://github.com/proofcarryingdata/zupass";
    function isNode() {
      return new Function("try {return this===global}catch(e){ return false}")();
    }
    function isBrowser() {
      return new Function("try {return this===window}catch(e){ return false}")();
    }
    function isWebAssemblySupported() {
      try {
        if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
          const module22 = new WebAssembly.Module(
            Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0)
          );
          if (module22 instanceof WebAssembly.Module) {
            return new WebAssembly.Instance(module22) instanceof WebAssembly.Instance;
          }
          return false;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    var crypto;
    function initCryptoAPI() {
      if (!crypto) {
        if (isBrowser()) {
          crypto = globalThis.crypto;
        } else if (isNode()) {
          const { webcrypto } = require("crypto");
          crypto = webcrypto;
        } else {
          throw new Error("Crypto API is not defined");
        }
      }
      return crypto;
    }
    function getRandomValues(numberOfBytes) {
      const crypto2 = initCryptoAPI();
      return crypto2.getRandomValues(new Uint8Array(numberOfBytes));
    }
    function getErrorMessage(e) {
      if (e instanceof Error) {
        return e.message;
      }
      return e + "";
    }
    function requireDefinedParameter2(parameter, parameterName) {
      if (typeof parameter === "undefined") {
        throw new Error(`${parameterName} must be defined`);
      }
    }
    var import_uuid2 = require("uuid");
    function toHexString(bytes) {
      return Buffer.from(bytes).toString("hex");
    }
    function fromHexString(hexString) {
      return Buffer.from(hexString, "hex");
    }
    function decStringToBigIntToUuid(value) {
      let hexStr = BigInt(value).toString(16);
      while (hexStr.length < 32)
        hexStr = "0" + hexStr;
      const buf = Buffer.from(hexStr, "hex");
      return (0, import_uuid2.stringify)(buf);
    }
    function uuidToBigInt(v) {
      const bytes = (0, import_uuid2.parse)(v);
      const hex = "0x" + Buffer.from(bytes).toString("hex");
      return BigInt(hex);
    }
    function numberToBigInt(v) {
      return BigInt(v);
    }
    function hexToBigInt(v) {
      if (!v.startsWith("0x")) {
        v = "0x" + v;
      }
      return BigInt(v);
    }
    function booleanToBigInt(v) {
      return BigInt(v ? 1 : 0);
    }
    var PSEUDONYM_TO_EMOJI = {
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0D\u1D0F\u0274\u1D0B\u1D07\u028F": "\u{1F412}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0299\u1D07\u1D00\u0280": "\u{1F43B}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D05\u1D1C\u1D04\u1D0B": "\u{1F986}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0F\u1D21\u029F": "\u{1F989}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u029C\u1D0F\u0280\uA731\u1D07": "\u{1F434}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0299\u1D07\u1D07": "\u{1F41D}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D21\u1D0F\u0280\u1D0D": "\u{1FAB1}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0299\u1D1C\u1D1B\u1D1B\u1D07\u0280\uA730\u029F\u028F": "\u{1F98B}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u0274\u1D00\u026A\u029F": "\u{1F40C}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D1B\u1D1C\u0280\u1D1B\u029F\u1D07": "\u{1F422}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u029F\u026A\u1D22\u1D00\u0280\u1D05": "\u{1F98E}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA730\u0280\u1D0F\u0262": "\u{1F438}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D1B \u0280\u1D07x": "\u{1F996}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0F\u1D04\u1D1B\u1D0F\u1D18\u1D1C\uA731": "\u{1F419}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u029C\u0280\u026A\u1D0D\u1D18": "\u{1F990}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u0280\u1D00\u0299": "\u{1F980}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA730\u026A\uA731\u029C": "\u{1F41F}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D05\u1D0F\u029F\u1D18\u029C\u026A\u0274": "\u{1F42C}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D21\u029C\u1D00\u029F\u1D07": "\u{1F433}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D22\u1D07\u0299\u0280\u1D00": "\u{1F993}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0F\u0280\u1D00\u0274\u0262\u1D1C\u1D1B\u1D00\u0274": "\u{1F9A7}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D07\u029F\u1D07\u1D18\u029C\u1D00\u0274\u1D1B": "\u{1F418}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D00\u1D0D\u1D07\u029F": "\u{1F42B}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0262\u026A\u0280\u1D00\uA730\uA730\u1D07": "\u{1F992}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0B\u1D00\u0274\u0262\u1D00\u0280\u1D0F\u1D0F": "\u{1F998}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D0F\u1D21": "\u{1F404}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u029C\u1D07\u1D07\u1D18": "\u{1F411}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D00\u1D1B": "\u{1F408}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u029C\u026A\u1D04\u1D0B\u1D07\u0274": "\u{1F413}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D18\u1D00\u0280\u0280\u1D0F\u1D1B": "\u{1F99C}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA730\u029F\u1D00\u1D0D\u026A\u0274\u0262\u1D0F": "\u{1F9A9}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u1D0B\u1D1C\u0274\u1D0B": "\u{1F9A8}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0280\u1D00\u1D04\u1D04\u1D0F\u1D0F\u0274": "\u{1F99D}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u029F\u1D0F\u1D1B\u029C": "\u{1F9A5}",
      "\u1D00\u0274\u1D0F\u0274 \u1D07. \u1D0D\u1D0F\u1D1C\uA731\u1D07": "\u{1F400}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u029C\u1D07\u1D05\u0262\u1D07\u029C\u1D0F\u0262": "\u{1F994}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u029F\u1D0F\u0262": "\u{1FAB5}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0D\u1D1C\uA731\u029C\u0280\u1D0F\u1D0F\u1D0D": "\u{1F344}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D00\u1D04\u1D1B\u1D1C\uA731": "\u{1F335}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \uA731\u1D1C\u0274\uA730\u029F\u1D0F\u1D21\u1D07\u0280": "\u{1F33B}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D0F\u0280\u0274": "\u{1F33D}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D18\u1D07\u1D00\u0274\u1D1C\u1D1B": "\u{1F95C}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u0299\u1D00\u0262\u1D1C\u1D07\u1D1B\u1D1B\u1D07": "\u{1F956}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D04\u1D00\u0274\u1D0F\u1D07": "\u{1F6F6}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u028F\u1D00\u1D0D": "\u{1F360}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D18\u1D1C\u1D0D\u1D18\u1D0B\u026A\u0274": "\u{1F383}",
      "\u1D00\u0274\u1D0F\u0274\u028F\u1D0D\u1D0F\u1D1C\uA731 \u1D0D\u1D0F\u1D0F\u0274": "\u{1F31A}"
    };
    function bigIntToPseudonymEmoji(input) {
      const key = Number(input % BigInt(Object.keys(PSEUDONYM_TO_EMOJI).length));
      return Object.values(PSEUDONYM_TO_EMOJI)[key];
    }
    function bigIntToPseudonymName(input) {
      const key = Number(input % BigInt(Object.keys(PSEUDONYM_TO_EMOJI).length));
      return Object.keys(PSEUDONYM_TO_EMOJI)[key];
    }
    function bigintToPseudonym(input) {
      return `${bigIntToPseudonymEmoji(input)} ${bigIntToPseudonymName(input)}`;
    }
    var import_js_sha256 = require_sha256();
    var BABY_JUB_NEGATIVE_ONE = BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495616"
    );
    function babyJubIsNegativeOne(value) {
      const bigintValue = BigInt(value);
      return bigintValue === BABY_JUB_NEGATIVE_ONE || bigintValue === BigInt(-1);
    }
    function generateSnarkMessageHash(signal) {
      return BigInt("0x" + (0, import_js_sha256.sha256)(signal)) >> BigInt(8);
    }
    function isFulfilled(result) {
      return result.status === "fulfilled";
    }
    function sleep(ms) {
      return __async2(this, null, function* () {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, ms != null ? ms : 1);
        });
      });
    }
    var import_js_sha2562 = require_sha256();
    function getMessageWatermark(message) {
      const hashed = (0, import_js_sha2562.sha256)(message).substring(0, 16);
      return BigInt("0x" + hashed);
    }
    function encodeAnonMessageIdAndReaction(anonMessageId, reaction) {
      return `REACT:${anonMessageId}:${reaction}`;
    }
    var getAnonTopicNullifier = () => {
      return BigInt("0x" + (0, import_js_sha2562.sha256)("anon_message").substring(0, 16));
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  SecretPhrasePCD: () => SecretPhrasePCD,
  SecretPhrasePCDPackage: () => SecretPhrasePCDPackage,
  SecretPhrasePCDTypeName: () => SecretPhrasePCDTypeName,
  checkProofInputs: () => checkProofInputs,
  deserialize: () => deserialize,
  getDisplayOptions: () => getDisplayOptions,
  getProveDisplayOptions: () => getProveDisplayOptions,
  init: () => init,
  isSecretPhrasePCD: () => isSecretPhrasePCD,
  phraseToBigints: () => phraseToBigints,
  prove: () => prove,
  serialize: () => serialize,
  snarkInputForProof: () => snarkInputForProof,
  usernameToBigint: () => usernameToBigint,
  verify: () => verify
});
module.exports = __toCommonJS(src_exports);

// src/SecretPhrasePCD.ts
var import_pcd_types = require("@pcd/pcd-types");
var import_util = __toESM(require_dist());
var import_groth16 = require("@zk-kit/groth16");
var import_uuid = require("uuid");

// artifacts/circuit.json
var circuit_default = {
  protocol: "groth16",
  curve: "bn128",
  nPublic: 2,
  vk_alpha_1: [
    "9526385790532871687215529217220873884227928931149809248336571282923313396106",
    "21514950079872959705810978772756325328244854949685521730808737769175706105020",
    "1"
  ],
  vk_beta_2: [
    [
      "20390368492886277093479380604774182574397340921248780260205596793295696674689",
      "2716993543496060298796733064727635793292506509085152491379209538220117158382"
    ],
    [
      "12682167178280460625448986307109874161659067512125256426557601527559613505029",
      "21764382463394824083591075546883615515682120102557591645420831661367465193367"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_gamma_2: [
    [
      "10857046999023057135944570762232829481370756359578518086990519993285655852781",
      "11559732032986387107991004021392285783925812861821192530917403151452391805634"
    ],
    [
      "8495653923123431417604973247489272438418190587263600148770280649306958101930",
      "4082367875863433681332203403145435568316851327593401208105741076214120093531"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_delta_2: [
    [
      "10906997380511376953049043930596140484928975373929750469282752765580878567599",
      "4101997915818703989480745681395641243754430031549478442656633631473459377754"
    ],
    [
      "14148267251354792026140554064990543520838005031627642915066139480082886598994",
      "21467614705199245308953952438252223903556487680113609709431051398494080793017"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_alphabeta_12: [
    [
      [
        "19924953674037883896271428602575690323853623267990409040589831553237208262188",
        "9321385585604328569146394173222424111899301556851408919706376422255002737936"
      ],
      [
        "1751896454046201622989931462958922166536631037207245141220963023196235803735",
        "20292585785847888135031199901727640523960971840655348045898263139715649493860"
      ],
      [
        "5446781505488328642549520307745542362726434681032117705980159574064339913266",
        "20665336076965191251070725469079726576750262538236769969035629514543990369554"
      ]
    ],
    [
      [
        "18810991372291172338238710874030800126142777500516924965046600933233303482410",
        "12062019029505540298724440861048717740962524199395385647479741209263862149617"
      ],
      [
        "1481203610798218482059801369834923818560843863835818188002762172113888121288",
        "421373448704976261018012513997133393245111569758178899482271740551882937334"
      ],
      [
        "17939363194547838185675404780272588604986297817735919104774977386402883380975",
        "11970795058328936879231284313869468162271625786608613880765645203894488402170"
      ]
    ]
  ],
  IC: [
    [
      "1481576207721992903324306469202784205263698883633483801846749476639749907908",
      "14079879823088619349409019686751314160916086276213976861320608433134023444236",
      "1"
    ],
    [
      "7383731686009945241890027660424753486806019510710608577959624978038477330556",
      "15989552492341906507948596904664651598249821034965897193817841304269401419658",
      "1"
    ],
    [
      "14560868027354574229864667972499776606845480756169309217438610379539610036620",
      "2229063762005447500484823201700247299911184494037799604681263211101013646192",
      "1"
    ]
  ]
};

// src/CardBody.tsx
var import_passport_ui = require("@pcd/passport-ui");
var import_styled_components = __toESM(require("styled-components"));
var import_jsx_runtime = require("react/jsx-runtime");
function SecretPhraseCardBody({ pcd }) {
  const isSecret = pcd.claim.secret ? false : true;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: 'PCD proving knowledge of a secret phrase for "The Word"' }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Separator, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Round Number" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.phraseId.toString() }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Username" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.username }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    !isSecret && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Secret Phrase" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.HiddenText, { text: pcd.claim.secret || "" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.Spacer, { h: 8 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Hash of the Secret Phrase" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.claim.secretHash.toString() })
  ] });
}
var Container = import_styled_components.default.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

// src/utils.ts
function phraseToBigints(phrase) {
  if (phrase.length > 180)
    throw Error("title too long: must be <= 180 characters");
  const chunks = [];
  for (let i = 0; i < 6; i++) {
    const start = i * 31;
    const end = (i + 1) * 31;
    let chunk;
    if (start >= phrase.length) {
      chunk = Buffer.alloc(31);
    } else if (end > phrase.length) {
      const partial = Buffer.from(phrase.slice(start), "utf-8");
      chunk = Buffer.concat([partial, Buffer.alloc(31 - partial.length)]);
    } else {
      chunk = Buffer.from(phrase.slice(start, end), "utf-8");
    }
    chunk = Buffer.concat([Buffer.alloc(1), chunk]);
    chunks.push(BigInt(`0x${chunk.toString("hex")}`));
  }
  return chunks;
}
function usernameToBigint(username) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(username);
  const hex = Buffer.from(encoded).toString("hex");
  return BigInt(`0x${hex}`);
}

// src/SecretPhrasePCD.ts
var SecretPhrasePCDTypeName = "secret-phrase-pcd";
var savedInitArgs = void 0;
var SecretPhrasePCD = class {
  constructor(id, claim, proof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
    this.type = SecretPhrasePCDTypeName;
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
};
function init(args) {
  return __async(this, null, function* () {
    savedInitArgs = args;
  });
}
function ensureInitialized() {
  return __async(this, null, function* () {
    if (!savedInitArgs) {
      throw new Error(
        "Cannot initialize SecretPhrasePCDPacakge: init has not been called yet"
      );
    }
    return savedInitArgs;
  });
}
function checkProofInputs(args) {
  const username = args.username.value;
  if (!username) {
    throw new Error("Cannot make The Word proof: missing username");
  } else if (username.length > 30) {
    throw new Error("Cannot make The Word proof: username too long (must be < 30 characters)");
  }
  const secret = args.secret.value;
  if (!secret) {
    throw new Error("Cannot make The Word proof: missing secret");
  } else if (secret.length > 180) {
    throw new Error("Cannot make The Word proof: secret too long (must be < 180 characters)");
  }
  const phraseId = args.phraseId.value;
  if (!phraseId) {
    throw new Error("Cannot make The Word proof: missing phraseId");
  }
  const includeSecret = args.includeSecret.value ? args.includeSecret.value : false;
  return { username, secret, phraseId: Number(phraseId), includeSecret };
}
function publicSignalsFromClaim(claim) {
  const hash = claim.secretHash;
  const username = usernameToBigint(claim.username).toString();
  return [hash, username];
}
function snarkInputForProof(username, secret) {
  const usernameBigint = usernameToBigint(username);
  const secretBigints = phraseToBigints(secret);
  return {
    username: usernameBigint.toString(),
    phrase: secretBigints.map((num) => num.toString())
  };
}
function prove(args) {
  return __async(this, null, function* () {
    const initArgs = yield ensureInitialized();
    const { username, secret, phraseId, includeSecret } = checkProofInputs(args);
    const snarkInput = snarkInputForProof(username, secret);
    const { proof, publicSignals } = yield (0, import_groth16.prove)(
      snarkInput,
      initArgs.wasmFilePath,
      initArgs.zkeyFilePath
    );
    const secretHash = publicSignals[0];
    const claim = {
      phraseId,
      username,
      secret: includeSecret ? secret : void 0,
      secretHash
    };
    return new SecretPhrasePCD((0, import_uuid.v4)(), claim, proof);
  });
}
function verify(pcd) {
  return __async(this, null, function* () {
    const publicSignals = publicSignalsFromClaim(pcd.claim);
    return yield (0, import_groth16.verify)(circuit_default, { publicSignals, proof: pcd.proof });
  });
}
function replacer(key, value) {
  if (key === "message") {
    return value.map((num) => num.toString(16));
  } else {
    return value;
  }
}
function reviver(key, value) {
  if (key === "message") {
    return value.map((str) => BigInt(`0x${str}`));
  } else {
    return value;
  }
}
function getProveDisplayOptions() {
  return {
    defaultArgs: {
      phraseId: {
        argumentType: import_pcd_types.ArgumentTypeName.Number,
        description: "The Round ID identifying the secret phrase"
      },
      username: {
        argumentType: import_pcd_types.ArgumentTypeName.String,
        description: "The username associated with this secret phrase proof"
      },
      secret: {
        argumentType: import_pcd_types.ArgumentTypeName.String,
        defaultVisible: false,
        description: "The secret phrase to prove knowledge of"
      },
      includeSecret: {
        argumentType: import_pcd_types.ArgumentTypeName.Boolean,
        description: "Set to true when storing in ZuPass and false when proving from zupass"
      }
    }
  };
}
function serialize(pcd) {
  return __async(this, null, function* () {
    return {
      type: SecretPhrasePCDTypeName,
      pcd: JSON.stringify(pcd, replacer)
    };
  });
}
function deserialize(serialized) {
  return __async(this, null, function* () {
    const { id, claim, proof } = JSON.parse(serialized, reviver);
    (0, import_util.requireDefinedParameter)(id, "id");
    (0, import_util.requireDefinedParameter)(claim, "claim");
    (0, import_util.requireDefinedParameter)(proof, "proof");
    return new SecretPhrasePCD(id, claim, proof);
  });
}
function getDisplayOptions(pcd) {
  return {
    header: `The Word: Secret Phrase #${pcd.claim.phraseId}`,
    displayName: `The Word: Secret Phrase #${pcd.claim.phraseId}`
  };
}
function isSecretPhrasePCD(pcd) {
  return pcd.type === SecretPhrasePCDTypeName;
}
var SecretPhrasePCDPackage = {
  name: SecretPhrasePCDTypeName,
  renderCardBody: SecretPhraseCardBody,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SecretPhrasePCD,
  SecretPhrasePCDPackage,
  SecretPhrasePCDTypeName,
  checkProofInputs,
  deserialize,
  getDisplayOptions,
  getProveDisplayOptions,
  init,
  isSecretPhrasePCD,
  phraseToBigints,
  prove,
  serialize,
  snarkInputForProof,
  usernameToBigint,
  verify
});
/*! Bundled license information:

js-sha256/src/sha256.js:
  (**
   * [js-sha256]{@link https://github.com/emn178/js-sha256}
   *
   * @version 0.10.1
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2014-2023
   * @license MIT
   *)
*/
