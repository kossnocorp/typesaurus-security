/**
 * https://firebase.google.com/docs/reference/rules/rules.Bytes
 */

import { proxy } from '..'

export type Bytes = {
  /**
   * Returns the number of bytes in a Bytes sequence.
   * https://firebase.google.com/docs/reference/rules/rules.Bytes#size
   */
  size(): number

  /**
   * Returns the Base64-encoded string corresponding to the provided Bytes sequence.
   * https://firebase.google.com/docs/reference/rules/rules.Bytes#toBase64
   */
  toBase64(): string

  /**
   * Returns the hexadecimal-encoded string corresponding to the provided Bytes sequence.
   * https://firebase.google.com/docs/reference/rules/rules.Bytes#toHexString
   */
  toHexString(): string
}

export function bytes(str: string) {
  // TODO: How to stringify byte sequences? (b'\342\202\254')
  return proxy<Bytes>(`b'${str}'`)
}
