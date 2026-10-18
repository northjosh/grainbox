import { initLogger, toLoggerConfig, toMiddlewareOptions } from 'evlog'
import { evlog } from 'evlog/hono'
import config from '../evlog.config'

initLogger(toLoggerConfig(config))

/** Register once, before your routes: `app.use(evlogMiddleware)`. */
export const evlogMiddleware = evlog(toMiddlewareOptions(config))
