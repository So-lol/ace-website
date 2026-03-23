import assert from 'node:assert/strict'
import test from 'node:test'

import {
    calculateProgramWeek,
    DEFAULT_WEEK_COUNT_START_DATE,
    isValidProgramDateInput,
} from '@/lib/program-settings'

test('program date validation accepts canonical yyyy-mm-dd values', () => {
    assert.equal(isValidProgramDateInput('2026-02-09'), true)
    assert.equal(isValidProgramDateInput('2026-02-30'), false)
    assert.equal(isValidProgramDateInput('02/09/2026'), false)
})

test('program week calculation starts at week 1 on the configured start date', () => {
    assert.deepEqual(
        calculateProgramWeek('2026-02-09', new Date('2026-02-09T12:00:00.000Z')),
        { weekNumber: 1, year: 2026 }
    )
})

test('program week calculation advances every seven days', () => {
    assert.deepEqual(
        calculateProgramWeek('2026-02-09', new Date('2026-02-16T12:00:00.000Z')),
        { weekNumber: 2, year: 2026 }
    )
    assert.deepEqual(
        calculateProgramWeek('2026-02-09', new Date('2026-03-22T12:00:00.000Z')),
        { weekNumber: 6, year: 2026 }
    )
})

test('program week calculation returns week 0 before counting starts', () => {
    assert.deepEqual(
        calculateProgramWeek('2026-02-09', new Date('2026-02-08T23:59:59.000Z')),
        { weekNumber: 0, year: 2026 }
    )
})

test('invalid stored week-count dates fall back to the default schedule', () => {
    assert.deepEqual(
        calculateProgramWeek('invalid-date', new Date('2026-02-09T12:00:00.000Z')),
        calculateProgramWeek(DEFAULT_WEEK_COUNT_START_DATE, new Date('2026-02-09T12:00:00.000Z'))
    )
})
