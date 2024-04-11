import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Switch } from "./switch";

export function ThemeSwitcher() {
  const [theme, setTheme] = useLocalStorage("theme", "light");

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <div
      className="text-xs h-full flex items-center justify-center gap-2"
      onClick={() => {
        setTheme(theme === "light" ? "dark" : "light");
      }}
    >
      <Switch></Switch>
    </div>
  );
}
