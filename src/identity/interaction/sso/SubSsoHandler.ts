import { object, string } from 'yup';
import { getLoggerFor } from '@solid/community-server';
import type { JsonRepresentation } from '@solid/community-server';
import { JsonInteractionHandler } from '@solid/community-server';
import type { JsonInteractionHandlerInput } from '@solid/community-server';
import type { JsonView } from '@solid/community-server';
import { parseSchema, validateWithError } from '@solid/community-server';
import { OIDCResolver, CDSA } from './OIDCResolver';
import { SessionStore } from './util/SessionStore';
import { v4 } from 'uuid';

type OutType = { sub: string };

const inSchema = object({
  url: string().required(),
});

/**
 * An API for retrieving sub information used by Sso's OIDC from Sso.
 */
export class SubSsoHandler extends JsonInteractionHandler implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly ssoOIDC: OIDCResolver;
  private readonly sessionStore: SessionStore;

  public constructor(ssoOIDC: OIDCResolver, sessionStore: SessionStore) {
    super();
    this.ssoOIDC = ssoOIDC;
    this.sessionStore = sessionStore;
  }

  public async getView(args: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

/*

*/
  public async handle(args: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const { url } = await validateWithError(inSchema, args.json);
    const cookie = args.metadata.get(CDSA.terms.cdsaCookie)?.value;
    if (!cookie) {
      throw new Error('SubSsoHandler: no cookie.');
    }
    const code_verifier = await this.sessionStore.get(cookie,'code_verifier');
    if (!code_verifier) {
      throw new Error('SubSsoHandler: no data of code_verifier.');
    }

    const queries = this.ssoOIDC.client.callbackParams(url);
    const tokenSet = await this.ssoOIDC.getTokenSet(queries,code_verifier);
    const claims = tokenSet.claims();
    const sub = claims.sub;
    this.sessionStore.delete(cookie,'code_verifier');

    return { json: { sub } };
  }
}
