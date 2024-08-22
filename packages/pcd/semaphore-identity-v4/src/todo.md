# todo

- upload v4 commitment to zupass wherever we already do so for v3
- create and upload v4 identity on login
- migrate alread-logged-in clients
  - make user with 2 logged in clients migrates without conflicts
- semaphore v4 identity pcd tests
  - (luckily, i think the tests should be mostly copy-paste from the v3 tests)
- probably need to update the data model of a bunch of stuff to refer to users by their uuid rather than their commitment
- update the semaphore group stuff to be able to handle v4 groups.

# done

- update data model of user to also contain v4 identity commitment, alongside the v3 identity commitment
- v4 signature PCD is just ... a pod?
- implement v4 identity pcd
- update `VerifiedCredential` to support v4 signature credential type
- make `Credential` and `CredentialSubservice` accept v4 signatures as well as v3 signatures
- make `CredentialManager` default generate v4 credentials over v3 credentials

# won't do

- eventually we're going to need `GPCCredential`
