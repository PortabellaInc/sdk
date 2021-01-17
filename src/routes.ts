type ColumnRouteParams = {columnId: string};
type CardRouteParams = {cardId: string};
type CommentRouteParams = {
  cardId: string;
  commentId: string;
};
type FileParams = {
  cardId: string;
  fileId: string;
};

export const createBoard = () => '/boards';
export const updateProject = (boardId: string) => `/boards/${boardId}`;
export const updateBoard = () => `/board`;

export const addColumn = () => `/columns`;
export const updateColumn = (columnId: string) => `/columns/${columnId}`;

export const addCard = () => `/cards`;
export const getCard = (cardId: string) => `/cards/${cardId}`;
export const updateCard = (cardId: string) => `/cards/${cardId}`;

export const getCardActivity = (cardId: string) => `/cards/${cardId}/activity`;

export const addComment = (cardId: string) => `/cards/${cardId}/comments`;

export const updateComment = (params: CommentRouteParams) =>
  `/cards/${params.cardId}/comments/${params.commentId}`;

export const getMembers = (boardId: string) => `/boards/${boardId}/members`;

export const uploadFile = (cardId: string) => `/cards/${cardId}/files`;
export const confirmFileUploaded = (params: FileParams) =>
  `/cards/${params.cardId}/files/${params.fileId}/uploaded`;
export const getFile = (params: FileParams) =>
  `/cards/${params.cardId}/files/${params.fileId}`;

export const getDocuments = () => `/documents`;
export const getDocument = (id: string) => `/documents/${id}`;
export const addFolder = () => `/folders`;
export const updateFolder = (id: string) => `/folders/${id}`;

export const addSubtask = (cardId: string) => `/cards/${cardId}/subtasks`;
