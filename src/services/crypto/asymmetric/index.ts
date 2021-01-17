import {HDKey} from 'ethereum-cryptography/hdkey';
import {HDKeyT} from 'ethereum-cryptography/pure/hdkey';
import {BoardKeyType} from '../../../types';
import {ensureUnarmored} from '../../encoding';
import {exportKey, importKey} from '../aes';
import * as ec from './ec';
import * as rsa from './rsa';

export type KeyType = 'RSA' | 'EC';

export class KeyPair {
  public type: KeyType;
  private signKey?: CryptoKey;
  private decryptKey?: CryptoKey;
  private encryptKey?: CryptoKey;
  private hdKey?: HDKeyT;
  public publicKey: string;

  constructor(
    type: KeyType,
    publicKey: string,
    {
      signKey,
      decryptKey,
      encryptKey,
      hdKey,
    }: {
      signKey?: CryptoKey;
      decryptKey?: CryptoKey;
      encryptKey?: CryptoKey;
      hdKey?: HDKeyT;
    }
  ) {
    this.type = type;
    this.publicKey =
      type === 'RSA' ? encodeURI(ensureUnarmored(publicKey)) : publicKey;
    this.decryptKey = decryptKey;
    this.signKey = signKey;
    this.encryptKey = encryptKey;
    this.hdKey = hdKey;
  }

  static async fromRaw({
    publicKey: rawPublicKey,
    privateKey: rawPrivateKey,
  }: {
    publicKey: string;
    privateKey: string;
  }): Promise<KeyPair> {
    const publicKey = await rsa.importPublicKey(rawPublicKey);
    const {decryption, signing} = await rsa.importPrivateKey(rawPrivateKey);

    return new KeyPair('RSA', rawPublicKey, {
      signKey: signing,
      decryptKey: decryption,
      encryptKey: publicKey,
    });
  }

  static async fromSeed(type: string, seed: Buffer): Promise<KeyPair> {
    if (type === 'RSA') {
      return KeyPair.fromRaw(await rsa.fromSeed(seed));
    }
    const hdKey = ec.fromSeed(seed);
    if (!hdKey.publicKey) {
      throw new Error('Invalid seed, no public key generated');
    }
    return new KeyPair('EC', hdKey.publicKey.toString('base64'), {
      hdKey,
    });
  }

  static async fromMnemonic(type: string, mnemonic: string): Promise<KeyPair> {
    if (type === 'RSA') {
      return KeyPair.fromRaw(await rsa.fromMnemonic(mnemonic));
    }
    const hdKey = await ec.fromMnemonic(mnemonic);
    if (!hdKey.publicKey) {
      throw new Error('Invalid seed, no public key generated');
    }
    return new KeyPair('EC', hdKey.publicKey.toString('base64'), {hdKey});
  }

  static fromPrivateKey(privateKey: string) {
    const hd = HDKey.fromExtendedKey(privateKey);
    if (!hd.publicKey) {
      throw new Error('Invalid seed, no public key generated');
    }
    return new KeyPair('EC', hd.publicKey.toString('base64'), {
      hdKey: hd,
    });
  }

  /**
   * An asymmetric key generated from this method will only
   * allow writing
   */
  static async fromPublicKey(publicKey: string) {
    const hdKey = await ec.fromMnemonic(
      'verify pole torch letter thumb payment soda speed degree memory angle private'
    );
    hdKey.publicKey = Buffer.from(publicKey, 'base64');
    return new KeyPair('EC', hdKey.publicKey.toString('base64'), {
      hdKey: hdKey,
    });
  }

  async sign(message: Buffer): Promise<Buffer> {
    if (this.type === 'RSA') {
      return rsa.sign(message, this.signKey!);
    }
    return ec.sign(message, this.hdKey!);
  }

  async encrypt(message: Buffer): Promise<Buffer> {
    if (this.type === 'RSA') {
      return rsa.encrypt(message, this.encryptKey!);
    }
    return ec.encrypt(message, this.hdKey!);
  }

  async decrypt(message: Buffer): Promise<Buffer> {
    return this.type === 'RSA'
      ? rsa.decrypt(message, this.decryptKey!)
      : ec.decrypt(message, this.hdKey!);
  }

  async wrapKey(key: CryptoKey | Buffer): Promise<string> {
    if (Buffer.isBuffer(key)) {
      return (await this.encrypt(key)).toString('base64');
    }
    return (await this.encrypt(Buffer.from(await exportKey(key)))).toString(
      'base64'
    );
  }

  async unwrapKey(
    key: string,
    type: BoardKeyType
  ): Promise<CryptoKey | KeyPair> {
    if (type === 'EC') {
      const decrypted = await this.decrypt(Buffer.from(key, 'base64'));
      return KeyPair.fromPrivateKey(decrypted.toString());
    }

    const decrypted = await this.decrypt(Buffer.from(key, 'base64'));
    return importKey(decrypted);
  }

  static async encryptWithPublicKey(
    type: KeyType,
    publicKey: string,
    payload: Buffer
  ): Promise<Buffer> {
    if (type === 'RSA') {
      return rsa
        .importPublicKey(publicKey)
        .then(pub => rsa.encrypt(payload, pub));
    }
    return ec.encrypt(payload, {
      publicKey: Buffer.from(publicKey, 'base64'),
    } as HDKeyT);
  }

  static async wrapWithPublicKey(
    type: KeyType,
    publicKey: string,
    key: CryptoKey | KeyPair
  ): Promise<string> {
    let exported;
    if (key instanceof KeyPair) {
      exported = await key.export();
    } else {
      exported = await exportKey(key);
    }
    const encrypted = await this.encryptWithPublicKey(
      type,
      publicKey,
      Buffer.from(exported as string)
    );
    return encrypted.toString('base64');
  }

  async export(): Promise<string> {
    if (this.type === 'RSA') {
      return JSON.stringify({
        publicKey: decodeURI(this.publicKey),
        // Buffer.from(
        // await window.crypto.subtle.exportKey('spki', this.publicKey)
        // ).toString('base64'),
        privateKey: Buffer.from(
          await window.crypto.subtle.exportKey('pkcs8', this.signKey!)
        ).toString('base64'),
      });
    }
    return this.hdKey!.privateExtendedKey;
  }
}

export default KeyPair;
