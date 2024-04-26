import { Dispatch, SetStateAction, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { Switch } from "./switch";

export function useTheme(): [string, Dispatch<SetStateAction<string>>] {
  const [theme, setTheme] = useLocalStorage("theme", "dark");
  const isLight = theme === "light";

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(isLight ? "light" : "dark");
  }, [isLight, theme]);

  return [theme, setTheme];
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const isLight = theme === "light";

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(isLight ? "light" : "dark");
  }, [isLight, theme]);

  return (
    <div className="flex flex-row items-center justify-start gap-2">
      <Switch
        checked={isLight}
        onCheckedChange={(newIsLight) => {
          setTheme(newIsLight ? "light" : "dark");
        }}
      ></Switch>
      <span>theme - {isLight ? "light" : "dark"}</span>
    </div>
  );
}
