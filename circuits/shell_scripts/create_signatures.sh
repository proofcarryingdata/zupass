mkdir -p ./operands

printf "123" > ./operands/input.txt
cat ./operands/input.txt | ssh-keygen -Y sign -n zkfaucet.com -f ~/.ssh/id_rsa > ./operands/signature.txt