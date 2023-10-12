"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  constants: () => constants_exports,
  helpers: () => helpers_exports,
  module: () => engine_module_exports
});
module.exports = __toCommonJS(src_exports);

// src/engine-module.ts
var engine_module_exports = {};
__export(engine_module_exports, {
  getFloatToVecU64: () => getFloatToVecU64,
  getGenWitness: () => getGenWitness,
  getInit: () => getInit,
  getPoseidonHash: () => getPoseidonHash,
  getProve: () => getProve,
  getVerify: () => getVerify
});
function getFloatToVecU64() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const floatToVecU64 = module2.floatToVecU64;
      return floatToVecU64;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}
function getGenWitness() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const genWitness = module2.genWitness;
      return genWitness;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}
function getProve() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const init = module2.prove;
      return init;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}
function getPoseidonHash() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const poseidonHash = module2.poseidonHash;
      return poseidonHash;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}
function getInit() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const init = module2.default;
      return init;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}
function getVerify() {
  return __async(this, null, function* () {
    try {
      const module2 = yield import("@ezkljs/engine/web/ezkl");
      const verify = module2.verify;
      return verify;
    } catch (err) {
      console.error("Failed to import module:", err);
    }
  });
}

// src/helpers.ts
var helpers_exports = {};
__export(helpers_exports, {
  base64ToUint8ClampedArray: () => base64ToUint8ClampedArray,
  stringToFloat: () => stringToFloat,
  stringToUint8ClampedArray: () => stringToUint8ClampedArray,
  unit8ArrayToJsonObect: () => unit8ArrayToJsonObect
});
var import_json_bigint = __toESM(require("json-bigint"));
function stringToFloat(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString();
  }
  return parseFloat(result);
}
function unit8ArrayToJsonObect(uint8Array) {
  let string = new TextDecoder().decode(uint8Array);
  let jsonObject = import_json_bigint.default.parse(string);
  return jsonObject;
}
function stringToUint8ClampedArray(str) {
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}
function base64ToUint8ClampedArray(base64) {
  const str = atob(base64);
  return stringToUint8ClampedArray(str);
}

// src/constants.ts
var constants_exports = {};
__export(constants_exports, {
  CHUNK_SIZE: () => CHUNK_SIZE,
  FRAME_RATE: () => FRAME_RATE,
  PASSPORT_SERVER_DOMAIN: () => PASSPORT_SERVER_DOMAIN,
  SET_SERVER_DOMAIN: () => SET_SERVER_DOMAIN,
  WASM_PATH: () => WASM_PATH
});
var isProd = process.env.NODE_ENV === "production";
var SET_SERVER_DOMAIN = isProd ? "https://set-membership-server.onrender.com" : "http://127.0.0.1:8000";
var PASSPORT_SERVER_DOMAIN = isProd ? "https://passport-server-rygt.onrender.com" : "http://localhost:3002";
console.log("PASSPORT_SERVER_DOMAIN", PASSPORT_SERVER_DOMAIN);
console.log("SET_SERVER_DOMAIN", SET_SERVER_DOMAIN);
var WASM_PATH = "/ezkl-artifacts/ezkl_bg.wasm";
var CHUNK_SIZE = 400;
var FRAME_RATE = 200;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  constants,
  helpers,
  module
});
