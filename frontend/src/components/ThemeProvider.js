import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: () => {}, resolvedTheme: "dark" });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("finsites-theme") || "dark");
  const [resolvedTheme, setResolvedTheme] = useState("dark");

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => {
      if (t === "system") {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", dark);
        setResolvedTheme(dark ? "dark" : "light");
      } else {
        root.classList.toggle("dark", t === "dark");
        setResolvedTheme(t);
      }
    };
    apply(theme);
    localStorage.setItem("finsites-theme", theme);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>{children}</ThemeContext.Provider>;
}
