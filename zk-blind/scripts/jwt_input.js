const fs = require('fs'); // Import the filesystem module
const { MAX_HEADER_PADDED_BYTES } = require('../helpers/constants');

function stringToAsciiArray(str) {
    // Create an empty array to store the ASCII values
    const asciiValues = [];
    const pad_len = 960;
  
    // Loop through each character in the string
    for (let i = 0; i < str.length; i++) {
      // Get the ASCII value of the current character and add it to the array
      asciiValues.push(str.charCodeAt(i).toString());
    }

    for(i = str.length; i < pad_len; i++) {
      asciiValues.push("0");
    }
  
    // Return the array of ASCII values
    return asciiValues;
  }

function stringToNonCharAsciiArray(str, div) {
  const arr_len = str.length/div; 
  return arr_len
  
}
function stringToAscii(str) {
    // Initialize an empty string to store the ASCII representation
  let ascii = '';

  // Loop through each character in the string
  for (let i = 0; i < str.length; i++) {
    // Get the ASCII value of the current character and append it to the string
    ascii += str.charCodeAt(i) + '';
  }

  // Return the ASCII representation
  return ascii;
}



function createTypeJson(msg) {
  m = stringToAsciiArray(msg)
  const data = {
    "msg": m
  }
  const jsonData = JSON.stringify(data)
  fs.writeFileSync('jwt_email.json', jsonData);
}

function pad(amt_left, array) {
  for (var i = 0; i <amt_left; i ++) {
    array.push("0")
  }

  return array;
}


// helper: get str representation of ASCII array
function AsciiArryToString(arr) {
  let str = ''
  for (let i = 0; i < arr.length; i++){
    str += String.fromCharCode(arr[i]);
  }
  return str
}

function convertTokenToJSON(token) {
  var json = Buffer.from(token, 'base64')
  return AsciiArryToString(json)
}

// finds email domain in JSON and returns index
function findEmailInJSON(json) {
  let domain_index
  let domain
  const email_regex = /([-a-zA-Z._+]+)@([-a-zA-Z]+).([a-zA-Z]+)/
  const match = json.match(email_regex)
  console.log(match)
  if (match) {
      domain = match[2] // [0] = whole group, then capture groups
      let email_index = match.index
      domain_index = match[0].indexOf(domain) + email_index
  }
  return { domain, domain_index }
}

function findPayload(token) {
  const period_idx = token.indexOf(".")
  return token.substring(period_idx + 1);
}

function createJWTJson(msg, mod, sig, addr, addr1) {
    message = stringToAsciiArray(msg)
    modulus = stringToAsciiArray(mod)
    domain = stringToAsciiArray()

    const data = {
        "message": pad(MAX_HEADER_PADDED_BYTES - message.length, message),
        "payload": pad(MAX_HEADER_PADDED_BYTES - payload.length, payload), 
        "modulus": modulus, 
        "signature": stringToAsciiArray(sig),
        "message_padded_bytes": message.length,
        "address": stringToAscii(addr), 
        "address_plus_one": stringToAscii(addr1), 
        "domain_idx": 140,
        "domain": pad(30 - domain.length, domain)
    }
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(data);

    // Write the JSON string to a file
    fs.writeFileSync('jwt.json', jsonData);

    console.log('JSON file created successfully');
    console.log(stringToNonCharAsciiArray(sig, 17))
}

createJWTJson(
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJzZWh5dW5AYmVya2VsZXkuZWR1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImdlb2lwX2NvdW50cnkiOiJVUyJ9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsidXNlcl9pZCI6InVzZXIta1dMaXBzT3dMZFd4MXdMc0I3clR3UnFlIn0sImlzcyI6Imh0dHBzOi8vYXV0aDAub3BlbmFpLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNjYwOTg2MjEwMzkxMTMwNjgwNyIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTY3MzE1NTQ0NiwiZXhwIjoxNjczNzYwMjQ2LCJhenAiOiJUZEpJY2JlMTZXb1RIdE45NW55eXdoNUU0eU9vNkl0RyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgbW9kZWwucmVhZCBtb2RlbC5yZXF1ZXN0IG9yZ2FuaXphdGlvbi5yZWFkIG9mZmxpbmVfYWNjZXNzIn0",
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA27rOErDOPvPc3mOADYtQBeenQm5NS5VHVaoO/Zmgsf1M0Wa/2WgLm9jX65Ru/K8Az2f4MOdpBxxLL686ZS+K7eJC/oOnrxCRzFYBqQbYo+JMeqNkrCn34yed4XkX4ttoHi7MwCEpVfb05Qf/ZAmNI1XjecFYTyZQFrd9LjkX6lr05zY6aM/+MCBNeBWp35pLLKhiq9AieB1wbDPcGnqxlXuU/bLgIyqUltqLkr9JHsf/2T4VrXXNyNeQyBq5wjYlRkpBQDDDNOcdGpx1buRrZ2hFyYuXDRrMcR6BQGC0ur9hI5obRYlchDFhlb0ElsJ2bshDDGRk5k3doHqbhj2IgQIDAQAB",
    "mLCysHQtDftfFey4F-ntFma22r5-qpxtkXsiDw6TY30Tnoj2kPQ_YdSjzagrwRgF7pHE8SSM_roo2wDh3c_8vDNRZeax4VICZjYmPS-3ZWAV0XyjjlgWgFleTqVT72M-VlPCdecHiYQJojlYHJyGybvTCaX1cqoF9aAMy8wBvRbSceECmX15k4nKG51Z5Le7k_vOShaxYmwrRhMIip4KRv-DW1FXAdi_F-MYSrqZ6Oq-nglMujxD2NOoHoqOqmyd1OMIrc6oIRuRqBXlRnQ0IdUDQbiXfyFVC0ItIME3a4SLoWp_rrmY1tSrGJu93MZrjhzfkNglJ-FOp4kKZAKkzA",
    "0x0ACBa2baA02F59D8a3d738d97008f909fB92e9FB",
    "0x0ACBa2baA02F59D8a3d738d97008f909fB92e9FB"
)
