const trim = (str: string, start: string, end: string): string =>
  str.substring(start.length, str.length - end.length).trim();

const headers = {
  private: `-----BEGIN PRIVATE KEY-----
`,
  public: `-----BEGIN PUBLIC KEY-----
`,
};

const footers = {
  private: `
-----END PRIVATE KEY-----`,
  public: `
-----END PUBLIC KEY-----`,
};

export const ensureUnarmored = (pem: string): string => {
  if (pem.startsWith(headers.public)) {
    return trim(pem, headers.public, footers.public);
  }
  if (pem.startsWith(headers.private)) {
    return trim(pem, headers.private, footers.private);
  }
  return pem;
};
