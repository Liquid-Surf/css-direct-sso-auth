import { AccountStore, CookieStore, CreatePodHandler, getLoggerFor, JsonInteractionHandlerInput, ProviderFactory, readableToString, WebIdStore } from '@solid/community-server';
import type { HttpHandlerInput, HttpRequest } from '@solid/community-server';
import { HttpHandler } from '@solid/community-server';
import { OIDCResolver } from './identity/interaction/sso/OIDCResolver';
import { SessionStore } from './identity/interaction/sso/util/SessionStore';
import { SsoStore } from './identity/interaction/sso/util/SsoStore';
import Provider from '@solid/community-server/templates/types/oidc-provider';
import { BadRequestHttpError, InternalServerError } from '@solid/community-server';

export class CallbackHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);
  private readonly sessionStore: SessionStore;
  private readonly ssoStore: SsoStore;
  private readonly accountStore: AccountStore
  private readonly ssoOIDC: OIDCResolver;
  private readonly providerFactory: ProviderFactory;
  private readonly createPodHandler: CreatePodHandler;
  private readonly webIdStore: WebIdStore;
  private readonly baseUrl: string;
  private readonly cookieName: string

  constructor(
    sessionStore: SessionStore,
    ssoStore: SsoStore,
    accountStore: AccountStore,
    ssoOIDC: OIDCResolver,
    providerFactory: ProviderFactory,
    createPodHandler: CreatePodHandler,
    webIdStore: WebIdStore,
    baseUrl: string,
    cookieName: string
  ) {
    super();
    this.sessionStore = sessionStore;
    this.ssoStore = ssoStore;
    this.accountStore = accountStore;
    this.ssoOIDC = ssoOIDC;
    this.providerFactory = providerFactory;
    this.createPodHandler = createPodHandler;
    this.webIdStore = webIdStore
    this.baseUrl = baseUrl
    this.cookieName = cookieName
  }
  // Parses a cookie header string into a key/value record.
  private cookieParser(cookieString: string): Record<string, string> {
    return cookieString.split('; ').reduce((acc, cookie) => {
      const [key, value] = cookie.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  private async getCode(
    clientId: string,
    codeChallenge: string,
    codeChallengeMethod: string,
    webId: string,
    provider: Provider
  ): Promise<string> {


    // 2. Determine the client (e.g., if client_id is known for this FedCM context)
    const client = await provider.Client.find(clientId);
    if (!client) 
      throw new InternalServerError('Error witht the OIDC provider: client not found')

    // 3. Ensure a grant exists for this client (create one if needed, to attach scopes)
    // let grantId = session.grantIdFor(client.clientId);
    // grantId = session.ensureGrant(client.clientId);  // pseudo-method: create new grantId and link to session
    // Optionally, use provider.Grant to persist allowed scopes for this grant
    // accountId in CSS != accountId for oidc-provider, oidc-provider uses webId as accountId
    const grant = new provider.Grant({ clientId: client.clientId, accountId: webId });
    grant.addOIDCScope('openid profile offline_access webid');
    const grantId = await grant.save();
    // (The library auto-saves the grant when issuing tokens if not done explicitly)
    // grantId = session.grantIdFor(client.clientId)

    if (!client.redirectUris || client.redirectUris.length < 1) 
      throw new InternalServerError('Error witht the OIDC provider: client doesn\'t have a redirect URI')

    // 4. Create an AuthorizationCode instance with necessary details
    const AuthorizationCode = provider.AuthorizationCode;  // class access
    const code = new AuthorizationCode({
      accountId: webId,
      client,
      redirectUri: client.redirectUris[0],      // or a specific one intended for this flow
      scope: 'webid openid profile offline_access', // TODO should be just webId ?
      grantId: grantId,
      gty: 'authorization_code',
      // If PKCE is required by this client or desired, you would include codeChallenge fields:
      codeChallenge,
      codeChallengeMethod,
      resource: 'solid', // required to return an access token in a JWT format
      // Other fields like acr, amr, authTime, nonce can be set if applicable:
      // acr: session.acr, amr: session.amr, authTime: session.authTime,
      // nonce: (if this code is intended for an OpenID ID Token and nonce was provided by RP)
    });
    // 5. Save the code to generate the value
    const codeValue = await code.save();

    // 6. Respond to FedCM request with the code (e.g., as JSON)
    return codeValue

  }
  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const cookies = this.cookieParser(request.headers.cookie || '');
    const cdsaCookie = cookies[this.cookieName];
    const provider = await this.providerFactory.getProvider()

    if (!cdsaCookie) {
      throw new BadRequestHttpError('SsoLoginHandler: no cookie.');
    }
    let state: string | undefined
    let client_id: string | undefined
    let code_challenge: string | undefined
    let code_challenge_method: string | undefined
    let origin: string | undefined
    try {
      state = await this.sessionStore.get(cdsaCookie, 'rp_state');
      client_id = await this.sessionStore.get(cdsaCookie, 'rp_client_id');
      code_challenge = await this.sessionStore.get(cdsaCookie, 'rp_code_challenge');
      code_challenge_method = await this.sessionStore.get(cdsaCookie, 'rp_code_challenge_method');
      origin = await this.sessionStore.get(cdsaCookie, 'rp_origin');
    } catch (err) {
      this.logger.error('Error retrieving value from session:' + err);
      throw new InternalServerError('Error accessing session data. ' + err);
    }
    if (!state || !client_id || !code_challenge || !code_challenge_method || !origin)
      throw new InternalServerError('state, client_id, code_challenge or origin not found in session. ')
    try {
      await this.sessionStore.delete(cdsaCookie, 'sso_code_verifier');
      await this.sessionStore.delete(cdsaCookie, 'rp_state');
      await this.sessionStore.delete(cdsaCookie, 'rp_client_id');
      await this.sessionStore.delete(cdsaCookie, 'rp_code_challenge');
      await this.sessionStore.delete(cdsaCookie, 'rp_code_challenge_method');
      await this.sessionStore.delete(cdsaCookie, 'rp_code_verifier');
      await this.sessionStore.delete(cdsaCookie, 'rp_origin');
    } catch (err) {
      this.logger.error('Error deleting code_verifier from session:' + err);
      throw new InternalServerError('CallbackHandler: failed to clean up session.');
    }

    // ----- LOGIN -----
    const { accountId } = await this.processLogin(url);

    const accountLinks = await this.webIdStore.findLinks(accountId)

    if (!accountLinks || accountLinks.length < 1)
      throw new InternalServerError('No webId linked to this account.');
    if (accountLinks.length > 1)
      throw new InternalServerError('Account should have one and only one WebID, found ' + accountLinks.length);

    const webId = accountLinks[0].webId

    const code = await this.getCode(
      client_id,
      code_challenge,
      code_challenge_method,
      webId,
      provider
    )

    // TODO check if origin match redirect URI ?

    const finalRedirect = this.forgeRedirectUrl(origin, code, state)
    response.writeHead(303, {
      'location': finalRedirect,
    });
    response.end();

  }

  private forgeRedirectUrl(origin: string, code: string, state: string): string {
    let origin_clean = origin.slice(-1) == '/' ? origin.slice(0, -1) : origin
    return `${origin_clean}/?code=${code}&state=${state}&iss=${this.baseUrl}`
  }
  // LOGIN: Extract the code_verifier, perform token exchange and authenticate the user.
  private async processLogin(url: URL): Promise<{ accountId: string }> {
    let unique_id;
    try {
      unique_id = await this.ssoOIDC.getUniqueId(url)

    } catch (err) {
      this.logger.error('Error during token exchange:' + err);
      throw new InternalServerError('SsoLoginHandler: token exchange failed.');
    }


    let accountId = "dummy";

    const foundAccount = await this.ssoStore.findBySsoSub(unique_id)
    try {
      if (!foundAccount) {
        // CREATE ACCOUNT
        // code from RegisterSsoAccountHandler
        accountId = await this.accountStore.create();
        await this.ssoStore.create(unique_id, accountId);
        if (accountId) {
          //unique_id is unique to sso, in the (extremely) rare case where 
          // an account from eg. github would have the same sub this would 
          // raise a conflict, so we need to append a unique string relative 
          //to the OIDC provider
          const json = { name: `ggl_${unique_id}` } // TODO hardocded ggl_

          await this.createPodHandler.handle({ json, accountId } as JsonInteractionHandlerInput)
        }
      } else {
        // TOOD account already have accountId, do I need to authenticate ?
        ({ accountId } = await this.ssoStore.authenticate(unique_id));
      }
    } catch (err) {
      this.logger.error('Error during SsoStore authentication:' + err);
      throw new InternalServerError('SsoLoginHandler: authentication failed.');
    }

    return { accountId };
  }

}


