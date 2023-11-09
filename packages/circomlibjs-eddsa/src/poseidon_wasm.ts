// https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/src/poseidon_wasm.js
import poseidonConstants from "./poseidon_constants_opt";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { F1Field, Scalar, getCurveFromName } = require("ffjavascript");

export async function buildPoseidon() {
  const bn128 = await getCurveFromName("bn128", true, buildPoseidonWasm);

  const F = bn128.Fr;

  const pState = bn128.tm.alloc(32);
  const pIn = bn128.tm.alloc(32 * 16);
  const pOut = bn128.tm.alloc(32 * 17);

  const poseidon = (arr: any, state: any, nOut: any) => {
    let buff;
    let n;
    if (Array.isArray(arr)) {
      n = arr.length;
      buff = new Uint8Array(n * 32);
      for (let i = 0; i < n; i++) buff.set(F.e(arr[i]), i * 32);
    } else {
      buff = arr;
      n = buff.byteLength / 32;
      if (n * 32 != buff.byteLength) throw new Error("Invalid iput buff size");
    }
    bn128.tm.setBuff(pIn, buff);

    if (n < 1 || n > 16) throw new Error("Invalid poseidon size");

    if (typeof state == "undefined") {
      state = F.zero;
    } else {
      state = F.e(state);
    }
    bn128.tm.setBuff(pState, state);
    nOut = nOut || 1;

    bn128.tm.instance.exports.poseidon(pState, pIn, n, pOut, nOut);
    if (nOut == 1) {
      return bn128.tm.getBuff(pOut, 32);
    } else {
      const out = [];
      for (let i = 0; i < nOut; i++) {
        out.push(bn128.tm.getBuff(pOut + i * 32, 32));
      }
      return out;
    }
  };

  poseidon.F = F;
  return poseidon;
}

