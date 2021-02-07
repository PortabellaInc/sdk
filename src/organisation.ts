import {UserSDK} from './admin';
import {default as AsymmetricKeyPair} from './services/crypto/asymmetric';
import {decryptFields, encryptFields} from './services/crypto/helpers';
import {OrganisationWithRole, ProjectList, Role} from './types';

export class TeamSDK {
  user: UserSDK;
  organisationId: string;

  keyPair: AsymmetricKeyPair | undefined;

  constructor(user: UserSDK, organisationId: string) {
    this.user = user;
    this.organisationId = organisationId;
  }

  public async load(): Promise<OrganisationWithRole> {
    const {employee, ...organisation} = await this.user.get(
      `/organisations/${this.organisationId}`
    );

    this.keyPair = (await this.user.keyPair?.unwrapKey(
      employee.encryptedKey,
      organisation.keyType
    )) as AsymmetricKeyPair;

    return decryptFields(organisation, this.keyPair);
  }

  private async teamFetch(path: string, options?: {[x: string]: any}) {
    return this.user.authenticatedFetch(
      `/organisations/${this.organisationId}${path}`,
      options
    );
  }

  private async encryptedFetch(
    path: string,
    method: string,
    body?: {[x: string]: any}
  ) {
    if (!this.keyPair) {
      throw new Error('Must load() SDK before use');
    }

    const result = await this.teamFetch(path, {
      method,
      body: body
        ? JSON.stringify(await encryptFields(body, this.keyPair))
        : undefined,
    });

    if (result) {
      return decryptFields(result, this.keyPair);
    }
    return null;
  }

  get = async (path: string) => {
    return this.encryptedFetch(path, 'get');
  };

  put = async (path: string, data: any) => {
    return this.encryptedFetch(path, 'put', data);
  };

  post = async (path: string, data: any) => {
    return this.encryptedFetch(path, 'post', data);
  };

  del = async (path: string) => {
    return this.encryptedFetch(path, 'delete');
  };

  getProjects = async () => {
    const response = await this.user.get(
      `/organisations/${this.organisationId}/boards`
    );
    if (!response) {
      return [];
    }

    const projects: ProjectList = await Promise.all(
      response.map(async (r: any) => {
        if (!this.user.keyPair) {
          throw new Error('Missing key pair');
        }
        if (!r.encryptedKey && !r.privateKey) {
          return r;
        }
        const key = await this.user.keyPair!.unwrapKey(
          r.encryptedKey || r.privateKey,
          r.keyType
        );
        return decryptFields(r, key!);
      })
    );

    return projects;
  };

  addMember = async (member: {email: string; role: Role}) => {
    return this.teamFetch(`/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  };

  getMembers = async (): Promise<any[]> => {
    return this.get(`/members`);
  };

  removeMember = async (userId: string) => {
    return this.teamFetch(`/members/${userId}`, {
      method: 'DELETE',
    });
  };
}
