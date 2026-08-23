## :toolbox: Functions

- [rotr32](#gear-rotr32)
- [rotl32](#gear-rotl32)
- [stringToBytes](#gear-stringtobytes)
- [bytesToString](#gear-bytestostring)
- [bytesToHex](#gear-bytestohex)
- [hexToBytes](#gear-hextobytes)
- [constantTimeCompare](#gear-constanttimecompare)
- [generateRandomHex](#gear-generaterandomhex)
- [generateKey](#gear-generatekey)
- [generateIV](#gear-generateiv)
- [generateSalt](#gear-generatesalt)
- [speckExpandKey](#gear-speckexpandkey)
- [speckEncryptBlock](#gear-speckencryptblock)
- [speckCTR](#gear-speckctr)
- [blake2s](#gear-blake2s)
- [deriveKey](#gear-derivekey)
- [encryptText](#gear-encrypttext)
- [decryptText](#gear-decrypttext)

### :gear: rotr32

Rotate right (32-bit unsigned)

| Function | Type |
| ---------- | ---------- |
| `rotr32` | `(x: number, n: number) => number` |

### :gear: rotl32

Rotate left (32-bit unsigned)

| Function | Type |
| ---------- | ---------- |
| `rotl32` | `(x: number, n: number) => number` |

### :gear: stringToBytes

Converts a UTF-8 string into an array of byte values (0-255)

| Function | Type |
| ---------- | ---------- |
| `stringToBytes` | `(str: string) => number[]` |

### :gear: bytesToString

Converts an array of byte values (0-255) into a UTF-8 string

| Function | Type |
| ---------- | ---------- |
| `bytesToString` | `(bytes: number[]) => string` |

### :gear: bytesToHex

Converts byte array to Hex string

| Function | Type |
| ---------- | ---------- |
| `bytesToHex` | `(bytes: number[]) => string` |

### :gear: hexToBytes

Converts Hex string to byte array

| Function | Type |
| ---------- | ---------- |
| `hexToBytes` | `(hex: string) => number[]` |

### :gear: constantTimeCompare

Compares two strings in constant time to prevent timing attacks

| Function | Type |
| ---------- | ---------- |
| `constantTimeCompare` | `(a: string, b: string) => boolean` |

### :gear: generateRandomHex

Generates pseudo-random hex string of specified byte length

| Function | Type |
| ---------- | ---------- |
| `generateRandomHex` | `(byteCount: number) => string` |

### :gear: generateKey

Generates a 128-bit (16-byte) random hex key suitable for SPECK-64/128

| Function | Type |
| ---------- | ---------- |
| `generateKey` | `() => string` |

### :gear: generateIV

Generates a 64-bit (8-byte) random hex IV suitable for SPECK-64/128 CTR

| Function | Type |
| ---------- | ---------- |
| `generateIV` | `() => string` |

### :gear: generateSalt

Generates a 128-bit (16-byte) random hex salt

| Function | Type |
| ---------- | ---------- |
| `generateSalt` | `() => string` |

### :gear: speckExpandKey

SPECK-64/128 key expansion algorithm.
Takes 128-bit key (4 x 32-bit words) and yields 27 round keys.

| Function | Type |
| ---------- | ---------- |
| `speckExpandKey` | `(k: number[]) => number[]` |

### :gear: speckEncryptBlock

Encrypts a single 64-bit block (two 32-bit words x, y) using SPECK-64/128

| Function | Type |
| ---------- | ---------- |
| `speckEncryptBlock` | `(x: number, y: number, rk: number[]) => [number, number]` |

### :gear: speckCTR

SPECK-64/128 Counter (CTR) Mode Cipher.
Encrypts/Decrypts arbitrary data using 128-bit key and 64-bit IV.

| Function | Type |
| ---------- | ---------- |
| `speckCTR` | `(dataBytes: number[], keyHex: string, ivHex: string) => number[]` |

### :gear: blake2s

Computes BLAKE2s-256 hash or keyed MAC over arbitrary input

| Function | Type |
| ---------- | ---------- |
| `blake2s` | `(inputStrOrBytes: string or number[], keyHex?: string or undefined) => string` |

### :gear: deriveKey

Derives a 128-bit Key Encryption Key (KEK) from a passphrase and salt.
Performs iterated BLAKE2s passes to slow down offline password cracking attempts.

| Function | Type |
| ---------- | ---------- |
| `deriveKey` | `(passphrase: string, saltHex: string, rounds?: number) => string` |

### :gear: encryptText

Encrypts a text string with SPECK-64/128 CTR and returns a Hex string

| Function | Type |
| ---------- | ---------- |
| `encryptText` | `(plaintext: string, keyHex: string, ivHex: string) => string` |

### :gear: decryptText

Decrypts a Hex ciphertext string with SPECK-64/128 CTR and returns text

| Function | Type |
| ---------- | ---------- |
| `decryptText` | `(ciphertextHex: string, keyHex: string, ivHex: string) => string` |


## :wrench: Constants

- [SPECK_KEY_BYTES](#gear-speck_key_bytes)
- [SPECK_IV_BYTES](#gear-speck_iv_bytes)
- [SALT_BYTES](#gear-salt_bytes)
- [BLAKE2S_DIGEST_BYTES](#gear-blake2s_digest_bytes)
- [DEFAULT_KEY_DERIVATION_ROUNDS](#gear-default_key_derivation_rounds)

### :gear: SPECK_KEY_BYTES

Standard key, IV, salt, and digest byte lengths

| Constant | Type |
| ---------- | ---------- |
| `SPECK_KEY_BYTES` | `16` |

### :gear: SPECK_IV_BYTES

| Constant | Type |
| ---------- | ---------- |
| `SPECK_IV_BYTES` | `8` |

### :gear: SALT_BYTES

| Constant | Type |
| ---------- | ---------- |
| `SALT_BYTES` | `16` |

### :gear: BLAKE2S_DIGEST_BYTES

| Constant | Type |
| ---------- | ---------- |
| `BLAKE2S_DIGEST_BYTES` | `32` |

### :gear: DEFAULT_KEY_DERIVATION_ROUNDS

| Constant | Type |
| ---------- | ---------- |
| `DEFAULT_KEY_DERIVATION_ROUNDS` | `500` |


