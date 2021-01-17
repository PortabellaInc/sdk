import {mnemonicToSeed, validateMnemonic} from 'bip39';
import {pbkdf2} from 'ethereum-cryptography/pbkdf2';

function pbkdfSeed(email: string, password: string) {
  return pbkdf2(
    Buffer.from(password),
    Buffer.from(email),
    10000,
    256,
    'sha256'
  );
}

// DEPRECATED AND INSECURE
async function deprecatedSeed(email: string, password: string) {
  return Buffer.from(
    await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${email}:${password}`)
    )
  );
}

async function mnemonicSeed(mnemonic: string) {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Not a valid bip39 mnemonic');
  }
  return mnemonicToSeed(mnemonic.trim());
}

export function getSeed({
  email,
  password,
  mnemonic,
}: {
  email: string;
  password?: string;
  mnemonic?: string;
}) {
  if (mnemonic) {
    return mnemonicSeed(mnemonic);
  }
  if (password) {
    return pbkdfSeed(email, password);
  }
  throw new Error('Neither password or mnemonic provided');
}

export function getPossiblePasswordSeeds({
  email,
  password,
  mnemonic,
}: {
  email: string;
  password?: string;
  mnemonic?: string;
}) {
  if (mnemonic) {
    return [
      {
        type: 'EC',
        seed: () => mnemonicSeed(mnemonic),
      },
      {
        type: 'RSA',
        seed: () => mnemonicToSeed(mnemonic),
      },
    ];
  }

  if (password) {
    return [
      {
        // this is only available who signed up after we moved from RSA
        type: 'EC',
        seed: () => pbkdfSeed(email, password),
      },
      {
        type: 'EC',
        seed: () => deprecatedSeed(email, password),
      },
      {
        type: 'RSA',
        seed: () => deprecatedSeed(email, password),
      },
      // this is a generator function because this fails on Firefox
      // for some god forsaken reason. Like totally fails
      {
        type: 'EC',
        seed: () =>
          pbkdf2(
            Buffer.from(password),
            Buffer.from(email),
            10000,
            512,
            'sha256'
          ),
      },
    ];
  }

  throw new Error('Missing seed material');
}
