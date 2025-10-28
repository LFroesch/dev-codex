/**
 * CSRF Token Management Utility
 *
 * Handles fetching and storing CSRF tokens for protected API requests.
 * Only needed in production - development mode skips CSRF validation.
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'csrf_token_expiry';
const TOKEN_LIFETIME_MS = 1000 * 60 * 60; // 1 hour

/**
 * Fetch a new CSRF token from the backend
 */
async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    const token = data.csrfToken;

    // Store token and expiry time
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));

    return token;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get the current CSRF token, fetching a new one if needed
 */
export async function getCsrfToken(): Promise<string> {
  // Check if we're in development mode (you might want to check an env variable)
  if (import.meta.env.DEV) {
    return ''; // Skip CSRF in development
  }

  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiryStr = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);

  // If we have a valid token that hasn't expired, use it
  if (storedToken && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() < expiry) {
      return storedToken;
    }
  }

  // Otherwise, fetch a new token
  return fetchCsrfToken();
}

/**
 * Clear the stored CSRF token (useful on logout)
 */
export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
}

/**
 * Add CSRF token to request headers
 */
export async function addCsrfHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCsrfToken();

  if (!token) {
    return headers; // No token needed (development mode)
  }

  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Wrapper for fetch that automatically includes CSRF token
 */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    options.headers = await addCsrfHeader(options.headers);
  }

  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || 'include',
  });

  // If we get a CSRF error, try refreshing the token and retrying once
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.code === 'EBADCSRFTOKEN' || errorData.message?.includes('CSRF')) {
      console.warn('CSRF token invalid, fetching new token and retrying...');

      // Clear old token and fetch new one
      clearCsrfToken();
      const newToken = await getCsrfToken();

      // Retry with new token
      const newHeaders = {
        ...options.headers,
        'X-CSRF-Token': newToken,
      };

      return fetch(url, {
        ...options,
        headers: newHeaders,
        credentials: options.credentials || 'include',
      });
    }
  }

  return response;
}
