# ProtoPODGPC Circuit Parameters

The files `paramGen.json` and `testParamGen.json` contain lists of circuit parameters for the production and test artifacts for ProtoPODGPC. These are used to generate the parameter-cost pairs required for GPC circuit selection. Should any of these change, run `yarn gen-circuit-parameters` and/or `yarn gen-circuit-parameters test`. To generate the corresponding artifacts, run `yarn gen-artifacts` and/or `yarn gen-artifacts test`.
