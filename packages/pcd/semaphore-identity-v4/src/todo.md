# todo

- upload v4 commitment to zupass wherever we already do so for v3
- create and upload v4 identity on login
- migrate alread-logged-in clients
  - make user with 2 logged in clients migrates without conflicts
- need to create tests for pipelines that make sure they work with both a v3 and a v4 identity
- figure out how to hide/show tickets where there's both an EdDSA ticket and a POD ticket in the client.
  - we don't want there to appear to be duplicates
  - probs just hide the EdDSA ticket if a POD ticket that is the 'same' already exists
- semaphore v4 identity pcd tests
  - (luckily, i think the tests should be mostly copy-paste from the v3 tests)
- probably need to update the data model of a bunch of stuff to refer to users by their uuid rather than their commitment
- update the semaphore group stuff to be able to handle v4 groups.
- make the client aware of the v4 identity
  - e.g. there are various react hooks that need to be updated

# done

- update data model of user to also contain v4 identity commitment, alongside the v3 identity commitment
- v4 signature PCD is just ... a pod?
- implement v4 identity pcd
- update `VerifiedCredential` to support v4 signature credential type
- make `Credential` and `CredentialSubservice` accept v4 signatures as well as v3 signatures
- make `CredentialManager` default generate v4 credentials over v3 credentials

# won't do

- eventually we're going to need `GPCCredential`
