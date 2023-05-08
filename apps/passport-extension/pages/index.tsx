import { createRoot } from "react-dom/client";

function App() {
  return <div>App</div>;
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
