import { defineAuditAction } from 'evlog'

/**
 * Audit actions for grainbox.
 *
 * Seeded by `evlog init` from the entry points `evlog map` flagged as
 * sensitive with no audit trail. Call them from the handlers listed above each
 * one:
 *
 *   log.audit(SIGNUP_CREATED({ actor: { type: 'user', id: user.id }, outcome: 'success' }))
 */
/** POST /signup — flagged for auth, pii */
export const SIGNUP_CREATED = defineAuditAction('signup.created', {
  target: 'signup',
  description: 'TODO: what this records, in one line',
})

/** POST /login — flagged for auth, pii */
export const LOGIN_CREATED = defineAuditAction('login.created', {
  target: 'login',
  description: 'TODO: what this records, in one line',
})

/** GET /session — flagged for auth, pii */
export const SESSION_ACCESSED = defineAuditAction('session.accessed', {
  target: 'session',
  description: 'TODO: what this records, in one line',
})

/** POST /logout — flagged for auth, pii */
export const LOGOUT_CREATED = defineAuditAction('logout.created', {
  target: 'logout',
  description: 'TODO: what this records, in one line',
})
