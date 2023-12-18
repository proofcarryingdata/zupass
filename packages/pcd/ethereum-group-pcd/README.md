# `@pcd/ethereum-group-pcd`

PCD which proves that a particular Semaphore Identity owns a particular ethereum address that is part of an address merkle set or public key merkle set, without revealing the ethereum address.

It uses an optimized group ecdsa zk [circuit](https://github.com/personaelabs/spartan-ecdsa) written by Personae Labs.

By pre-computing a set of Ethereum addresses that satisfy a particular property, one can prove that property about themselves without revealing their exact address. For example, proving that one:

- owns a NounDao (punk, or etc) NFT at a particular block
- made a transaction before 2020
- made at least 100 transactions
- owns at least 10 eth
- used tornado cash when it was cool
- has been validated by proof-of-humanity
- participated in a conference that issued a POAP

If you always use one address, proving multiple properties about yourself will narrow the anonymity set. However, if you use multiple addresses, you can own multiple PCDs without narrowing the anonymity set.
