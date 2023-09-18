import download from "download";

const artifactsURL = "https://artifacts.pcdpass.xyz";
const packageNames = ["zk-eddsa-ticket-pcd"];

packageNames.map((packageName) => {
  download(
    `${artifactsURL}/${packageName}/latest/circuit.zkey`,
    `public/artifacts/${packageName}`
  );
  download(
    `${artifactsURL}/${packageName}/latest/circuit.wasm`,
    `public/artifacts/${packageName}`
  );
});
