# todo

- render english errors for email actions
- make the client poll all feeds immediately after user changes anything about their email list
- specific email copy for 'adding new email address' action with verification code
- add a copy of the 'export' button to the 'delete account' flow, and suggest the user downloads an export of their data
- add logging everywhere that is appropriate
- BUST THE CREDENTIAL CACHE TO SUPPORT NEW SCHEMA OF CACHE ENTRY
  - make sure adding a new email also busts the cache
- tests?
- update the state management to perform a migration from user's field `email` to `emails`

# done

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

# won't do

- multiple semaphore identities.
