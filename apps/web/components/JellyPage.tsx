import styled, { keyframes } from "styled-components";

export function JellyPage() {
  return (
    <ContainerContainer>
      <Container>
        <Title />
        <img src="/faucet.png" width="500px" />
        <FallingImages />
        <StaticImages />
        <img
          style={{ position: "absolute", bottom: 0, left: 0 }}
          src="/faucet_bottom.png"
          width="500px"
        />
      </Container>
    </ContainerContainer>
  );
}

function Title() {
  const letters = [
    "/Z.png",
    "/K.png",
    "/F.png",
    "/A.png",
    "/U.png",
    "/C.png",
    "/E.png",
    "/T.png",
  ];

  return (
    <TitleContainer>
      {letters.map((l, i) => (
        <Image
          style={{
            position: "absolute",
            top:
              Math.sin(((i + 0.5) / letters.length) * Math.PI - Math.PI) * 300 +
              200,
            left:
              Math.cos(((i + 0.5) / letters.length) * Math.PI - Math.PI) * 300 +
              200,
            animationDuration: `${Math.random() * 2}s`,
          }}
          key={i}
          src={l}
          width="100px"
        />
      ))}
    </TitleContainer>
  );
}

const TitleContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
`;

function StaticImages() {
  return (
    <>
      <Image
        style={{
          position: "absolute",
          left: "10%",
          top: "70%",
          width: "100px",
          transform: "rotate(180deg)",
        }}
        src="/octopus.png"
      />
      <Image
        style={{
          position: "absolute",
          left: "70%",
          top: "70%",
          width: "80px",
          transform: "rotate(180deg)",
        }}
        src="/coral_1.png"
      />
      <Image
        style={{
          position: "absolute",
          left: "60%",
          top: "70%",
          width: "50px",
          transform: "rotate(180deg)",
        }}
        src="/jelly_3.png"
      />
    </>
  );
}

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
