import { getLoggerFor } from '@solid/community-server';
import type { HttpHandlerInput } from '@solid/community-server';
import { HttpHandler } from '@solid/community-server';
import { OIDCResolver } from './identity/interaction/sso/OIDCResolver';
import { OAuthResolver } from './identity/interaction/sso/OAuthResolver';
import { SessionStore } from './identity/interaction/sso/util/SessionStore';
import { generators } from 'openid-client';
import { v4 } from 'uuid'

/**
 * HTTP handler to provide a endpoint to css.
 */

export class RedirectEndpointHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly ssoOidc
  private readonly sessionStore
  private readonly cookieName

  constructor(
    identityResolvers: Array<OIDCResolver | OAuthResolver>,
    sessionStore: SessionStore,
    cookieName: string
  ) {
    super();
    this.ssoOidc = identityResolvers[0]
    this.sessionStore = sessionStore;
    this.cookieName = cookieName
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
 
    const host = request.headers.host || 'localhost';
    const requestUrl = new URL(request.url as string, `http://${host}`);
    const rp_client_id = requestUrl.searchParams.get('client_id') || ''
    const rp_redirect_uri = requestUrl.searchParams.get('redirect_uri') || ''
    const rp_state = requestUrl.searchParams.get('state') || ''
    const rp_code_challenge = requestUrl.searchParams.get('code_challenge') || ''
    const rp_code_challenge_method = requestUrl.searchParams.get('code_challenge_method') || ''
    const rp_origin = request.headers.referer || ''

    // const response_type = requestUrl.searchParams.get('response_type')
    // const prompt = requestUrl.searchParams.get('prompt')

    const cookieValue = v4()

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


