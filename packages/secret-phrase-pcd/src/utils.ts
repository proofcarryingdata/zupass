/**
 * Converts a given word to array of 6 field elements
 * 
 * @param phrase - the string entered by user to compute hash for (will be length checked)
 * @return - array of 6 bigints compatible with noir field element api
 */
export function phraseToBigints(phrase: string): Array<bigint> {
  // check length of title does not exceed spotify's requirements
  if (phrase.length > 180)
    throw Error('title too long: must be <= 180 characters');
  // convert to chunks of bytes
  const chunks: bigint[] = [];
  for (let i = 0; i < 6; i++) {
    const start = i * 31;
    const end = (i + 1) * 31;
    let chunk: Buffer;
    if (start >= phrase.length) {
      // if start is out of bounds, field element = 0
      chunk = Buffer.alloc(31);
    } else if (end > phrase.length) {
      // if end is out of bounds, pad front with 0's
      const partial = Buffer.from(phrase.slice(start), 'utf-8');
      chunk = Buffer.concat([partial, Buffer.alloc(31 - partial.length)]);
    } else {
      // chunk 31 bytes from the title string
      chunk = Buffer.from(phrase.slice(start, end), 'utf-8');
    }
    // pad an additional 0 to the front of the chunk
    chunk = Buffer.concat([Buffer.alloc(1), chunk]);
    // return as compatible hex string
    chunks.push(BigInt(`0x${chunk.toString('hex')}`));
  }
  return chunks;
}

/**
* Convers a utf-8 string (username) into a `bigint`
* 
* @param username - the string to convert to utf8 then decimal on bn254
* @returns - the username as a `bigint` compatible with a single bn254 field element (Fr)
*/
export function usernameToBigint(username: string): bigint {
  // encode utf8
  const encoder = new TextEncoder();
  const encoded = encoder.encode(username);
  // convert to bigint
  const hex = Buffer.from(encoded).toString('hex')
  return BigInt(`0x${hex}`);
}
