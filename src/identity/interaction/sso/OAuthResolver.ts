import { Initializer, getLoggerFor, InteractionRoute, InternalServerError } from '@solid/community-server';
import { Issuer } from 'openid-client';

export class OAuthResolver extends Initializer {
  private readonly logger;
  private readonly callback_url;
  private readonly client_id;
  private readonly client_secret;
  private readonly issuer_url;
  private readonly authorization_endpoint;
  private readonly token_endpoint;
  public issuer: any;
  public client: any;

  public constructor(
    callback_route: InteractionRoute,
    client_id: string,
    client_secret: string,
    issuer_url: string,
    authorization_endpoint: string,
    token_endpoint: string,
  ) {
    super();
    this.callback_url = callback_route.getPath();
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.issuer_url = issuer_url;
    this.authorization_endpoint = authorization_endpoint;
    this.token_endpoint = token_endpoint;
    this.logger = getLoggerFor(this);
  }

  public async handle(input: void): Promise<void> {
    // this.issuer = await Issuer.discover('https://accounts.google.com');
    this.issuer = new Issuer({
      issuer: this.issuer_url,
      authorization_endpoint: this.authorization_endpoint,
      token_endpoint: this.token_endpoint,
      // Note: GitHub’s OAuth2 flow does not provide an id_token or userinfo endpoint.
    });
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


  // Helper function to exchange the authorization code for an access token.
  public async exchangeCodeForToken(code: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('client_id', this.client_id);         // Your GitHub OAuth app client id
    params.append('client_secret', this.client_secret);   // Your GitHub OAuth app client secret
    params.append('code', code);
    params.append('redirect_uri', this.callback_url);     // Must match your app configuration

    const response = await fetch('https://github.com/login/oauth/access_token', { // TODO hardcoded URL
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: params
    });
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
    // TODO not use any
    const content: any =  await response.json(); // Expected to return an object with access_token, token_type, etc.
    if (!content || !content.access_token) throw new InternalServerError('No token from the OAuth provider response')

    return content.access_token
  }

  public async getUniqueId(url: URL): Promise<string> {
    // Parse the query parameters from the callback URL.
    const code = url.searchParams.get('code')
    
    if (!code) throw new InternalServerError('URL from the OAuth provider doesn\'t contain a code.');

    const accessToken = await this.exchangeCodeForToken(code)

    // Use the access token to fetch the GitHub user info.
    const userResponse = await fetch('https://api.github.com/user', { // TODO hardcoded
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'YourAppName' // GitHub requires a User-Agent header.
      }
    });
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub user info: ${userResponse.statusText}`);
    }
    const userData = await userResponse.json();
    if (!userData)
      throw new InternalServerError("Coulnd get userData from github")

    // Here we use GitHub's unique numeric user ID as uid.
    const uid = (userData as any).id; // TODO

    return uid;
  }
  // public createCode(): { code_verifier: string, code_challenge: string } {
  //   const code_verifier = generators.codeVerifier();
  //   const code_challenge = generators.codeChallenge(code_verifier);
  //   return { code_verifier, code_challenge };
  // }

  // public async getTokenSet(queries: string, code_verifier: string | undefined) {
  //   const tokenSet = await this.client.callback(this.callback_url, queries, { code_verifier });
  //   return tokenSet;
  // }
}
