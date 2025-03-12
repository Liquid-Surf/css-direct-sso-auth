/**
 * Store for saving session information necessary only for Sso authentication
 */
export interface SessionStore {
/**
 * Set with cookie, key, and value. The value is a string.
 */
  set: (cookie: string, key: string, value: string) => Promise<void>;

/**
 * Get the value specified by the key from the cookie. The value is a string.
 */
  get: (cookie: string, key: string) => Promise<string | undefined>;

  /**
  * Delete the value specified by the key from the cookie.
  */
  delete: (cookie: string, key: string) => Promise<boolean>;
}
