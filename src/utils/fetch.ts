import {widgetUrl} from '@portabella/common/config';

const isProduction = process.env.NODE_ENV === 'production';
const backendUrl = isProduction
  ? 'https://backend.portabella.io'
  : 'http://localhost:5000';

const dateProperties = [
  'createdAt',
  'updatedAt',
  'completedAt',
  'startAt',
  'endAt',
  'archivedAt',
  'trialEnd',
  'recursNext',
];

const isPrimitive = (data: any) =>
  typeof data === 'string' ||
  typeof data === 'number' ||
  typeof data === 'boolean' ||
  data instanceof Date;

const recurse = (data: any, fn: (label: string, value: string) => any): any => {
  if (isPrimitive(data)) {
    return data;
  }

  if (!data) {
    return null;
  }

  // for now we only encrypt the value in {key: value}
  if (Array.isArray(data)) {
    return Promise.all(data.map(d => recurse(d, fn)));
  }

  return Object.keys(data).reduce(async (prom, key) => {
    const accum = await prom;

    const newValue = fn(key, data[key]);
    return {
      ...accum,
      [key]: newValue,
    };
  }, Promise.resolve({}));
};

export async function fetch(path: string, opts?: RequestInit) {
  if (typeof window === 'undefined') {
    console.info('Attempted to use fetch in a non browser environment');
    return;
  }

  const response: any = await window.fetch(`${backendUrl}${path}`, opts);
  if (response.status === 204) {
    return null;
  }

  if (response.status === 200) {
    const data: any = await response.json();
    return recurse(data, (label, value) => {
      if (dateProperties.includes(label) && value) {
        return new Date(value);
      }
      return value;
    });
  }

  if (response.status >= 400) {
    const error = await response.text();
    throw new Error(error);
  }

  return null;
}
