import { adminDb } from './firebase-admin'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

/**
 * Simple Firestore-based rate limiter for distributed serverless environments.
 * 
 * @param key Unique key for the rate limit (e.g., "auth_sync:1.2.3.4")
 * @param limit Max number of requests allowed in the window
 * @param windowSeconds Window duration in seconds
 * @returns Object containing success (boolean) and remaining (number)
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ success: boolean; remaining: number }> {
    const rateLimitRef = adminDb.collection('rateLimits').doc(key)
    const now = Date.now()
    const nowTimestamp = Timestamp.fromMillis(now)

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const doc = await transaction.get(rateLimitRef)
            const data = doc.data()

            if (!doc.exists || (data?.resetAt && data.resetAt.toMillis() < now)) {
                // New bucket or expired bucket
                const resetAt = Timestamp.fromMillis(now + windowSeconds * 1000)
                transaction.set(rateLimitRef, {
                    count: 1,
                    resetAt,
                    updatedAt: nowTimestamp
                })
                return { success: true, remaining: limit - 1 }
            }

            // Existing bucket within window
            const currentCount = (data?.count || 0) + 1

            if (currentCount > limit) {
                return { success: false, remaining: 0 }
            }

            transaction.update(rateLimitRef, {
                count: FieldValue.increment(1),
                updatedAt: nowTimestamp
            })

            return { success: true, remaining: limit - currentCount }
        })
    } catch (error) {
        console.error('Rate limit error:', error)
        // Fail open to avoid blocking users if Firestore is flaky
        return { success: true, remaining: 1 }
    }
}
