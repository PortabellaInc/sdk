export * from './activity';
export * from './roles';
export * from './project';
export * from './errors';
export * from './keys';

export interface PortabellaConfig {
  token?: string;
  projectId: string;
  teamId?: string;
}
