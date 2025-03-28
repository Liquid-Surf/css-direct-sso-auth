import { BadRequestHttpError, getLoggerFor } from '@solid/community-server';
import type { HttpHandlerInput } from '@solid/community-server';
import { HttpHandler } from '@solid/community-server';
import { OIDCResolver } from './identity/interaction/sso/OIDCResolver';
import { OAuthResolver } from './identity/interaction/sso/OAuthResolver';
import { SessionStore } from './identity/interaction/sso/util/SessionStore';
import { generators } from 'openid-client';
import { v4 } from 'uuid'

interface ClientConfig {
  client_id: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
}

/**
 * HTTP handler to provide a endpoint to css.
 */

export class RedirectEndpointHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly ssoOidc;
  private readonly sessionStore;
  private readonly cookieName;
  private readonly allowedClient;

  constructor(
    identityResolvers: Array<OIDCResolver | OAuthResolver>,
    sessionStore: SessionStore,
    cookieName: string,
    allowedClient: string
  ) {
    super();
    this.ssoOidc = identityResolvers[0];
    this.sessionStore = sessionStore;
    this.cookieName = cookieName;
    this.allowedClient = allowedClient;
  }

  private async validateClient(clientId: string, redirectUri: string): Promise<boolean> {
    try {
      // Fetch client configuration from client_id endpoint
      const response = await fetch(clientId);
      if (!response.ok) {
        this.logger.warn(`Failed to fetch client configuration from ${clientId}`);
        return false;
      }

      const clientConfig: ClientConfig = await response.json();

      if (clientConfig.client_id !== this.allowedClient) {
        this.logger.warn(`Client ID mismatch: ${clientConfig.client_id} != ${this.allowedClient}`);
        return false;
      }


      if (!clientConfig.redirect_uris.includes(redirectUri)) {
        this.logger.warn(`Invalid redirect URI: ${redirectUri}`);
        return false;
      }

      const allowedGrantTypes = ['authorization_code', 'refresh_token'];
      if (!clientConfig.grant_types.every(type => allowedGrantTypes.includes(type))) {
        this.logger.warn(`Invalid grant types: ${clientConfig.grant_types.join(', ')}`);
        return false;
      }

      if (!clientConfig.response_types.includes('code')) {
        this.logger.warn(`Invalid response types: ${clientConfig.response_types.join(', ')}`);
        return false;
      }

      const allowedScopes = ['openid', 'profile', 'offline_access', 'webid'];
      const requestedScopes = clientConfig.scope.split(' ');
      if (!requestedScopes.every(scope => allowedScopes.includes(scope))) {
        this.logger.warn(`Invalid scopes requested: ${clientConfig.scope}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating client: ${error}`);
      return false;
    }
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const host = request.headers.host || 'localhost';
    const requestUrl = new URL(request.url as string, `http://${host}`);
    const rp_client_id = requestUrl.searchParams.get('client_id') || '';
    const rp_redirect_uri = requestUrl.searchParams.get('redirect_uri') || '';
    
    // Validate client configuration
    if (!await this.validateClient(rp_client_id, rp_redirect_uri)) {
      this.logger.warn(`Unauthorized client attempt: ${rp_client_id}`);
      throw new BadRequestHttpError( 'Unauthorized client attempt', { errorCode: '403'});
      return;
    }

    const rp_state = requestUrl.searchParams.get('state') || '';
    const rp_code_challenge = requestUrl.searchParams.get('code_challenge') || '';
    const rp_code_challenge_method = requestUrl.searchParams.get('code_challenge_method') || '';
    const rp_origin = request.headers.referer || '';

    // Validate origin matches client_id domain
    if (rp_origin) {
      const originUrl = new URL(rp_origin);
      const clientIdUrl = new URL(rp_client_id);
      if (originUrl.origin !== clientIdUrl.origin) {
        this.logger.warn(`Origin mismatch: ${originUrl.origin} != ${clientIdUrl.origin}`);
        throw new BadRequestHttpError( 'Origin does not match client_id domain', { errorCode: '403'});
        return;
      }
    }

    const cookieValue = v4();

    this.sessionStore.set(cookieValue, 'rp_client_id', rp_client_id);
    this.sessionStore.set(cookieValue, 'rp_redirect_uri', rp_redirect_uri);
    this.sessionStore.set(cookieValue, 'rp_state', rp_state);
    this.sessionStore.set(cookieValue, 'rp_code_challenge', rp_code_challenge);
    this.sessionStore.set(cookieValue, 'rp_code_challenge_method', rp_code_challenge_method);
    this.sessionStore.set(cookieValue, 'rp_origin', rp_origin);

    // const { code_verifier: sso_code_verifier, code_challenge: sso_code_challenge } = this.ssoOidc.createCode();
    // const { code_challenge: sso_code_challenge } = this.ssoOidc.createCode()
    // this.sessionStore.set(cookieValue, 'sso_code_verifier', sso_code_verifier);

    const code_verifier = generators.codeVerifier();
    const sso_code_challenge = generators.codeChallenge(code_verifier);

    const params = {
      scope: 'openid email profile',
      sso_code_challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    };
    let location = this.ssoOidc.client.authorizationUrl(params);

    // necessary to match CGP OAuth redirect url
    const cookies = [`${this.cookieName}=${cookieValue}; Path=/; SameSite=Lax;`]

    response.writeHead(303, {
      'location': location,
      'Set-Cookie': cookies
    });
    response.end()
  }
}


