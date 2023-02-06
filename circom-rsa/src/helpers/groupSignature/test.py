from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA512
import binascii

hash = SHA512.new()
hash.update("E PLURIBUS UNUM; DO NOT SHARE")

encoded = PKCS1_v1_5.EMSA_PKCS1_V1_5_ENCODE(hash, 672 / 8)
encodedBytes = bytearray(encoded)
hexed = binascii.hexlify(encodedBytes)

print('0x' + hexed)
