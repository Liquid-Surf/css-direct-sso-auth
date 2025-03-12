/**
 * The constant used to identify Sso auth based login information in the map of logins an account has.
 */
export const SSO_METHOD = 'sso';

/**
 * Responsible for storing everything related to Sso auth based login information.
 */
export interface SsoStore {
  /**
   * Creates a new login entry for this account.
   *
   * @param sso_sub - Sso OIDC sub claim.
   * @param accountId - Account ID.
   */
  create: (sso_sub: string, accountId: string) => Promise<string>;

  /**
   * Finds the sso_sub associated with this login ID.
   *
   * @param id - The ID of the login object.
   */
  get: (id: string) => Promise<{ sso_sub: string; accountId: string } | undefined>;

  /**
   * Finds the account and login ID associated with this sso_sub.
   *
   * @param sso_sub - Sso OIDC sub claim.
   */
  findBySsoSub: (sso_sub: string) => Promise<{ accountId: string; id: string } | undefined>;

  /**
   * Find all login objects created by this account.
   *
   * @param accountId - ID of the account to find the logins for.
   */
  findByAccount: (accountId: string) => Promise<{ id: string; sso_sub: string }[]>;

  /**
   * Authenticate if the user pass Sso authentication and return the account and login ID if they are.
   * Throw an error if the user can not.
   *
   */
  authenticate: (sso_sub: string) => Promise<{ accountId: string; id: string }>;

  /**
   * Delete the login entry.
   *
   * @param id - ID of the login object.
   */
  delete: (id: string) => Promise<void>;
}
