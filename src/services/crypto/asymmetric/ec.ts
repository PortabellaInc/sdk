import {mnemonicToSeed} from 'bip39';
import {decrypt as ecDecrypt, encrypt as ecEncrypt} from 'eciesjs';
import {HDKey, HDKeyT} from 'ethereum-cryptography/pure/hdkey';
import {exportKey, name} from '../aes';

export const encrypt = (message: Buffer, key: HDKeyT): Buffer => {
  if (!key.publicKey) {
    throw new Error('Cannot encrypt, no public key');
  }
  return ecEncrypt(key.publicKey, message);
};

export const decrypt = (message: Buffer, key: HDKeyT): Buffer => {
  if (!key.privateKey) {
    throw new Error('Cannot decrypt, no private key');
  }
  return ecDecrypt(Buffer.from(key.privateKey), message);
};

export const sign = (message: Buffer, key: HDKeyT): Buffer => {
  return key.sign(message);
};

export const wrapKey = async (
  symmetric: CryptoKey,
  key: HDKeyT
): Promise<Buffer> => {
  return encrypt(Buffer.from(await exportKey(symmetric)), key);
};

export const unwrapKey = async (
  wrapped: Buffer,
  key: HDKeyT
): Promise<CryptoKey> => {
  const decrypted = await decrypt(wrapped, key);
  return window.crypto.subtle.importKey(
    'raw',
    new Uint8Array(decrypted),
    {name, length: 128},
    true,
    ['encrypt', 'decrypt']
  );
};

export const fromPrivateKey = (privateKey: string): HDKeyT => {
  return HDKey.fromJSON({xpriv: privateKey});
};

export const fromSeed = (seed: Buffer): HDKeyT => {
  return HDKey.fromMasterSeed(seed);
};

export const fromMnemonic = async (mnemonic: string): Promise<HDKeyT> => {
  return fromSeed(await mnemonicToSeed(mnemonic));
};
