import type { EmptyObject } from '@solid/community-server';
import { parsePath, verifyAccountId } from '@solid/community-server';
import type { JsonRepresentation } from '@solid/community-server';
import type { JsonInteractionHandlerInput } from '@solid/community-server';
import { JsonInteractionHandler } from '@solid/community-server';
import type { SsoIdRoute } from './util/SsoIdRoute';
import type { SsoStore } from './util/SsoStore';

/**
 * Handles the deletion of a Sso login method.
 */
export class DeleteSsoHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly ssoStore: SsoStore;
  private readonly ssoRoute: SsoIdRoute;

  public constructor(ssoStore: SsoStore, ssoRoute: SsoIdRoute) {
    super();
    this.ssoStore = ssoStore;
    this.ssoRoute = ssoRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const match = parsePath(this.ssoRoute, target.path);

    const login = await this.ssoStore.get(match.ssoId);
    verifyAccountId(accountId, login?.accountId);

    await this.ssoStore.delete(match.ssoId);

    return { json: {}};
  }
}