export function buildPoseidonWasm(module: any) {
  const F = new F1Field(
    Scalar.e(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617"
    )
  );

  const N_ROUNDS_P = [
    56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68
  ];
  const NSizes = poseidonConstants.C.length;
  const buffIdx = new Uint8Array(NSizes * 5 * 4);
  const buffIdx32 = new Uint32Array(buffIdx.buffer);
  for (let i = 0; i < NSizes; i++) {
    buffIdx32[i * 5] = N_ROUNDS_P[i];
    const buffC = new Uint8Array(32 * poseidonConstants.C[i].length);
    for (let j = 0; j < poseidonConstants.C[i].length; j++) {
      F.toRprLEM(buffC, j * 32, F.e(poseidonConstants.C[i][j]));
    }
    buffIdx32[i * 5 + 1] = module.alloc(buffC);

    const buffS = new Uint8Array(32 * poseidonConstants.S[i].length);
    for (let j = 0; j < poseidonConstants.S[i].length; j++) {
      F.toRprLEM(buffS, j * 32, F.e(poseidonConstants.S[i][j]));
    }
    buffIdx32[i * 5 + 2] = module.alloc(buffS);

    const N = poseidonConstants.M[i].length;
    const buffM = new Uint8Array(32 * N * N);
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        F.toRprLEM(buffM, (j * N + k) * 32, F.e(poseidonConstants.M[i][k][j]));
      }
    }
    buffIdx32[i * 5 + 3] = module.alloc(buffM);

    const buffP = new Uint8Array(32 * N * N);
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        F.toRprLEM(buffP, (j * N + k) * 32, F.e(poseidonConstants.P[i][k][j]));
      }
    }
    buffIdx32[i * 5 + 4] = module.alloc(buffP);
  }

  const pConstants = module.alloc(buffIdx);
  const pState = module.alloc(32 * ((NSizes + 1) * 32));

  function buildAddConstant() {
    const f = module.addFunction("poseidon_addConstant");
    f.addParam("t", "i32");
    f.addParam("pC", "i32");
    f.setReturnType("i32");
    f.addLocal("i", "i32");
    f.addLocal("pState", "i32");

    const c = f.getCodeBuilder();

    f.addCode(
      c.setLocal("pState", c.i32_const(pState)),
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call(
            "frm_add",
            c.getLocal("pC"),
            c.getLocal("pState"),
            c.getLocal("pState")
          ),
          c.setLocal("pC", c.i32_add(c.getLocal("pC"), c.i32_const(32))),
          c.setLocal(
            "pState",
            c.i32_add(c.getLocal("pState"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),
      c.ret(c.getLocal("pC"))
    );
  }

  function buildPower5() {
    const f = module.addFunction("poseidon_power5");
    f.addParam("p", "i32");

    const c = f.getCodeBuilder();

    const AUX = c.i32_const(module.alloc(32));

    f.addCode(
      c.call("frm_square", c.getLocal("p"), AUX),
      c.call("frm_square", AUX, AUX),
      c.call("frm_mul", c.getLocal("p"), AUX, c.getLocal("p"))
    );
  }

  function buildPower5all() {
    const f = module.addFunction("poseidon_power5all");
    f.addParam("t", "i32");
    f.addLocal("i", "i32");
    f.addLocal("pState", "i32");

    const c = f.getCodeBuilder();

    f.addCode(
      c.setLocal("pState", c.i32_const(pState)),
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call("poseidon_power5", c.getLocal("pState")),
          c.setLocal(
            "pState",
            c.i32_add(c.getLocal("pState"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      )
    );
  }

  function buildApplyMatrix() {
    const f = module.addFunction("poseidon_applyMatrix");
    f.addParam("t", "i32");
    f.addParam("pM", "i32");
    f.addLocal("i", "i32");
    f.addLocal("j", "i32");
    f.addLocal("pState", "i32");
    f.addLocal("pStateAux", "i32");

    const c = f.getCodeBuilder();

    const pStateAux = module.alloc(32 * ((NSizes + 1) * 32));

    const pAux = module.alloc(32);

    f.addCode(
      c.setLocal("pStateAux", c.i32_const(pStateAux)),
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call("frm_zero", c.getLocal("pStateAux")),
          c.setLocal("pState", c.i32_const(pState)),
          c.setLocal("j", c.i32_const(0)),
          c.block(
            c.loop(
              c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("t"))),
              c.call(
                "frm_mul",
                c.getLocal("pState"),
                c.getLocal("pM"),
                c.i32_const(pAux)
              ),
              c.call(
                "frm_add",
                c.i32_const(pAux),
                c.getLocal("pStateAux"),
                c.getLocal("pStateAux")
              ),
              c.setLocal("pM", c.i32_add(c.getLocal("pM"), c.i32_const(32))),
              c.setLocal(
                "pState",
                c.i32_add(c.getLocal("pState"), c.i32_const(32))
              ),
              c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
              c.br(0)
            )
          ),
          c.setLocal(
            "pStateAux",
            c.i32_add(c.getLocal("pStateAux"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),
      c.setLocal("pStateAux", c.i32_const(pStateAux)),
      c.setLocal("pState", c.i32_const(pState)),
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call("frm_copy", c.getLocal("pStateAux"), c.getLocal("pState")),
          c.setLocal(
            "pState",
            c.i32_add(c.getLocal("pState"), c.i32_const(32))
          ),
          c.setLocal(
            "pStateAux",
            c.i32_add(c.getLocal("pStateAux"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      )
    );
  }

  function buildApplySMatrix() {
    const f = module.addFunction("poseidon_applySMatrix");
    f.addParam("t", "i32");
    f.addParam("pS", "i32");
    f.setReturnType("i32");
    f.addLocal("i", "i32");
    f.addLocal("pState", "i32");

    const c = f.getCodeBuilder();

    const pS0 = module.alloc(32);
    const pAux = module.alloc(32);

    f.addCode(
      c.call("frm_zero", c.i32_const(pS0)),
      c.setLocal("pState", c.i32_const(pState)),
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call(
            "frm_mul",
            c.getLocal("pState"),
            c.getLocal("pS"),
            c.i32_const(pAux)
          ),
          c.call(
            "frm_add",
            c.i32_const(pS0),
            c.i32_const(pAux),
            c.i32_const(pS0)
          ),
          c.setLocal("pS", c.i32_add(c.getLocal("pS"), c.i32_const(32))),
          c.setLocal(
            "pState",
            c.i32_add(c.getLocal("pState"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),

      c.setLocal("pState", c.i32_const(pState + 32)),
      c.setLocal("i", c.i32_const(1)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("t"))),
          c.call(
            "frm_mul",
            c.i32_const(pState),
            c.getLocal("pS"),
            c.i32_const(pAux)
          ),
          c.call(
            "frm_add",
            c.getLocal("pState"),
            c.i32_const(pAux),
            c.getLocal("pState")
          ),
          c.setLocal("pS", c.i32_add(c.getLocal("pS"), c.i32_const(32))),
          c.setLocal(
            "pState",
            c.i32_add(c.getLocal("pState"), c.i32_const(32))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),
      c.call("frm_copy", c.i32_const(pS0), c.i32_const(pState)),
      c.ret(c.getLocal("pS"))
    );
  }

  function buildPoseidon() {
    const f = module.addFunction("poseidon");
    f.addParam("pInitState", "i32");
    f.addParam("pIn", "i32");
    f.addParam("n", "i32");
    f.addParam("pOut", "i32");
    f.addParam("nOut", "i32");
    f.addLocal("pC", "i32");
    f.addLocal("pS", "i32");
    f.addLocal("pM", "i32");
    f.addLocal("pP", "i32");
    f.addLocal("t", "i32");
    f.addLocal("i", "i32");
    f.addLocal("nRoundsP", "i32");
    f.addLocal("pAux", "i32");

    const c = f.getCodeBuilder();

    f.addCode(
      c.setLocal("t", c.i32_add(c.getLocal("n"), c.i32_const(1))),
      c.setLocal(
        "pAux",
        c.i32_add(
          c.i32_const(pConstants),
          c.i32_mul(c.i32_sub(c.getLocal("n"), c.i32_const(1)), c.i32_const(20))
        )
      ),
      c.setLocal("nRoundsP", c.i32_load(c.getLocal("pAux"))),
      c.setLocal(
        "pC",
        c.i32_load(c.i32_add(c.getLocal("pAux"), c.i32_const(4)))
      ),
      c.setLocal(
        "pS",
        c.i32_load(c.i32_add(c.getLocal("pAux"), c.i32_const(8)))
      ),
      c.setLocal(
        "pM",
        c.i32_load(c.i32_add(c.getLocal("pAux"), c.i32_const(12)))
      ),
      c.setLocal(
        "pP",
        c.i32_load(c.i32_add(c.getLocal("pAux"), c.i32_const(16)))
      ),

      // Initialize state
      c.call("frm_zero", c.i32_const(pState)),
      c.call("frm_copy", c.getLocal("pInitState"), c.i32_const(pState)),
      c.setLocal("i", c.i32_const(1)),
      c.block(
        c.loop(
          c.call(
            "frm_copy",
            c.i32_add(
              c.getLocal("pIn"),
              c.i32_mul(
                c.i32_sub(c.getLocal("i"), c.i32_const(1)),
                c.i32_const(32)
              )
            ),
            c.i32_add(
              c.i32_const(pState),
              c.i32_mul(c.getLocal("i"), c.i32_const(32))
            )
          ),
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("n"))),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),

      // Initialize state
      c.setLocal(
        "pC",
        c.call("poseidon_addConstant", c.getLocal("t"), c.getLocal("pC"))
      ),
      // First full rounds
      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.i32_const(3))),
          c.call("poseidon_power5all", c.getLocal("t")),
          c.setLocal(
            "pC",
            c.call("poseidon_addConstant", c.getLocal("t"), c.getLocal("pC"))
          ),
          c.call("poseidon_applyMatrix", c.getLocal("t"), c.getLocal("pM")),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),

      c.call("poseidon_power5all", c.getLocal("t")),
      c.setLocal(
        "pC",
        c.call("poseidon_addConstant", c.getLocal("t"), c.getLocal("pC"))
      ),
      c.call("poseidon_applyMatrix", c.getLocal("t"), c.getLocal("pP")),

      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("nRoundsP"))),
          c.call("poseidon_power5", c.i32_const(pState)),
          c.call(
            "frm_add",
            c.i32_const(pState),
            c.getLocal("pC"),
            c.i32_const(pState)
          ),
          c.setLocal("pC", c.i32_add(c.getLocal("pC"), c.i32_const(32))),
          c.setLocal(
            "pS",
            c.call("poseidon_applySMatrix", c.getLocal("t"), c.getLocal("pS"))
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),

      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.i32_const(3))),
          c.call("poseidon_power5all", c.getLocal("t")),
          c.setLocal(
            "pC",
            c.call("poseidon_addConstant", c.getLocal("t"), c.getLocal("pC"))
          ),
          c.call("poseidon_applyMatrix", c.getLocal("t"), c.getLocal("pM")),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      ),
      c.call("poseidon_power5all", c.getLocal("t")),
      c.call("poseidon_applyMatrix", c.getLocal("t"), c.getLocal("pM")),

      c.setLocal("i", c.i32_const(0)),
      c.block(
        c.loop(
          c.br_if(1, c.i32_eq(c.getLocal("i"), c.getLocal("nOut"))),
          c.call(
            "frm_copy",
            c.i32_add(
              c.i32_const(pState),
              c.i32_mul(c.getLocal("i"), c.i32_const(32))
            ),
            c.i32_add(
              c.getLocal("pOut"),
              c.i32_mul(c.getLocal("i"), c.i32_const(32))
            )
          ),
          c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
          c.br(0)
        )
      )
    );
  }

  buildAddConstant();
  buildPower5();
  buildPower5all();
  buildApplyMatrix();
  buildApplySMatrix();

  buildPoseidon();
  module.exportFunction("poseidon");
}
