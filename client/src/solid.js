
import { Session as InruptSession } from '@inrupt/solid-client-authn-browser';
console.log(" ----  PAGE IS RELOADED ---- ")
// Initialize Inrupt session
const session = new InruptSession();

// Demo configuration constant
const CSS_URL = import.meta.env.VITE_CSS_URL || 'http://localhost:4000/';

const resourceInput = document.getElementById('resourceInput');
const cssUrlInput = document.getElementById('cssurl');
const loginStatusDiv = document.getElementById('loginStatus');
const redirectUrl = document.getElementById('redirect_url')
const resourceContentDiv = document.getElementById('resourceContent');
const podProviderUrlInput = document.getElementById("cssurl");


const fetchResourceButton = document.getElementById("fetchResource")
const loginGithubButton = document.getElementById("startGithubLogin")
const loginGoogleButton = document.getElementById("startGoogleLogin")
const loginEmailPasswordButton = document.getElementById("startEmailPasswordLogin")
const logout = document.getElementById("logout");



// Set initial values in the UI
resourceInput.value = `${CSS_URL}`;
cssUrlInput.value = CSS_URL;
// TODO: fetch URL dynamically instead of hardcoded

podProviderUrlInput.addEventListener("change", () => {
  CSS_URL = podProviderUrlInput.value
})



logout.addEventListener("click", async () => {
  
  if (session.info.isLoggedIn) {
    await session.logout();
    window.location.reload()
  }
  if (!session.info.isLoggedIn) {
    fileContentDiv.textContent = "Cannot show file - not logged in.";
    return;
  }else{
    console.log("SESSION", session)
    // const options =   { headers: { authorization: `CSS-Account-Token ${session.info.sessionId}` } }
    const controls = await get_controls()

  const login_resp = await session.fetch(controls.account.logout, { credentials: 'include', method: 'post'})
  console.log("RESP", await login_resp.json())
  window.location.reload()
}
})


loginEmailPasswordButton.addEventListener("click", async () => {
  if (!session.info.isLoggedIn) {
    // Initiate login
    await session.login({
      oidcIssuer: CSS_URL,
      redirectUrl: window.location.href,
      clientName: "Solid Demo App",
      prompt: "consent", 
      acrValues: "my acr value",
    });
  } 
  // else {
  //   // Logout
  //   await session.logout();
  //   window.location.reload();
  // }
});


/**
 * Fetch and display a resource.
 */
const fetchResource = async () => {
  console.log("Fetching file using session:", session);
  resourceContentDiv.textContent = "";

  const _fetch = session.info.isLoggedIn ? session.fetch : fetch;
  const resourceUrl =
    resourceInput.value.trim() || resourceInput.value;

  try {
    const response = await _fetch(resourceUrl);

    if (!response.ok) {
      resourceContentDiv.textContent = `Cannot show file: ${response.status} ${response.statusText}`;
      return;
    }

    // Display the text content of the resource
    const text = await response.text();
    resourceContentDiv.textContent = text;
  } catch (err) {
    resourceContentDiv.textContent = `Error fetching file: ${err}`;
  }
};

const forgeRedirectUrl = (code, state, provider_url) => {
  return `${window.location.href}?code=${code}&state=${state}&iss=${encodeURIComponent(provider_url)}`
}


/**
 * Initiate Inrupt login using Fedcm if the user is not already logged in.
 * @param {string} cssUrl - The CSS base URL.
 * @param {object} session - The Inrupt session object.
 */

const startLogin = async (login_endpoint) => {

  if (!session.info.isLoggedIn) {
    // Initiate login
    await session.login({
      oidcIssuer: CSS_URL,
      redirectUrl: window.location.href,
      clientName: "Solid Demo App",
      prompt: "consent", 
      handleRedirect: async (url) => {
        // TODO this should be fetched dynamically
        // TODO should pass the provider with somth likeproxy-auth?google
        const spoofed = url.replace('.oidc/auth', login_endpoint)
        window.location = spoofed
      }
    });
  } 
}

loginGoogleButton.addEventListener("click", async () => {
  await startLogin(".auth/google/login")
});

loginGithubButton.addEventListener("click", async () => {
  await startLogin(".auth/github/login")
});

fetchResourceButton.addEventListener("click", async () => {
  await fetchResource()
});


(async () => {
  await session.handleIncomingRedirect();
  if (session.info.isLoggedIn) {

    // loginGoogleButton.style['visibility'] = "hidden" ;
    // loginEmailPasswordButton.style['visibility'] = "hidden" ;
    // logout.style['visibility'] = "visible";
    console.log(`User is logged in with WebID: ${session.info.webId}`);
    loginStatusDiv.textContent = `${session.info.webId}`;
    loginStatusDiv.style.background = "green"
    logout.style['visibility'] = "visible" ;

    // Set resource placeholder to user’s Pod + something. 
    const webId = session.info.webId;
    console.log(session.info);
    const pod_url = webId.replace(CSS_URL + "/", "").replace("/profile/card#me", "");
    console.log(CSS_URL)
    const defaultResourceUrl = `${pod_url}/profile/`;
    resourceInput.value = defaultResourceUrl;
    resourceInput.placeholder = defaultResourceUrl;

  } else {

    logout.style['visibility'] = "hidden";
    loginStatusDiv.textContent = "Not logged in.";
    loginStatusDiv.style.background = "red"
  }
})();
