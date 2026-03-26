const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const useMockRaw = process.env.NEXT_PUBLIC_USE_MOCK || 'false';

export const appEnv = {
  apiBaseUrl,
  useMock: useMockRaw === 'true',
};

