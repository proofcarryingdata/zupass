mkdir -p ./operands

printf "123" > ./operands/input.txt
cat ./operands/input.txt | ssh-keygen -Y sign -n zkfaucet.com -f ~/.ssh/id_rsa_2048 -O hashalg=sha256 -vvv > ./operands/signature.txt