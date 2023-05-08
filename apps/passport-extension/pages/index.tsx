import { createRoot } from "react-dom/client";

function App() {
  return <div style={{ padding: "64px 32px" }}>Zupass</div>;
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
