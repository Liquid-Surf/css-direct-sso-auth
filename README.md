## [live demo](https://sso-client.liquid.surf)

## [motivation](https://www.liquid.surf/2025/3/16/Bridging-the-User-Adoption-Gap-through-SSO-authentification)

# setup

First you need to create OAuth client, and copy clientId and clientSecret value to ./config/google-secret.json 



Then:

 - create a OAuth client account on google cloud. The redirect URL is  
   - `http://localhost:4000/google-callback/` ( and   `http://localhost:4000/github-callback/` for github )
 - copy `./config/google-secret-example.json` to `./config/google-secret.json`
 - edit `./config/google-secret.json.json` with your credentials

Same goes with github or any other SSO provider.

If you want only github or only google, remove the [appropiate import line in config.json](https://github.com/Liquid-Surf/css-direct-sso-auth/blob/612f20b159e8ff6ba087ca6f0cee6558ac0c60c1/config.json#L9-L10)


# install and start


```
npm i
npm run build
npm run start
```


To run test or try the component, we have a helpful client:
```
cd client
npm i
npm run dev
```


# how to run E2E test

 - start ./client/ with `npm run dev` ( will run on port 1234 )
 - put the name ( usually firt name + family name ) in the .env like:
```
ACCOUNT_NAME="john doe"
```
 - then run the server with `npm run start` ( will run on port 4000 )
 - for the first test: `npm run test:setup`
   - will ask you to login with a google account and store the cookie for next test
 - after that, just run `npm run test`

# related work

https://github.com/ksaito-hiu/css-google-auth

# security 


Please use in production at your own risk, we havn't went through a security audit yet. Some security consideration are already written ./SECURITY.md 
~~There is WIP to fix that, see the branch `allowed_client_list`~~

# acknowledgement

Thanks to @elf-pavlik for his advice and code review
