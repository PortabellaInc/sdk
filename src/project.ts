import {generateMnemonic} from 'bip39';
import {sha256} from 'ethereum-cryptography/sha256';
import {UserSDK} from './admin';
import {migrations} from './migrations';
import * as routes from './routes';
import {
  decrypt,
  exportKey,
  generate as generateAES,
  importKey,
} from './services/crypto/aes';
import {
  default as AsymmetricKeyPair,
  default as KeyPair,
} from './services/crypto/asymmetric';
import {decryptFields, encryptFields} from './services/crypto/helpers';
import {
  PortabellaConfig,
  Board,
  BoardKeyType,
  CreateBoardInput,
  CreateProjectInput,
  CreateCardInput,
  CreateColumnInput,
  Document,
  DocumentWithoutBody,
  EnrichedCard,
  ErrorInvalidProjectReadPermissions,
  DocumentFolder,
  Project as ProjectModel,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateColumnInput,
  UpdateFolderInput,
  CreateIntegration,
  Role,
} from './types';
import {fetch} from './utils';

export class ProjectSDK {
  signature: string | undefined;
  challenge: number | undefined;
  keyPair: AsymmetricKeyPair | null;

  user: UserSDK;

  boardKeyPair?: AsymmetricKeyPair | CryptoKey;

  projectId?: string;
  organisationId?: string;

  constructor(config: PortabellaConfig) {
    this.keyPair = config.token
      ? AsymmetricKeyPair.fromPrivateKey(config.token)
      : null;
    this.projectId = config.projectId;
    this.organisationId = config.teamId;

    this.user = new UserSDK(this.keyPair);
  }

