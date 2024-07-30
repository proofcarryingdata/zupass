# todo

- everywhere in the UI that displays a single email, make it display multiple
  - in the modals that ask you to add/change password
  - top of settings modal
  - add subscriptions screen
- conclusively remove dead code that is incompatible with the updated model
  - offline ticket code
  - ticket redaction code
- make sure `saveUser.tsx` is doing the right thing
- make sure all the database queries that return a user join on the new email<->user table
- figure out wtf is going on with the old zupass user data model and update it to be compat.
- implement backend routes for all three of {change, update, delete} email
- figure out how to make `CredentialSubservice` compatible with this new paradigm
- go through `userService` and make sure everything is coherent
- fix existing tests
- make sure that you can log in to an account that has multiple email addresses with any of the email addresses
  - make sure that the `salt` api returns the right salt if you send it any of the email addresses associated with the account
- make the various email-updating server routes return an 'already registered' error
  - pipe it through to the frontend, suggest the user logs in and exports + deletes their data
- add a copy of the 'export' button to the 'delete account' flow, and suggest the user downloads an export of their data
- make use of all the email pcds you get for polling feeds
- make the server return multiple email PCDs if you have multiple emails
- unify the email editing form, it's currently three forms
  - list of emails
  - button to add an email
  - if you have more than one email, add button to remove any of the emails
  - if you have only one one email, add button to change your email
- update the state management to perform a migration from user's field `email` to `emails`
  - probably in 'load initial state'
- ensure that the client and server are on the same version
  - pass in a 'version' parameter to APIs that return user data so that the client and server do not desync
- update all the backend logic to be compatible with multi-email users
- go through all the edited files and update my cursory fixes to their final correct form
- think through all the potential concurrency issues and preempt them.
- tests?

# won't do

- multiple semaphore identities.
