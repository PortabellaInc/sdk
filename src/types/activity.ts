export enum Action {
  create = 'create',
  update = 'update',
  delete = 'delete',
  archive = 'archive',
}

export type Activity = {
  commentId?: string;
  cardId?: string;
  boardId: string;
  organisationId?: string;
  action: Action;
  createdAt: Date;
  fileId?: string;
  userId: string;
  labelId?: string;
  assigneeId?: string;
};
