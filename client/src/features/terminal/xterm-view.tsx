import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useCallback, useEffect, useId, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

import { useTerminalActivity } from "./terminal-activity-store";
import { appendScrollback, loadScrollback, saveScrollback } from "./terminal-scrollback";
import { terminalMotd } from "./motd";

type TermProps = {
  sandboxName: string;
  tabId: number;
  /** Short image/resource summary printed in the shell banner. */
  details?: string;
  /** When true, keep a live socket; false closes it without losing the buffer. */
  enabled: boolean;
  /** When true, focus the terminal — used by tab switches. */
  active?: boolean;
};

export function XtermView({ sandboxName, tabId, details, enabled, active }: TermProps) {
  const termRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const transcriptRef = useRef("");
  const saveTimerRef = useRef<number | null>(null);
  const sessionId = useId();

  const persistScrollback = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveScrollback(sandboxName, tabId, transcriptRef.current);
  }, [sandboxName, tabId]);

  const scheduleScrollbackSave = useCallback(() => {
    if (saveTimerRef.current !== null) return;
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      saveScrollback(sandboxName, tabId, transcriptRef.current);
    }, 500);
  }, [sandboxName, tabId]);

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

    transcriptRef.current = loadScrollback(sandboxName, tabId);
    if (transcriptRef.current) {
      terminal.write(transcriptRef.current);
      terminal.writeln("\r\n\x1b[90m[scrollback restored]\x1b[0m");
    }

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

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistScrollback();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", persistScrollback);

    const input = terminal.onData((data) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    const resize = terminal.onResize(({ rows, cols }) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", rows, cols }));
      }
    });

    return () => {
      persistScrollback();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", persistScrollback);
      observer.disconnect();
      input.dispose();
      resize.dispose();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [persistScrollback, sandboxName, tabId]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.options.disableStdin = !enabled;

    if (!enabled) {
      terminal.blur();
      socketRef.current?.close();
      socketRef.current = null;
      useTerminalActivity.getState().setConnected(sessionId, false);
      return;
    }

    let disposed = false;
    let shellExited = false;
    let welcomed = false;
    let attempt = 0;
    let retryTimer: number | null = null;
    let socket: WebSocket | null = null;

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/api/sandboxes/${encodeURIComponent(sandboxName)}/ws`;

    const scheduleReconnect = () => {
      if (disposed || shellExited) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;

      socket = new WebSocket(url);
      socketRef.current = socket;

      if (attempt === 0) {
        terminal.writeln(`\x1b[90mConnecting to ${sandboxName}...\x1b[0m`);
      } else {
        terminal.writeln(`\x1b[90mReconnecting to ${sandboxName}…\x1b[0m`);
      }

      socket.addEventListener("open", () => {
        if (disposed) {
          socket?.close();
          return;
        }
        attempt = 0;
        useTerminalActivity.getState().setConnected(sessionId, true);
        if (welcomed) {
          terminal.writeln(`\x1b[38;2;0;255;135mConnected to ${sandboxName}\x1b[0m\r\n`);
        } else {
          welcomed = true;
          const motd = terminalMotd(sandboxName, details);
          terminal.write(motd);
          transcriptRef.current = appendScrollback(transcriptRef.current, motd);
          scheduleScrollbackSave();
        }
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ type: "resize", rows: terminal.rows, cols: terminal.cols }),
          );
        }
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        if (disposed) return;
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
            shellExited = true;
            terminal.writeln(`\r\n\x1b[33m[shell exited: ${String(parsed.code)}]\x1b[0m`);
            return;
          }
        } catch {
          // Shell output is plain text; only control messages are JSON.
        }

        terminal.write(message);
        transcriptRef.current = appendScrollback(transcriptRef.current, message);
        scheduleScrollbackSave();
      });

      socket.addEventListener("close", () => {
        useTerminalActivity.getState().setConnected(sessionId, false);
        if (disposed || shellExited) return;
        terminal.writeln("\r\n\x1b[33m[connection lost — reconnecting…]\x1b[0m");
        scheduleReconnect();
      });
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
      useTerminalActivity.getState().setConnected(sessionId, false);
    };
  }, [details, enabled, sandboxName, scheduleScrollbackSave, sessionId]);

  useEffect(() => {
    if (active && enabled) terminalRef.current?.focus();
  }, [active, enabled, sandboxName]);

  return <div ref={termRef} className="h-[calc(100vh-13rem)] min-h-72 w-full p-2" />;
}
