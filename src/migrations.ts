import {Project} from '@portabella/common';

export const migrations: Migration[] = [
  // update labels from encrypted string to json payload of
  // type { label: encrypted, color: encrypted }
  async function(project: Project, {decrypt, updateBoard}) {
    // @ts-ignore
    const labelsString = await decrypt(project.board.labels);
    const labelsV2 = JSON.parse(labelsString);
    return updateBoard({labelsV2});
  },
  async function(project: Project, {updateColumn}) {
    // no op because of how we do encryption now
  },
];

type Migration = (
  project: Project,
  {
    decrypt,
    updateBoard,
    updateColumn,
  }: {
    decrypt: (x: string) => Promise<string>;
    updateBoard: (x: any) => Promise<void>;
    updateColumn: (id: string, x: any) => Promise<void>;
  }
) => Promise<void>;
