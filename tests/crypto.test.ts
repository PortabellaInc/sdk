const {Crypto} = require('node-webcrypto-ossl');
const fetch = require('node-fetch');
const crypto = new Crypto();
// @ts-ignore
global.window = {
  crypto,
  fetch,
};

import AsymmetricKeyPair from '@portabella/sdk/src/services/crypto/asymmetric';
import {generateMnemonic} from 'bip39';
import {expect} from 'chai';
import 'mocha';

it('can recover the same key pair from private key and mnemonic', async () => {
  const mnemonic = generateMnemonic();

  const mnemonicKeyPair = await AsymmetricKeyPair.fromMnemonic('EC', mnemonic);
  const privateKeyPair = await AsymmetricKeyPair.fromPrivateKey(
    await mnemonicKeyPair.export()
  );

  expect(mnemonicKeyPair.publicKey).to.equal(privateKeyPair.publicKey);
});
