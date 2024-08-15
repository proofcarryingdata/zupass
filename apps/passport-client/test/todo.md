# todo

- add logging everywhere that is appropriate
- re-read `Credential.ts`
- remove this todo file
- test on ivan-staging
- deploy
- test on prod

# done

- manually test:

  - apps/passport-client/components/modals/RequireAddPasswordModal.tsx
  - apps/passport-client/components/modals/SettingsModal.tsx
  - apps/passport-client/components/modals/UpgradeAccountModal.tsx
  - apps/passport-client/components/screens/AddEmailScreen.tsx
  - apps/passport-client/components/screens/AddScreen/JustAddScreen.tsx
  - apps/passport-client/components/screens/AddSubscriptionScreen.tsx
  - apps/passport-client/components/screens/ChangeEmailScreen.tsx
  - apps/passport-client/components/screens/ChangePasswordScreen.tsx
  - apps/passport-client/components/screens/LoginScreens/CreatePasswordScreen.tsx
  - apps/passport-client/components/screens/LoginScreens/OneClickLoginScreen.tsx
  - apps/passport-client/components/screens/RemoveEmailScreen.tsx
  - apps/passport-client/components/shared/NewPasswordForm.tsx
  - upgrading from old account to new account
  - creating a new account

- PODPipeline should also have the new loaded check added to it, though I can pick that up if you don't want to add it.
- Because this branched off before PODPipeline was merged, I think these changes might break PODPipeline, and you might see some test failures around feed issuance when you merge/rebase with main
- tests.
- consider `ZupassUserJson` being incompatible in the new version
- fix problem where too many fields are returned from `fetchZuconnect` and `fetchZuzalu` - users
- need to warn people about potentially destructive actions, and confirm befre executing them
- make error message for when an email already exists in the user table actually communicate that to the user
- e2e manual test this myself
  - richard's confirmation code + stale state bugs
  - unknown error
  - mostly error handling
- consider what's happening with zuzalu tickets
- consider RMW race condition
- change the credential thing such that the email credential type includes multiple emails
  - this will trickle out into the credential manager and all the invocation of get credential
- make `CredentialSubservice` compatible with email credentials that contain multiple emails
- remove devconnect code from `issuanceService`
- turn off turning off eslint in issuance service
- fix nested `retry` logic in `saveUser`
- fix table join from `left join` to just `join`
- clean up old 'credential-cache'
- 'change' route should take in 'old email'
- make loading 'self' safe via the `loadSelf` function
- fix incorrect error message in `AddEmailScreen`
- display your current emails in all the screens that let you edit your email addresses
- render english errors for email actions
- loading spinner on change email pages is horizontal not vertical - fix
- limit max quantity of emails an account can have.
- update the state management to perform a migration from user's field `email` to `emails`
- when 'extra fetch' is requested, make sure the email feed is hit first.
- BUST THE CREDENTIAL CACHE TO SUPPORT NEW SCHEMA OF CACHE ENTRY
  - make sure adding a new email also busts the cache
- make the client poll all feeds immediately after user changes anything about their email list
- new users<->emails datamodel in database
- update all the backend logic to becompatible with multi-email users
- fix existing tests
- conclusively remove dead code that is incompatible with the updated model
  - offline ticket code
  - ticket redaction code
- everywhere in the UI that displays a single email, make it display multiple
  - in the modals that ask you to add/change password
  - top of settings modal
  - add subscriptions screen
  - probably in 'load initial state'
- make sure that the `salt` api returns the right salt if you send it any of the email addresses associated with the account
- make sure that you can log in to an account that has multiple email addresses with any of the email addresses
- make use of all the email pcds you get for polling feeds
- make the server return multiple email PCDs if you have multiple emails
- figure out wtf is going on with the old zupass user data model and update it to be compat.
- make sure all the database queries that return a user join on the new email<->user table
- make the various email-updating server routes return an 'already registered' error
- implement backend routes for all three of {change, update, delete} email
- make sure `saveUser.tsx` is doing the right thing
- go through `userService` and make sure everything is coherent
- turn off old auth key feature.
- specific email copy for 'adding new email address' action with verification code

# won't do

- multiple semaphore identities.
- copy that communicates how to 'merge'
- stable order for user email addresses
- add a copy of the 'export' button to the 'delete account' flow, and suggest the user downloads an export of their data
