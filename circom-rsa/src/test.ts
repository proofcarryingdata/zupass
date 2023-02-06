import { getCircuitInputs } from "./helpers/groupSignature/sign";

const inputs = getCircuitInputs(
  `-----BEGIN SSH SIGNATURE-----
U1NIU0lHAAAAAQAAAZcAAAAHc3NoLXJzYQAAAAMBAAEAAAGBALj50d1YOLPsQ6wZlOfLck
6I0g0THl/zDSOTIUgS1pujBmMdfrc6tIga7ZY3fnl1yqyy0HwWINaCJV3X59jysO3ngDTj
PSZLQfGCxsyfYltpnu+V1erGQkd0zWnoEBsTcmc6Hjg0KHszJ9BUPtBqxpn/jSa/78soCW
lLhTKsMPS7NW0CBJn7fv1wMuhnL0QwdhvmYtbdKr1bPzWN1bW5A8NTPZiQxnaM5qERPWfX
li3TeY6oXyTroC7Nu3xmZLrM4koBgvioB1BmEyi6OIx/xa/LHbJTTVdZa4eILdueKOcWkL
OZ6oAWbl1AZiacV74ohyfGJvaXybC+qchONGjYXq4xvk937EJ/hBD+Tdp9Vo+SYfkWKhwM
0ViKRQLXtBp5oQdM2VmLGud6rsFkIF5Qmq5I8DzgJXUbZ47nwq9Ld3fTLzS3g82MHKq3gf
F1p+sk5e4AU3CNW8O3+2m4KHcKlgQO0IoF3UOS5PkVULfxBINvq0ZSQsKQIaBk76Tw5HsV
XwAAABBkb3VibGUtYmxpbmQueHl6AAAAAAAAAAZzaGE1MTIAAAGUAAAADHJzYS1zaGEyLT
UxMgAAAYBu3zQGAYC0MIRDOW35dPH2DgX2nMVmeYtEjP4/egmXMx8tBitk+YwUaxvrRsMm
ZCXUu7/eQGduIBnsr8My43c5LecBCoKBo0p2cTeylJ0GRVHYc5xwCAD71RHI1ukt5+rJKe
VZhlm+H76pwAfwyPZ/zekJbRwnG0Dvgxu8Z7WXop/S01C+F9dK8z+OutVrjBB501yjAjGJ
3XcJEnXh+o02SzczUQuLPRpAPZGS1X88m1aDs51aHdvJ0ov/vWMugqupTavUp3dR7OG5xh
rnXjzHPAbZOqipr1LwyOt4sO0QabAI6+FfOwlhDbyiHWh7GhOP0mVawOVTgc+umtMxDqfX
UHE6xQ3AT8cxV+XGH16q+BG2g4ltMmzN4WVfBOWkYfcvkZfGJXusLuGEiWbczWY7ClDmAB
5+7yaI3Yb9tnIRG2HC++WroeE+EVYvQavWAZPTy8JT5UDguK2XI8E5etXIgVQ/+V9r+9DD
i3yoEGnUg4RrWE5x04AZG2dX3vovLlE=
-----END SSH SIGNATURE-----
`,
  {
    message: "",
    enableSignerId: false,
    groupIdentifier: "",
    groupName: "asdf",
    signerNamespace: "asdf",
  }
);

async function test() {
  let result = await inputs;
  console.log(result);
}

test();
