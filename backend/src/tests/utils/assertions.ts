import { Response } from 'supertest';

/**
 * Assert response has standard error structure
 */
export function expectErrorResponse(response: Response, status: number, messageContains?: string) {
  expect(response.status).toBe(status);
  expect(response.body).toHaveProperty('message');

  if (messageContains) {
    expect(response.body.message).toContain(messageContains);
  }
}

/**
 * Assert response requires authentication
 */
export function expectUnauthorized(response: Response) {
  expectErrorResponse(response, 401, 'Not authenticated');
}

/**
 * Assert response requires admin
 */
export function expectForbidden(response: Response) {
  expectErrorResponse(response, 403);
}

/**
 * Assert successful response with data
 */
export function expectSuccess(response: Response, status: number = 200) {
  expect(response.status).toBe(status);
  expect(response.body).toBeTruthy();
}

/**
 * Assert user object doesn't contain sensitive fields
 */
export function expectNoSensitiveFields(userObj: any) {
  expect(userObj).not.toHaveProperty('password');
  expect(userObj).not.toHaveProperty('__v');
}

/**
 * Assert pagination structure
 */
export function expectPaginationResponse(response: Response, expectedLength?: number) {
  expectSuccess(response);
  expect(response.body).toHaveProperty('data');
  expect(Array.isArray(response.body.data)).toBe(true);

  if (expectedLength !== undefined) {
    expect(response.body.data).toHaveLength(expectedLength);
  }
}
