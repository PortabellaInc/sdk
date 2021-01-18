import add from 'date-fns/add';
import {Activity} from './activity';
import {IntegrationRole, Role} from './roles';
import {Key} from './keys';

export type EncryptedFile = {
  id: string;
  name: string;
  userId: string;
  organisationId?: string;
  createdAt: Date;
  deletedAt?: Date;
};
export type Comment = {
  id: string;
  text: string;
  author: string;
  mentions: string[];
  createdAt: Date;
};
export type CreateCommentInput = Omit<Comment, 'id' | 'createdAt'>;
export type UpdateCommentInput = CreateCommentInput;

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum RecurringIntervals {
  Never = 'never',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export function getNextRecurringDate(interval: RecurringIntervals) {
  if (interval === RecurringIntervals.Daily) {
    return add(new Date(), {days: 1});
  }
  if (interval === RecurringIntervals.Weekly) {
    return add(new Date(), {weeks: 1});
  }
  if (interval === RecurringIntervals.Monthly) {
    return add(new Date(), {months: 1});
  }
  if (interval === RecurringIntervals.Yearly) {
    return add(new Date(), {years: 1});
  }

  throw new Error('Unknown recurring interval');
}

export type Card = {
  id: string;
  description?: string;
  title: string;
  assignees: string[];
  assignedLabels: string[];
  descriptionMentions: string[];
  updatedAt: Date;
  createdAt: Date;
  startAt?: Date;
  endAt?: Date;
  archivedAt?: Date;
  completedAt?: Date;
  encryptedMetadata?: {[x: string]: any};
  priority: Priority | null;
  parentId?: string;
  subtasksOrder: string[];
  recursNext?: Date;
  recurringInterval?: RecurringIntervals;
};
export type CreateCardInput = {
  id?: string;
  title: string;
  columnId?: string;
} & Partial<Card>;
export type UpdateCardInput = {dependencies?: {id: string}[]} & Partial<
  Omit<Card, 'id' | 'updatedAt' | 'createdAt'>
>;

export type EnrichedCard = Card & {
  comments: Comment[];
  files: EncryptedFile[];
  activity: Activity[];
  dependencies: {id: string}[];
  subtasks: {
    id: string;
    title: string;
    completedAt: Date;
  }[];
};

export type Column = {
  id: string;
  title: string;
  color: string;
  cardOrder: string[];
};

export type CreateColumnInput = {id?: string; title: string; color: string};
export type UpdateColumnInput = Partial<Omit<Column, 'id'>>;
export type UpdateColumnsInput = ({id: string} & Partial<Column>)[];
export type Labels = {
  [x: string]: {
    color: string;
    label: string;
  };
};

export interface CreateBoardInput {
  name: string;
  description?: string;
  metadata?: {trelloBoardId?: string};
  labelsV2?: {
    [x: string]: {
      color: string;
      label: string;
    };
  };
  privateKey?: string;
  lastRunMigration?: number;
}

export interface Board extends CreateBoardInput {
  id: string;
  columnOrder: string[];
  settings: {
    markCardsInLastColumnCompleted?: boolean;
  };
  labelsV2: {
    [x: string]: {
      color: string;
      label: string;
    };
  };
  lastRunMigration: number;
}

export type UpdateBoardInput = Partial<Omit<Board, 'id'>>;
export type Columns = {
  [id: string]: Column;
};
export type Cards = {
  [id: string]: EnrichedCard;
};
export type Project = {
  columns: Columns;
  cards: Cards;
  board: Board;
  membership?: Membership;
  organisationId?: string;
};

export type CreateProjectInput = {
  public?: boolean;
  board: CreateBoardInput;
  columns?: (CreateColumnInput & {cards?: CreateCardInput[]})[];
};

export type BoardKeyType = 'EC' | 'AES-CBC';

export type Membership = {
  encryptedKey?: string;
  role: Role | IntegrationRole;
  keyType: BoardKeyType;
  privateKey?: string;
};

export type ProjectList = {
  id: string;
  organisationId?: string;
  name: string;
  updatedAt: Date;
  createdAt: Date;
  encryptedKey: string;
  privateKey?: string;
  keyType: BoardKeyType;
  settings: {
    public?: boolean;
  };
  role: Role;
  metadata: any;
}[];

export type DocumentFolder = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null;
};

export type UpdateFolderInput = Partial<
  Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt'>
>;

export type Document = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
};

export type DocumentWithoutBody = Omit<Document, 'body'>;

export type CreateIntegration = {
  publicKey: string;
  role: IntegrationRole;
  name: string;
  description?: string;
  keyType?: Key;
  encryptedKey?: string;
};

export type Integration = {
  id: string;
  boardId: string;
  publicKey: string;
  encryptedKey: string;
  role: IntegrationRole;
  organisationId: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  keyType: Key;
  boardKeyType: BoardKeyType;
};

export interface CreateWidget {
  name: string;
  description?: string;
  token: string;
  integrationId: string;
}

export interface Widget extends CreateWidget {
  id: string;
  createdAt: Date;
  userId: string;
  projectId: string;
}
