import KeyPair from './asymmetric';

const SEPARATOR = ':';
export const name = 'AES-CBC';

export async function encrypt(
  payload: Buffer,
  key: CryptoKey | KeyPair
): Promise<string> {
  if (key instanceof KeyPair) {
    return (await key.encrypt(payload)).toString('base64');
  }

  const ciphertext = await encryptRaw(payload, key);
  const iv = ciphertext.slice(0, 16);
  const cipher = ciphertext.slice(16);
  return [iv, cipher].map(buf => buf.toString('base64')).join(SEPARATOR);
}

export async function encryptRaw(
  payload: Buffer,
  key: CryptoKey | KeyPair
): Promise<Buffer> {
  if (key instanceof KeyPair) {
    return key.encrypt(payload);
  }
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const cipher = await window.crypto.subtle.encrypt(
    {name, iv},
    key,
    new Uint8Array(payload)
  );
  return Buffer.concat([iv, cipher].map(bz => Buffer.from(bz)));
}

export async function decrypt(
  ciphertext: string,
  key: CryptoKey | KeyPair
): Promise<Buffer> {
  if (key instanceof KeyPair) {
    return key.decrypt(Buffer.from(ciphertext, 'base64'));
  }
  const [iv, cipher] = ciphertext
    .split(SEPARATOR)
    .map(str => Buffer.from(str, 'base64'));
  return decryptRaw(Buffer.concat([iv, cipher]), key);
}

export async function decryptRaw(
  cipher: Buffer,
  key: CryptoKey | KeyPair
): Promise<Buffer> {
  if (key instanceof KeyPair) {
    return key.decrypt(cipher);
  }

  const iv = cipher.slice(0, 16);
  const ciphertext = cipher.slice(16);
  const result = await window.crypto.subtle.decrypt(
    {name, iv: new Uint8Array(iv)},
    key,
    new Uint8Array(ciphertext)
  );
  return Buffer.from(result);
}

export function generate() {
  return window.crypto.subtle.generateKey({name, length: 128}, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function exportKey(key: CryptoKey) {
  return Buffer.from(await window.crypto.subtle.exportKey('raw', key));
}

export function importKey(buf: Buffer) {
  return window.crypto.subtle.importKey(
    'raw',
    new Uint8Array(buf),
    {name, length: 128},
    true,
    ['encrypt', 'decrypt']
  );
}
