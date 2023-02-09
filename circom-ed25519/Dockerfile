#maintainer: Gaurav Srivastava
FROM 371334089058.dkr.ecr.ap-south-1.amazonaws.com/circom:latest
WORKDIR /tmp
COPY . .
RUN bash -c "export PATH="$PATH:/root/.cargo/bin" \
 && npm install \
 && npm run test \
 && npm run test-scalarmul \
 && npm run test-verify \
 && npm run test-batch-verify \
 && npm run lint"
