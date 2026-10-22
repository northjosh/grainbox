const LIME = "\x1b[38;2;210;237;97m";
const DIM = "\x1b[90m";
const RESET = "\x1b[0m";

const ART = [
  "                  _       _",
  "   __ _ _ __ __ _(_)_ __ | |__   _____  __",
  "  / _` | '__/ _` | | '_ \\| '_ \\ / _ \\ \\/ /",
  " | (_| | | | (_| | | | | | |_) | (_) >  <",
  "  \\__, |_|  \\__,_|_|_| |_|_.__/ \\___/_/\\_\\",
  "  |___/",
].join("\n");

/** Banner printed locally when a shell socket first connects. */
export function terminalMotd(sandboxName: string, details?: string): string {
  const meta = details ? `${DIM} · ${details}${RESET}` : "";

  return [
    "",
    `${LIME}${ART}${RESET}`,
    "",
    `  ${DIM}sandbox ${RESET}${sandboxName}${meta}`,
    `  ${DIM}a tiny computer, poured into a box.${RESET}`,
    `  ${DIM}type ${LIME}exit${DIM} to close this shell.${RESET}`,
    "",
    "",
  ].join("\r\n");
}
