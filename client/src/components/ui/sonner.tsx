import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useThemeStore } from "@/lib/store/theme-store";

export function Toaster(props: ToasterProps) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--terminal)",
          "--normal-text": "var(--terminal-foreground)",
          "--normal-border": "oklch(1 0 0 / 10%)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-mono !rounded-md !shadow-lg",
          title: "!text-sm",
          description: "!text-xs !text-terminal-foreground/60",
          actionButton:
            "!h-auto !border-0 !bg-transparent !px-0 !font-mono !text-xs !font-normal !text-terminal-accent !shadow-none underline-offset-4 hover:!underline",
          closeButton: "!border-white/10 !bg-terminal !text-terminal-foreground/70",
        },
      }}
      {...props}
    />
  );
}
