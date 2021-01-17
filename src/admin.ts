import {
  BoardKeyType,
  config,
  CreateIntegration,
  CreateOrganisation,
  fetch,
  Key,
  Organisation,
  ProjectList,
  Role,
} from '@portabella/common';
import {generateMnemonic} from 'bip39';
import {sha256} from 'ethereum-cryptography/sha256';
import AsymmetricKeyPair from './services/crypto/asymmetric';
import {decryptFields, encryptFields} from './services/crypto/helpers';

async function request(path: string, options: {[x: string]: any} = {}) {
  const result = await window.fetch(path, options);

  if (result.status === 200) {
    return result.json();
  }

  if (result.status >= 400) {
    const error = await result.text();
    throw new Error(error);
  }

  return null;
}

export const get = async (path: string, options: {[x: string]: any} = {}) => {
  return request(path, {
    method: 'get',
    ...options,
    headers: {
      ...options.headers,
      Accept: 'application/json',
    },
  });
};

export const post = async (path: string, options: {[x: string]: any} = {}) => {
  return request(path, {
    method: 'post',
    ...options,
    body: JSON.stringify(options.body),
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
};

export const put = async (path: string, options: {[x: string]: any} = {}) => {
  return request(path, {
    method: 'put',
    ...options,
    body: JSON.stringify(options.body),
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
};

export const del = async (path: string, options: {[x: string]: any} = {}) => {
  return request(path, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
};

async function generateSignature(keyPair: AsymmetricKeyPair) {
  const challenge = Date.now().toString();
  const signature = (
    await keyPair.sign(sha256(Buffer.from(challenge)))
  ).toString('base64');

  return {challenge, signature};
}

export class UserSDK {
  keyPair: AsymmetricKeyPair | null;

  challenge: string | undefined;
  signature: string | undefined;

  constructor(keyPair: AsymmetricKeyPair | null) {
    this.keyPair = keyPair;
  }

  static async fromEmailPassword(email: string, password: string) {}

  static async fromMnemonic(email: string, password: string) {}

  private async maybeRefreshSignature() {
    if (!this.keyPair) {
      return;
    }

    if (
      this.challenge &&
      parseInt(this.challenge) > Date.now() - 1000 * 60 * 4
    ) {
      return;
    }

    const {signature, challenge} = await generateSignature(this.keyPair);
    this.signature = signature;
    this.challenge = challenge;
  }

  static async register(
    keyPair: AsymmetricKeyPair,
    params: {
      email: string;
      name?: string;
      token?: string;
      publicKey?: string;
      subscribedToNewsletter?: boolean;
    }
  ) {
    const {challenge, signature} = await generateSignature(keyPair);
    return request(`${config.backendUrl}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        publicKey: keyPair.publicKey,
        keyType: 'EC',
        signature,
        challenge,
      }),
    });
  }

  authenticatedFetch = async (
    path: string,
    options: {[x: string]: any} = {}
  ) => {
    await this.maybeRefreshSignature();

    const authenticatedOptions = this.keyPair
      ? {
          'public-key': this.keyPair.publicKey,
          challenge: this.challenge,
          signature: this.signature,
        }
      : {};
    return fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...authenticatedOptions,
      },
    });
  };

  get = async (path: string) => {
    return this.authenticatedFetch(path);
  };

  put = async (path: string, data: any) => {
    return this.authenticatedFetch(path, {
      method: 'put',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  };

  post = async (path: string, data: any) => {
    return this.authenticatedFetch(path, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  };

  del = async (path: string) => {
    return this.authenticatedFetch(path, {
      method: 'delete',
    });
  };

  distributeKeys = async () => {
    const pending = await this.authenticatedFetch(
      '/boards/pending_memberships'
    );

    await Promise.all(
      pending.map(
        async ({
          organisationId,
          boardId,
          userId,
          publicKey,
          boardKeyType,
          encryptedKey,
          userKeyType,
          organisationKeyType,
        }: {
          organisationId: string;
          boardId: string;
          userId: string;
          publicKey: string;
          encryptedKey: string;
          boardKeyType: BoardKeyType;
          userKeyType: Key;
          organisationKeyType: 'EC';
        }) => {
          // permissioning an employee
          if (organisationKeyType) {
            const organisationKey = await this.keyPair?.unwrapKey(
              encryptedKey,
              organisationKeyType
            );
            if (!organisationKey) {
              throw new Error('Unable to unwrap key');
            }

            const wrapped = await AsymmetricKeyPair.wrapWithPublicKey(
              userKeyType,
              publicKey,
              organisationKey
            );
            return this.put(
              `/organisations/${organisationId}/members/${userId}`,
              {
                encryptedKey: wrapped,
              }
            );
          }

          const boardKey = await this.keyPair?.unwrapKey(
            encryptedKey,
            boardKeyType
          );
          if (!boardKey) {
            throw new Error('Unable to unwrap key');
          }

          const wrapped = await AsymmetricKeyPair.wrapWithPublicKey(
            userKeyType,
            publicKey,
            boardKey
          );

          if (organisationId) {
            await this.put(
              `/organisations/${organisationId}/boards/${boardId}/members/${userId}`,
              {
                encryptedKey: wrapped,
              }
            );
          } else {
            await this.put(`/boards/${boardId}/members/${userId}`, {
              encryptedKey: wrapped,
            });
          }
        }
      )
    );
  };

  getProjects = async () => {
    const response = await this.get('/me/boards');
    if (!response) {
      return [];
    }

    const projects: ProjectList = await Promise.all(
      response.map(async (r: any) => {
        if (!r.encryptedKey && !r.publicKey) {
          return {
            ...r,
            name: 'Membership pending',
          };
        }

        const key = await this.keyPair?.unwrapKey(
          r.encryptedKey || r.privateKey,
          r.keyType
        );
        return decryptFields(r, key!);
      })
    );

    return projects;
  };

  addMember = async (
    projectId: string,
    member: {email: string; role: Role}
  ) => {
    return this.post(`/boards/${projectId}/members`, member);
  };

  removeMember = async (projectId: string, userId: string) => {
    return this.del(`/boards/${projectId}/members/${userId}`);
  };

  createTeam = async (team: CreateOrganisation) => {
    const keyPair = await AsymmetricKeyPair.fromMnemonic(
      'EC',
      generateMnemonic()
    );
    const wrappedKey = await this.keyPair?.wrapKey(
      Buffer.from(await keyPair.export())
    );
    const publicKey = this.keyPair?.publicKey;

    return this.post(
      `/organisations`,
      await encryptFields(
        {
          ...team,
          encryptedKey: wrappedKey,
          publicKey,
          keyType: 'EC',
        },
        keyPair
      )
    );
  };

  getTeams = async (): Promise<Organisation[]> => {
    const response = await this.get('/me/organisations');
    if (!response) {
      return [];
    }

    const teams: Organisation[] = await Promise.all(
      response.map(async (r: Organisation) => {
        if (!r.encryptedKey) {
          return {
            name: 'Membership pending',
          };
        }
        const key = await this.keyPair?.unwrapKey(r.encryptedKey, r.keyType);
        return decryptFields(r, key!);
      })
    );

    return teams;
  };
}
