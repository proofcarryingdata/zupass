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
  EzklSecretPCD: () => EzklSecretPCD,
  EzklSecretPCDPackage: () => EzklSecretPCDPackage,
  EzklSecretPCDTypeName: () => EzklSecretPCDTypeName,
  deserialize: () => deserialize,
  getDisplayOptions: () => getDisplayOptions,
  prove: () => prove,
  serialize: () => serialize,
  verify: () => verify
});
module.exports = __toCommonJS(src_exports);

// src/EzklSecretPCD.ts
var import_json_bigint = __toESM(require("json-bigint"));
var import_uuid = require("uuid");

// src/CardBody.tsx
var import_passport_ui = require("@pcd/passport-ui");
var import_styled_components = __toESM(require("styled-components"));
var import_jsx_runtime = require("react/jsx-runtime");
function EzklSecretCardBody({ pcd }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Container, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.FieldLabel, { children: "Secret" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_passport_ui.TextContainer, { children: pcd.proof.clearSecret })
  ] });
}
var Container = import_styled_components.default.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

// src/EzklSecretPCD.ts
var import_ezkl_lib = require("@pcd/ezkl-lib");
var { stringToFloat, unit8ArrayToJsonObect } = import_ezkl_lib.helpers;
var { getFloatToVecU64, getPoseidonHash, getInit } = import_ezkl_lib.module;
var { SET_SERVER_DOMAIN, WASM_PATH } = import_ezkl_lib.constants;
var EzklSecretPCDTypeName = "ezkl-secret-pcd";
var EzklSecretPCD = class {
  constructor(id, claim, proof) {
    this.type = EzklSecretPCDTypeName;
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
};
function prove(args) {
  return __async(this, null, function* () {
    const ROUTE = "/public";
    const url = `${SET_SERVER_DOMAIN}${ROUTE}/`;
    if (!args.secret.value || args.secret.value === "") {
      throw new Error("Secret is required");
    }
    const init = yield getInit();
    if (!init) {
      throw new Error("Init not found");
    }
    yield init(
      WASM_PATH,
      new WebAssembly.Memory({ initial: 20, maximum: 1024, shared: true })
    );
    const settingsResp = yield fetch(url + "settings.json");
    if (!settingsResp.ok) {
      throw new Error("Failed to fetch settings.json");
    }
    const settingsBuf = yield settingsResp.arrayBuffer();
    const settings = new Uint8ClampedArray(settingsBuf);
    const settingsObj = unit8ArrayToJsonObect(new Uint8Array(settings));
    const scale = settingsObj.run_args.input_scale;
    const float = stringToFloat(args.secret.value);
    const floatToVecU64 = yield getFloatToVecU64();
    if (!floatToVecU64) {
      throw new Error("Float to vec u64 not found");
    }
    const u64Ser = floatToVecU64(float, scale);
    const u64Output = unit8ArrayToJsonObect(new Uint8Array(u64Ser.buffer));
    const u64Array = [u64Output];
    const string = import_json_bigint.default.stringify(u64Array);
    const buffer = new TextEncoder().encode(string);
    const u64sOutputSer = new Uint8ClampedArray(buffer.buffer);
    const poseidonHash = yield getPoseidonHash();
    if (!poseidonHash) {
      throw new Error("Poseidon hash not found");
    }
    const hash = yield poseidonHash(u64sOutputSer);
    const decodedHash = new TextDecoder().decode(new Uint8Array(hash));
    yield fetch(`${SET_SERVER_DOMAIN}/add_number`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: decodedHash
    });
    const claim = { hash };
    const proof = { clearSecret: args.secret.value };
    return new EzklSecretPCD((0, import_uuid.v4)(), claim, proof);
  });
}
function verify(pcd) {
  return __async(this, null, function* () {
    return true;
  });
}
function serialize(pcd) {
  return __async(this, null, function* () {
    return {
      type: EzklSecretPCDTypeName,
      pcd: (0, import_json_bigint.default)().stringify(pcd)
    };
  });
}
function deserialize(serialized) {
  return __async(this, null, function* () {
    return (0, import_json_bigint.default)().parse(serialized);
  });
}
function getDisplayOptions(pcd) {
  return {
    header: "Ezkl Secret PCD",
    // displayName: "ezkl-secret-" + pcd.id.substring(0, 4)
    displayName: "ezkl-secret-" + pcd.id.substring(0, 4)
  };
}
var EzklSecretPCDPackage = {
  name: EzklSecretPCDTypeName,
  renderCardBody: EzklSecretCardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EzklSecretPCD,
  EzklSecretPCDPackage,
  EzklSecretPCDTypeName,
  deserialize,
  getDisplayOptions,
  prove,
  serialize,
  verify
});
