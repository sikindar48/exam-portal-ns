import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ProviderContext = createContext<ProviderState>(initialState);

export function Provider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ProviderContext.Provider {...props} value={value}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a Provider");

  return context;
};
