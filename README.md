# Local Development

In the root of this project, execute the following to start the servers and the static sites locally.

```bash
yarn # installs dependencies
yarn dev
```

- PCD Passport UI: http://localhost:3000/
- Example PCD App UI: http://localhost:3001/
- PCD Passport Server: http://localhost:3002/
- Example PCD App Server: http://localhost:3003/

## Database

# Production Deployment

## Passport

- static site is deployed to https://pcd-passport.com/
- server is deployed to https://api.pcd-passport.com/

## Example PCD App

- static site is deployed to https://consumer-client.onrender.com/
- server is deployed to https://consumer-server.onrender.com

## Notes

All are deployed on render.com. Their build settings are configured in the web UI. This means that if build scripts change for any of these 4 applications, those changes must be reflected in render.com's configurations for the changed application.
