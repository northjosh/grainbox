import { COMMON_PORTS } from "../constants.js";

export function randomPort() {
  const max = 65534;
  const min = 0;
  var port = Math.floor(Math.random() * (max - min + 1) + min);

  while (!COMMON_PORTS.includes(port)) {
    port = Math.floor(Math.random() * (max - min + 1) + min);
  }
  return port;
}
