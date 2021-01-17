import {decrypt, encrypt} from '@portabella/sdk/src/services/crypto/aes';
import {EnrichedCard, Labels} from '@portabella/common';
import KeyPair from '@portabella/sdk/src/services/crypto/asymmetric';

const encryptedProperties = [
  'name',
  'title',
  'description',
  'hex',
  'text',
  'payload',
  'encryptedMetadata',
  'label',
  'color',
  'priority',
  'body',
  'token',
];

const jsonProperties = ['payload', 'encryptedMetadata'];
const dateProperties = [
  'createdAt',
  'updatedAt',
  'completedAt',
  'startAt',
  'endAt',
  'archivedAt',
  'recursNext',
];

const isPrimitive = (data: any) =>
  typeof data === 'string' ||
  typeof data === 'number' ||
  typeof data === 'boolean' ||
  data instanceof Date;

export const recursivelyApply = (
  data: any,
  {
    encrypt,
    decrypt,
  }: {
    encrypt?: (x: any) => Promise<string>;
    decrypt?: (x: string) => Promise<string>;
  }
): any => {
  if (isPrimitive(data)) {
    return data;
  }

  if (!data) {
    return null;
  }

  // for now we only encrypt the value in {key: value}
  if (Array.isArray(data)) {
    return Promise.all(data.map(d => recursivelyApply(d, {encrypt, decrypt})));
  }

  return Object.keys(data).reduce(async (prom, cur) => {
    const accum = await prom;

    let value = data[cur];
    if (encryptedProperties.includes(cur) && value !== null) {
      if (encrypt) {
        if (jsonProperties.includes(cur)) {
          value = JSON.stringify(value);
        }
        value = await encrypt(value);
      }
      if (decrypt && value) {
        try {
          value = await decrypt(value).then((x: any) =>
            Buffer.from(x).toString()
          );
        } catch (e) {
          console.warn('Failed to decrypt property', cur, data[cur]);
          console.log(e);
        }
        if (jsonProperties.includes(cur)) {
          value = JSON.parse(value);
        }
        if (dateProperties.includes(cur)) {
          value = new Date(value);
        }
      }
    } else {
      value = await recursivelyApply(value, {encrypt, decrypt});
    }

    return {
      ...accum,
      [cur]: value,
    };
  }, Promise.resolve({}));
};

export const encryptFields = (
  data: {[x: string]: any},
  key: CryptoKey | KeyPair
) => {
  return recursivelyApply(data, {
    encrypt: (plaintext: string) => encrypt(Buffer.from(plaintext), key),
  });
};

export const decryptFields = (
  data: {[x: string]: any},
  key: CryptoKey | KeyPair
) =>
  recursivelyApply(data, {
    decrypt: (ciphertext: string) =>
      decrypt(ciphertext, key).then(x => x.toString()),
  });
