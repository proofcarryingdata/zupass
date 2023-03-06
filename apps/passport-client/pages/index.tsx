import styled from "styled-components";

export default function Web() {
  return (
    <Container>
      <h1>ZUZALU PASSPORT</h1>
      <img src="/passport.jpg" />
      <br />
      <button>Login</button>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;

  button {
    padding: 16px 64px;
    font-size: 3em;
    cursor: pointer;
  }
`;