  public static async createProject(
    keyPair: AsymmetricKeyPair,
    p: CreateProjectInput,
    organisationId?: string,
    opts: {keyType: BoardKeyType} = {keyType: 'EC'}
  ): Promise<Board> {
    let wrappedKey, boardKeyPair, publicKey, privateKey;

    if (opts.keyType === 'AES-CBC') {
      boardKeyPair = await generateAES();
      wrappedKey = await keyPair.wrapKey(boardKeyPair);
      if (p.public) {
        privateKey = await Buffer.from(await exportKey(boardKeyPair)).toString(
          'base64'
        );
      }
    } else {
      boardKeyPair = await AsymmetricKeyPair.fromMnemonic(
        'EC',
        generateMnemonic()
      );
      publicKey = boardKeyPair.publicKey;
      const projectPrivateKey = await boardKeyPair.export();
      wrappedKey = await keyPair.wrapKey(Buffer.from(projectPrivateKey));
      if (p.public) {
        privateKey = projectPrivateKey;
      }
    }

    let path = `/boards/`;
    if (organisationId) {
      path = `/organisations/${organisationId}${path}`;
    }

    const challenge = Date.now().toString();
    const signature = (
      await keyPair.sign(sha256(Buffer.from(challenge)))
    ).toString('base64');

    return fetch(path, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'public-key': keyPair.publicKey,
        challenge: challenge,
        signature: signature,
      },
      body: JSON.stringify(
        await encryptFields(
          {
            ...p,
            board: {
              ...p.board,
              publicKey,
              encryptedKey: wrappedKey,
              lastRunMigration: migrations.length,
              keyType: opts.keyType,
              privateKey,
            },
          },
          boardKeyPair
        )
      ),
    });
  }

  private async projectFetch(path: string, options?: {[x: string]: any}) {
    let prependedPath = `/boards/${this.projectId}${path}`;
    if (this.organisationId) {
      prependedPath = `/organisations/${this.organisationId}${prependedPath}`;
    }

    return this.user.authenticatedFetch(prependedPath, options);
  }

  private async encryptedFetch(
    path: string,
    method: string,
    body?: {[x: string]: any}
  ) {
    if (!this.boardKeyPair) {
      throw new Error(
        'No key pair for this project, must initialise before use'
      );
    }

    const result = await this.projectFetch(path, {
      method,
      body: body
        ? JSON.stringify(await encryptFields(body, this.boardKeyPair))
        : undefined,
    });

    if (result) {
      return decryptFields(result, this.boardKeyPair!);
    }
    return null;
  }

  /**
   * Primes the SDK for writing
   */
  fetchPublicKey = async () => {
    const result = await this.projectFetch('/public-key', {method: 'POST'});
    if (!result) {
      throw new Error('Unable to fetch public key');
    }
    this.boardKeyPair = await AsymmetricKeyPair.fromPublicKey(result);
  };

  fetchProject = async (): Promise<ProjectModel> => {
    const result: ProjectModel = await this.projectFetch('/');

    const {membership} = result;
    if (!membership) {
      throw new Error('No membership for this board');
    }

    const {encryptedKey, keyType: boardKeyType, privateKey} = membership;
    if (!encryptedKey && !privateKey) {
      throw new Error('No key found for this board');
    }

    // board is public
    if (privateKey) {
      if (boardKeyType === 'EC') {
        this.boardKeyPair = AsymmetricKeyPair.fromPrivateKey(privateKey);
      } else {
        this.boardKeyPair = await importKey(Buffer.from(privateKey, 'base64'));
      }
    }

    // we have a membership
    if (encryptedKey && this.keyPair) {
      this.boardKeyPair = await this.keyPair.unwrapKey(
        encryptedKey,
        boardKeyType
      );
    }

    if (!this.boardKeyPair) {
      throw new Error('No key found for this board!');
    }

    return decryptFields(result, this.boardKeyPair);
  };

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

  updateMember = async (userId: string, role: Role) => {
    return this.put(routes.updateMember(userId), {role});
  };

  updateBoard = async (data: UpdateBoardInput) => {
    return this.put(routes.updateBoard(), data);
  };

  addCard = async (data: CreateCardInput) => {
    return this.post(routes.addCard(), data);
  };

  removeCard = async (cardId: string) => {
    return this.del(routes.updateCard(cardId));
  };

  updateCard = async (cardId: string, updates: UpdateCardInput) => {
    return this.put(routes.updateCard(cardId), updates);
  };

  addColumn = async (col: CreateColumnInput) => {
    return this.post(routes.addColumn(), col);
  };

  updateColumns = async (data: UpdateColumnInput) => {
    return this.put(routes.updateColumns(), data);
  };

  updateColumn = async (columnId: string, data: UpdateColumnInput) => {
    return this.put(routes.updateColumn(columnId), data);
  };

  removeColumn = async (columnId: string) => {
    return this.del(routes.updateColumn(columnId));
  };

  /**
   * Manually fetch card
   */
  fetchCard = async (cardId: string): Promise<EnrichedCard> => {
    return this.get(routes.getCard(cardId));
  };

  addComment = async (
    cardId: string,
    data: {text: string; mentions: string[]}
  ) => {
    return this.post(routes.addComment(cardId), data);
  };

  removeComment = async (cardId: string, commentId: string) => {
    return this.del(
      routes.updateComment({
        cardId,
        commentId,
      })
    );
  };

  updateComment = async (cardId: string, commentId: string, updates: any) => {
    await this.put(
      routes.updateComment({
        cardId,
        commentId,
      }),
      updates
    );
  };

  createDocument = async (payload: {
    title: string;
    body?: string;
    parentId?: string;
  }) => {
    return this.post(routes.getDocuments(), payload);
  };

  createFolder = async (payload: {title: string; parentId?: string}) => {
    return this.post(routes.addFolder(), payload);
  };

  updateFolder = async (id: string, payload: UpdateFolderInput) => {
    return this.put(routes.updateFolder(id), payload);
  };

  updateDocument = async (
    documentId: string,
    payload: {title?: string; body?: string}
  ) => {
    return this.put(routes.getDocument(documentId), payload);
  };

  fetchDocuments = async (): Promise<{
    folders: {[id: string]: DocumentFolder};
    files: {[id: string]: DocumentWithoutBody};
  }> => {
    return this.get(routes.getDocuments());
  };

  fetchDocument = async (documentId: string): Promise<Document> => {
    return this.get(routes.getDocument(documentId));
  };

  deleteDocument = async (id: string) => {
    await this.del(routes.getDocument(id));
  };

  deleteFolder = async (id: string) => {
    await this.del(routes.updateFolder(id));
  };

  addSubtask = async (cardId: string, subtask: {title: string}) => {
    return this.post(routes.addSubtask(cardId), subtask);
  };

  makePublic = async () => {
    if (this.boardKeyPair instanceof KeyPair) {
      return this.put('/make-public', {
        privateKey: await this.boardKeyPair.export(),
      });
    }

    return this.put('/make-public', {
      privateKey: (await exportKey(this.boardKeyPair!)).toString('base64'),
    });
  };

  makePrivate = async () => {
    return this.get('/make-private');
  };

  addIntegration = async (integration: CreateIntegration) => {
    return this.post(`/integrations`, integration);
  };

  removeIntegration = async (id: string) => {
    return this.del(`/integrations/${id}`);
  };

  private runMigrations = async (project: ProjectModel) => {
    for (let i = project.board.lastRunMigration; i < migrations.length; i++) {
      console.log('=== MIGRATION', i, '===');
      await migrations[i](project, {
        decrypt: x => decrypt(x, this.boardKeyPair!).then(y => y.toString()),
        updateBoard: this.updateBoard,
        updateColumn: this.updateColumn,
      });
      console.log('=== MIGRATION', i, 'completed ===');
      await this.updateBoard({lastRunMigration: i + 1});
    }
  };
}
