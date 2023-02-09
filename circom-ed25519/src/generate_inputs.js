/**
 * 
 * msg is the data for the signature

R8 is the first 256 bits of the signature (LSB to MSB)

S is the first 255 bits of the last 256 bits of the signature (LSB to MSB)

A is the public key in binary (LSB to MSB)

PointA is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)

PointR is the point representing the R8 value on the elliptic curve (encoded in base 2^85)
 */

function hex2bin(hex){
  hex = hex.replace("0x", "").toLowerCase();
  var out = "";
  for(var c of hex) {
      switch(c) {
          case '0': out += "0000"; break;
          case '1': out += "0001"; break;
          case '2': out += "0010"; break;
          case '3': out += "0011"; break;
          case '4': out += "0100"; break;
          case '5': out += "0101"; break;
          case '6': out += "0110"; break;
          case '7': out += "0111"; break;
          case '8': out += "1000"; break;
          case '9': out += "1001"; break;
          case 'a': out += "1010"; break;
          case 'b': out += "1011"; break;
          case 'c': out += "1100"; break;
          case 'd': out += "1101"; break;
          case 'e': out += "1110"; break;
          case 'f': out += "1111"; break;
          default: return "";
      }
  }

  return out;
}

const fs = require("fs");

const message = fs.readFileSync("../signatures/file_to_sign.txt").toString(); 
const signature = fs.readFileSync("../signatures/file_to_sign.ed25519.sig.txt").toString();

const execdRegex = /-----BEGIN SSH SIGNATURE-----\n((?:.|\n)*)-----END SSH SIGNATURE-----/g.exec(signature);
console.log(execdRegex);
const signatureBase64 = execdRegex[1].replace(/\n/g, "");
const sigBuffer = Buffer.from(signatureBase64, "base64");

const binary = hex2bin(sigBuffer.toString("hex"));


console.log("---")
console.log(binary)
console.log("---")
console.log(`message: ${message}`);
console.log(`signature: ${signature}`);
