# todo

- upon login, or upon creation of new account
  - if they have a semaphore v4 identity PCD in their zupass already, great
  - otherwise:
    - create a new semaphore v4 identity PCD
    - add it to their PCD collection
  - introduce a v4 signature credential type
  - make `Credential` and `CredentialSubservice` accept v4 signatures as well as v3 signatures
  - make `CredentialManager` default generate v4 credentials over v3 credentials

# done
