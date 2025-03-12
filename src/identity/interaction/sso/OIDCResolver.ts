import { Initializer, getLoggerFor, InteractionRoute } from '@solid/community-server';
import { Issuer, generators } from 'openid-client';
import { createVocabulary } from '@solid/community-server';

// Define vocabulary related to cookies.
export const CDSA = createVocabulary(
  'urn:npm:css-direct-sso-auth:http:',
  // Used for metadata for cookie used in OIDCResolver.
  'cdsaCookie',
  'cdsaCookieExpiration'
);

export class OIDCResolver extends Initializer {
  private readonly logger;
  private readonly callback_url;
  private readonly client_id;
  private readonly client_secret;
  private readonly issuer_url;
  private issuer: any;
  public client: any;

  public constructor(callback_route: InteractionRoute, client_id: string, client_secret: string, issuer_url: string) {
    super();
    this.callback_url = callback_route.getPath();
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.issuer_url = issuer_url;
    this.logger = getLoggerFor(this);
  }

  public async handle(input: void): Promise<void> {
    // this.issuer = await Issuer.discover('https://accounts.google.com');
    this.issuer = await Issuer.discover(this.issuer_url);
    const redirect_uris = [this.callback_url];
    try {
      this.client = new this.issuer.Client({
        client_id: this.client_id,
        client_secret: this.client_secret,
        redirect_uris,
        response_types: ['code'],
      });
      this.logger.info('Sso OIDC Client ready.');
    } catch (err) {
      this.logger.error('Sso OIDC Client could not initialize.');
    }
  }

  // public createCode(): { code_verifier: string, code_challenge: string } {
  //   const code_verifier = generators.codeVerifier();
  //   const code_challenge = generators.codeChallenge(code_verifier);
  //   return { code_verifier, code_challenge };
  // }

  public async getTokenSet(queries: string, code_verifier: string | undefined) {
    const tokenSet = await this.client.callback(this.callback_url, queries, { code_verifier });
    return tokenSet;
  }
  public async getUniqueId(url: URL): Promise<string> {
    const queries = this.client.callbackParams(url.toString());
    const tokenSet = await this.getTokenSet(queries, undefined);
    const claims = tokenSet.claims();
    return claims.sub;
  }
}
