## [live demo](https://sso-client.liquid.surf)

# setup

First you need to create OAuth client, and copy clientId and clientSecret value to ./config/github-secret.json

 - create a OAuth client account on google cloud
 - copy `./config/google-secret-example.json` to `./config/google-secret.json`
 - edit `./config/google-secret.json.json` with your credentials

Same goes with github or any other SSO provider.

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


Please do not use in production yet until we go through a security audit. Some security consideration are already written ./SECURITY.md 
There is WIP to fix that, see the branch `allowed_client_list`

# acknowledgement

Thanks to @elf-pavlik for his advice and code review
