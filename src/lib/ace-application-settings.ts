import { AceApplicationSettings } from '@/types/index'

export function areAceApplicationsOpen(
    settings: Pick<AceApplicationSettings, 'isOpen' | 'deadlineAt'>,
    now: Date = new Date()
) {
    if (!settings.isOpen) {
        return false
    }

    if (settings.deadlineAt && settings.deadlineAt.getTime() < now.getTime()) {
        return false
    }

    return true
}
