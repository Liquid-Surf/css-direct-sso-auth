import { Initializer } from '@solid/community-server';
import { getLoggerFor } from '@solid/community-server';
import { BadRequestHttpError } from '@solid/community-server';
import { createErrorMessage } from '@solid/community-server';
import { ForbiddenHttpError } from '@solid/community-server';
import { InternalServerError } from '@solid/community-server';
import { ACCOUNT_TYPE } from '@solid/community-server';
import type { AccountLoginStorage } from '@solid/community-server';
import type { SsoStore } from './SsoStore';

export const SSO_STORAGE_TYPE = 'sso';
export const SSO_STORAGE_DESCRIPTION = {
  sso_sub: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
} as const;

/**
 * A {@link SsoStore} that uses a {@link KeyValueStorage} to store the entries.
 * Sso sub claims are hashed and salted.
 * Default `saltRounds` is 10.
 */
export class BaseSsoStore extends Initializer implements SsoStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [SSO_STORAGE_TYPE]: typeof SSO_STORAGE_DESCRIPTION }>;
  private readonly saltRounds: number;
  private initialized = false;

  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>, saltRounds = 10) {
    super();
    this.storage = storage as unknown as typeof this.storage;
    this.saltRounds = saltRounds;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
//console.log('GAHA: BaseSsoStore#handle');
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(SSO_STORAGE_TYPE, SSO_STORAGE_DESCRIPTION, true);
      await this.storage.createIndex(SSO_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(SSO_STORAGE_TYPE, 'sso_sub');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining Sso infomation in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async create(sso_sub: string, accountId: string): Promise<string> {
    if (await this.findBySsoSub(sso_sub)) {
      this.logger.warn(`Trying to create duplicate login for sso_sub ${sso_sub}`);
      throw new BadRequestHttpError('There is an entry for this sso_sub already.');
    }
    const payload = await this.storage.create(SSO_STORAGE_TYPE, {
      accountId,
      sso_sub,
    });
    return payload.id;
  }

  public async get(id: string): Promise<{ sso_sub: string; accountId: string } | undefined> {
    const result = await this.storage.get(SSO_STORAGE_TYPE, id);
    if (!result) {
      return;
    }
    return { sso_sub: result.sso_sub, accountId: result.accountId };
  }

  public async findBySsoSub(sso_sub: string): Promise<{ accountId: string; id: string } | undefined> {
    const payload = await this.storage.find(SSO_STORAGE_TYPE, { sso_sub });
    if (payload.length === 0) {
      return;
    }
    return { accountId: payload[0].accountId, id: payload[0].id };
  }

  public async findByAccount(accountId: string): Promise<{ id: string; sso_sub: string }[]> {
    return (await this.storage.find(SSO_STORAGE_TYPE, { accountId }))
      .map(({ id, sso_sub }): { id: string; sso_sub: string } => ({ id, sso_sub }));
  }

  public async authenticate(sub: string): Promise<{ accountId: string; id: string }> {
    const sso_sub = sub;
    const payload = await this.storage.find(SSO_STORAGE_TYPE, { sso_sub });
    if (payload.length === 0) {
      this.logger.warn(`Trying to get account info for unknown sso_sub ${sso_sub}`);
      throw new ForbiddenHttpError('Invalid sso authentication.');
    }
    const { accountId, id } = payload[0];
    return { accountId, id };
  }

  public async delete(id: string): Promise<void> {
    return this.storage.delete(SSO_STORAGE_TYPE, id);
  }
}
