"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Emitter: () => Emitter
});
module.exports = __toCommonJS(src_exports);

// src/emitter.ts
var Emitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
  }
  listen(l) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit(t) {
    for (const listener of this.listeners) {
      listener(t);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Emitter
});
