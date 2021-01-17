// @ts-ignore
import {ensureUnarmored} from '../../encoding';
import {exportKey} from '../aes';

let imported: any = null;
async function importHumanCryptoKeys() {
  if (imported) {
    return imported;
  }

  // RSA is an old format so only import when we need to
  // @ts-ignore
  imported = await import('human-crypto-keys');
  return imported;
}

export const encrypt = async (
  message: Buffer,
  key: CryptoKey
): Promise<Buffer> => {
  return Buffer.from(
    await window.crypto.subtle.encrypt({name: 'RSA-OAEP'}, key, message)
  );
};

export const decrypt = async (
  message: Buffer,
  key: CryptoKey
): Promise<Buffer> => {
  const a = await window.crypto.subtle.decrypt(
    {name: 'RSA-OAEP'},
    key,
    message
    // new Uint8Array(message)
  );
  return Buffer.from(a);
};

const signingKeyAlgorithm = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: {name: 'SHA-256'},
};
export const sign = async (
  message: Buffer,
  key: CryptoKey
): Promise<Buffer> => {
  return Buffer.from(
    await window.crypto.subtle.sign(signingKeyAlgorithm.name, key, message)
  );
};

export const wrapKey = async (
  symmetric: CryptoKey,
  key: CryptoKey
): Promise<Buffer> => {
  return encrypt(Buffer.from(await exportKey(symmetric)), key);
};

export async function importPrivateKey(
  pem: string
): Promise<{decryption: CryptoKey; signing: CryptoKey}> {
  const decryption = await window.crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(Buffer.from(ensureUnarmored(pem), 'base64')),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
  const signing = await window.crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(Buffer.from(ensureUnarmored(pem), 'base64')),
    signingKeyAlgorithm,
    true,
    ['sign']
  );

  return {decryption, signing};
}

export function importPublicKey(pem: string, trimmed = false) {
  return window.crypto.subtle.importKey(
    'spki',
    new Uint8Array(Buffer.from(ensureUnarmored(pem), 'base64')),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

export async function fromMnemonic(mnemonic: string) {
  const {getKeyPairFromMnemonic} = await importHumanCryptoKeys();
  return getKeyPairFromMnemonic(mnemonic, {id: 'rsa', modulusLength: 2048});
}

export async function fromSeed(seed: ArrayBuffer) {
  const {getKeyPairFromSeed} = await importHumanCryptoKeys();
  return getKeyPairFromSeed(seed, {id: 'rsa', modulusLength: 2048});
}
