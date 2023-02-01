import styled, { keyframes } from "styled-components";

export function JellyPage() {
  return (
    <ContainerContainer>
      <Title>
        <img src="/Z.png" width="100px" />
        <img src="/K.png" width="100px" />
        <br />
        <img src="/F.png" width="100px" />
        <img src="/A.png" width="100px" />
        <img src="/U.png" width="100px" />
        <img src="/C.png" width="100px" />
        <img src="/E.png" width="100px" />
        <img src="/T.png" width="100px" />
      </Title>
      <Container>
        <img src="/faucet.png" width="500px" />
        <FallingImages />
        <img
          style={{ position: "absolute", bottom: 0, left: 0 }}
          src="/faucet_bottom.png"
          width="500px"
        />
      </Container>
    </ContainerContainer>
  );
}

const Title = styled.div``;

function FallingImages() {
  const urls = ["fish_1.png", "fish_2.png", "fish_3.png"];

  return (
    <>
      {urls.map((url, i) => (
        <FallingImage
          key={i}
          style={{
            visibility: "hidden",
            position: "absolute",
            top: "35%",
            left: "38%",
            animationDelay: `${i * 0.3}s`,
          }}
          src={url}
          width="50px"
        />
      ))}
    </>
  );
}

const BobAnimation = keyframes`
0% {
  transform: rotate(-2.5deg);
}
50% {
  transform: rotate(2.5deg);
}
100% {
  transform: rotate(-2.5deg);
}`;

const FallAnimation = keyframes`
0% {
  visibility: hidden;
  margin-top: 0;
  transform:  scale(0.5);
  opacity: 0;
}
1% {
  visibility: visible;
}
10% {
  opacity: 1;
}
100% {
  margin-top: 50%;
  transform: scale(1);
}
`;

const FallingImage = styled.img`
  animation-name: ${FallAnimation};
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-fill-mode: forwards;
  animation-timing-function: ease-in;
`;

const Image = styled.img`
  animation-name: ${BobAnimation};
  animation-duration: 3s;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
`;

const ContainerContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Container = styled.div`
  display: inline-block;
  position: relative;
  margin: 16px;
  /* border: 1px solid black; */
  box-sizing: border-box;
  animation-name: ${BobAnimation};
  animation-duration: 3s;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
`;
