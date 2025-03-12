import express from "express";

const app = express();
const port = process.env.PORT || 6080;
const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${port}/`;

app.use(express.static('public'));



const clientId = {
  "@context": ["https://www.w3.org/ns/solid/oidc-context.jsonld"],

  "client_id": `${CLIENT_URL}clientid`,
  "client_name": "Solid Application Name",
  "redirect_uris": [`${CLIENT_URL}`],
  "scope" : "openid profile offline_access webid",
  "grant_types" : ["refresh_token","authorization_code"],
  "response_types" : ["code"],
  "default_max_age" : 3600,
  "require_auth_time" : true
}

app.get("/clientid", (req, res) => {
  res.contentType('application/ld+json')
  res.status(200).send(clientId);
});



app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
