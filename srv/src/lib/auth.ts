import { db } from "../../db/db.js"
import * as crypto from "node:crypto"
import {  sessions, users, type Session } from "../../db/schema.js"
import { eq } from "drizzle-orm";


export async function signup({ name, email, password }: { name: string, email: string, password: string }) {
    const
        { salt, hash } = hashPassword(password);
    const user = await db.insert(users).values({ name, email, password: hash, salt }).returning()
    return await generateSession(user[0].id);

}

export async function login({ email, password }: { email: string, password: string }) {
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email)
    })
    if (!user) {
        throw new Error("not found")
    }
    const hashtoTest = crypto.scryptSync(password, user.salt, 64).toString('hex');

    if (!(hashtoTest === user.password)) {
        throw new Error("invalid username or password")
    }
    return await generateSession(user?.id)
}

export async function logout(sessionId: string) {
    const sesh = await db.query.sessions.findFirst({
        where: (sessions, { eq }) => eq(sessions.sessionToken, sessionId)
    })

    if (!sesh) {
        throw new Error("session not found")
    }
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionId)).limit(1)
}

function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return { salt, hash }
}

async function generateSession(userId: string) {   
    const sessionToken = crypto.randomBytes(32).toString(('base64'))
    return await db.insert(sessions).values({ userId, sessionToken }).returning();
}
