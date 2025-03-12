import type { AccountIdKey, AccountIdRoute } from '@solid/community-server';
import { IdInteractionRoute } from '@solid/community-server';
import type { ExtendedRoute } from '@solid/community-server';

export type SsoIdKey = 'ssoId';

/**
 * An {@link AccountIdRoute} that also includes a sso login identifier.
 */
export type SsoIdRoute = ExtendedRoute<AccountIdRoute, SsoIdKey>;

/**
 * Implementation of an {@link SsoIdRoute} that adds the identifier relative to a base {@link AccountIdRoute}.
 */
export class BaseSsoIdRoute extends IdInteractionRoute<AccountIdKey, SsoIdKey> {
  public constructor(base: AccountIdRoute) {
    super(base, 'ssoId');
  }
}
