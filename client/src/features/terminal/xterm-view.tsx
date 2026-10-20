import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useEffect, useId, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

import { useTerminalActivity } from "./terminal-activity-store";

type TermProps = {
  sandboxName: string;
  /** When true, focus the terminal — used by tab switches. */
  active?: boolean;
};

export function XtermView({ sandboxName, active }: TermProps) {
  const termRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const sessionId = useId();

  useEffect(() => {
    const container = termRef.current;
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 5000,
      theme: {
        background: "#111411",
        foreground: "#e6ece5",
        cursor: "#d2ed61",
        cursorAccent: "#111411",
        selectionBackground: "rgba(210, 237, 97, 0.28)",
        selectionInactiveBackground: "rgba(230, 236, 229, 0.12)",
        black: "#20261f",
        red: "#e5695f",
        green: "#9ccc65",
        yellow: "#e2c08d",
        blue: "#6cb6ff",
        magenta: "#c792ea",
        cyan: "#62d4c8",
        white: "#d8ded6",
        brightBlack: "#6b7268",
        brightRed: "#ff8f85",
        brightGreen: "#c2f06a",
        brightYellow: "#f2d17e",
        brightBlue: "#94ccff",
        brightMagenta: "#dfa9ff",
        brightCyan: "#8ae8dc",
        brightWhite: "#ffffff",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();
    terminalRef.current = terminal;
    terminal.writeln(`\x1b[90mConnecting to ${sandboxName}...\x1b[0m`);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width === 0 || entry.contentRect.height === 0) {
        // Hidden tabs report zero size; refit happens when they become visible.
        return;
      }
      try {
        fit.fit();
      } catch {
        // The container can be transiently zero-sized while resizing.
      }
    });
    observer.observe(container);

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${location.host}/api/sandboxes/${encodeURIComponent(sandboxName)}/ws`,
    );

    const sendResize = (rows: number, cols: number) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", rows, cols }));
      }
    };

    socket.addEventListener("open", () => {
      useTerminalActivity.getState().setConnected(sessionId, true);
      terminal.writeln(`\x1b[38;2;0;255;135mConnected to ${sandboxName}\x1b[0m\r\n`);
      sendResize(terminal.rows, terminal.cols);
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const message = event.data;
      try {
        const parsed: unknown = JSON.parse(message);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "type" in parsed &&
          parsed.type === "exit" &&
          "code" in parsed
        ) {
          terminal.writeln(`\r\n\x1b[33m[shell exited: ${String(parsed.code)}]\x1b[0m`);
          return;
        }
      } catch {
        // Shell output is plain text; only control messages are JSON.
      }

      terminal.write(message);
    });

    socket.addEventListener("close", () => {
      useTerminalActivity.getState().setConnected(sessionId, false);
      terminal.writeln("\r\n\x1b[31m[disconnected]\x1b[0m");
    });

    socket.addEventListener("error", () => {
      terminal.writeln("\r\n\x1b[31m[WebSocket error]\x1b[0m");
    });

    const input = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    const resize = terminal.onResize(({ rows, cols }) => {
      sendResize(rows, cols);
    });

    return () => {
      useTerminalActivity.getState().setConnected(sessionId, false);
      observer.disconnect();
      input.dispose();
      resize.dispose();
      socket.close();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [sandboxName, sessionId]);

  useEffect(() => {
    if (active) terminalRef.current?.focus();
  }, [active, sandboxName]);

  return <div ref={termRef} className="h-[calc(100vh-13rem)] min-h-72 w-full p-2" />;
}
