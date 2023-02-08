
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

const json = convertTokenToJSON("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJrYXkuci5nZW9yZ2VAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImdlb2lwX2NvdW50cnkiOiJVUyJ9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsidXNlcl9pZCI6InVzZXItWFYxVzNWbHJZdURqUVF4UWVuSVE0WW5SIn0sImlzcyI6Imh0dHBzOi8vYXV0aDAub3BlbmFpLmNvbS8iLCJzdWIiOiJhdXRoMHw2MmY3YWQ2YTNkZmQyNTQ2OTRiYjI3YzYiLCJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSIsImh0dHBzOi8vb3BlbmFpLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE2NzI5NTEwMTEsImV4cCI6MTY3MzU1NTgxMSwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvZmZsaW5lX2FjY2VzcyJ9")
console.log(findEmailInJSON(json))