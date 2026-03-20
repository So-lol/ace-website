import 'dotenv/config'

import { adminDb } from '@/lib/firebase-admin'

const focusTypes = new Set([
    'login_failure',
    'password_reset_request_failure',
    'password_reset_confirm_failure',
    'action_code_failure',
    'session_verification_failure',
    'session_sync_failure',
])

function getCurrentBucket() {
    return new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '')
}

async function main() {
    const bucket = process.argv[2] || getCurrentBucket()
    const snapshot = await adminDb
        .collection('auth_event_rollups')
        .where('bucket', '==', bucket)
        .limit(50)
        .get()

    const docs = snapshot.docs
        .map((doc) => doc.data())
        .filter((data) => focusTypes.has(String(data.type)))
        .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))

    if (docs.length === 0) {
        console.log(`No auth failure rollups found for bucket ${bucket}.`)
        return
    }

    console.log(`Auth failure rollups for bucket ${bucket}:`)

    for (const data of docs) {
        console.log([
            `type=${data.type}`,
            `dimension=${data.dimension}`,
            `value=${data.value}`,
            `count=${data.count}`,
            `lastErrorCode=${data.lastErrorCode ?? 'n/a'}`,
            `lastRoute=${data.lastRoute ?? 'n/a'}`,
        ].join(' | '))
    }
}

void main().catch((error) => {
    console.error('Failed to report auth failures:', error)
    process.exit(1)
})
