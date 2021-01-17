const isProduction = process.env.NODE_ENV === 'production';
export const backendUrl = isProduction
  ? 'https://backend.portabella.io'
  : 'http://localhost:5000';
