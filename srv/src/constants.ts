export const ALLOWED_IMAGES = new Set(["python", "debian", "alpine"]);
export const PREFIX = "sbx-";
export const SESSION_COOKIE = "session_id";
export const MAX_CONCURRENT = 10;
export const NAME_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;
export const MAX_SANDBOXES = 5;
export const EXEC_TIMEOUT_MS = 30_000;
export const TIMEOUT_MS = 30_000;
export const SESSION_TTL_SECONDS = 60 * 60;
export const DEFAULT_CPUS = 1; // 1 vcpu
export const DEFAULT_MEMORY = 512; //512 mb
export const MAX_CPUS = 1; // 1 vcpu
export const MAX_MEMORY = 512; //512 mb
export const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "yadayadda";
export const MAX_PORTS = 5;
export const BASE_DOMAIN = process.env.BASE_DOMAIN   ?? "grainboxapps.northjosh.com";
export const DEFAULT_GUEST_PORT = 7123;
export const GATEWAY_EXECUTABLE_PATH = process.env.GATEWAY_EXECUTABLE_PATH ?? "../gateway/";
export const DEFAULT_SHELLS: Record<string, string> = {
  alpine: "/bin/sh",
  debian: "/bin/bash",
  fedora: "/bin/bash",
  ubuntu: "/bin/bash",
};
export const COMMON_PORTS = [
  20, // FTP Data
  21, // FTP Control
  22, // SSH / SFTP
  23, // Telnet
  25, // SMTP
  53, // DNS
  67, // DHCP Server
  68, // DHCP Client
  69, // TFTP
  80, // HTTP
  88, // Kerberos
  110, // POP3
  123, // NTP
  139, // NetBIOS
  143, // IMAP
  161, // SNMP
  389, // LDAP
  443, // HTTPS
  445, // SMB
  514, // Syslog
  1433, // MSSQL
  1521, // Oracle
  3306, // MySQL
  3389, // RDP
  5432, // PostgreSQL
  6379, // Redis
];
