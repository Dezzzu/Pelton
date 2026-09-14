import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { idle, ready } from '../lib/async'
import type { MessageSummary } from '../lib/types'
import { messageList, neighbourInList, patchInList, removeFromList, restoreToList } from './messages'

function summary(id: number, over: Partial<MessageSummary> = {}): MessageSummary {
  return {
    id,
    accountId: 1,
    folderId: 1,
    accountEmail: 'me@example.com',
    folderName: 'INBOX',
    subject: `message ${id}`,
    fromName: 'Ada',
    fromAddress: 'ada@example.com',
    snippet: '',
    // descending by id, matching the newest-first order the list is kept in.
    date: `2026-09-${String(30 - id).padStart(2, '0')}T12:00:00Z`,
    seen: false,
    flagged: false,
    hasAttachments: false,
    pgp: '',
    auth: '',
    flagColor: 0,
    offline: false,
    snoozeUntil: '',
    senderVip: false,
    smime: { status: '', signer: '', email: '', issuer: '', detail: '' },
    ...over,
  }
}

function load(ids: number[], total = ids.length): void {
  messageList.set(
    ready({
      items: ids.map((id) => summary(id)),
      total,
      searching: false,
      hasOlder: false,
      backfilling: false,
    }),
  )
}

function ids(): number[] {
  return get(messageList).data?.items.map((m) => m.id) ?? []
}

beforeEach(() => {
  messageList.set(idle())
})

describe('removeFromList', () => {
  it('drops the row and decrements the total', () => {
    load([1, 2, 3])
    removeFromList(2)
    expect(ids()).toEqual([1, 3])
    expect(get(messageList).data!.total).toBe(2)
  })

  // deleting from the reading pane can name a message that is not on the
  // loaded page; decrementing then would drift the total away from what the
  // server actually holds.
  it('leaves the total alone for a row that was not loaded', () => {
    load([1, 2, 3], 50)
    removeFromList(99)
    expect(ids()).toEqual([1, 2, 3])
    expect(get(messageList).data!.total).toBe(50)
  })

  it('never drives the total below zero', () => {
    load([1], 0)
    removeFromList(1)
    expect(get(messageList).data!.total).toBe(0)
  })

  it('does nothing while the list is not loaded', () => {
    removeFromList(1)
    expect(get(messageList).status).toBe('idle')
  })
})

describe('restoreToList', () => {
  it('puts a row back in date order', () => {
    load([1, 2, 4])
    restoreToList(summary(3))
    expect(ids()).toEqual([1, 2, 3, 4])
    expect(get(messageList).data!.total).toBe(4)
  })

  it('restores to the top when it is the newest', () => {
    load([2, 3])
    restoreToList(summary(1))
    expect(ids()).toEqual([1, 2, 3])
  })

  // undo can be pressed after a sync already brought the message back, and a
  // second copy would break the list, which renders rows keyed by id.
  it('refuses to add a row that is already there', () => {
    load([1, 2])
    restoreToList(summary(2))
    expect(ids()).toEqual([1, 2])
    expect(get(messageList).data!.total).toBe(2)
  })

  it('does nothing while the list is not loaded', () => {
    restoreToList(summary(1))
    expect(get(messageList).status).toBe('idle')
  })
})

describe('patchInList', () => {
  it('updates only the named row', () => {
    load([1, 2])
    patchInList(2, { seen: true })
    expect(get(messageList).data!.items.map((m) => m.seen)).toEqual([false, true])
  })

  it('leaves the other fields alone', () => {
    load([1])
    patchInList(1, { flagged: true })
    const row = get(messageList).data!.items[0]
    expect(row.flagged).toBe(true)
    expect(row.subject).toBe('message 1')
    expect(row.seen).toBe(false)
  })

  it('ignores an id that is not loaded', () => {
    load([1])
    patchInList(99, { seen: true })
    expect(get(messageList).data!.items[0].seen).toBe(false)
  })

  it('does nothing while the list is not loaded', () => {
    patchInList(1, { seen: true })
    expect(get(messageList).status).toBe('idle')
  })
})

describe('neighbourInList', () => {
  it('picks the row below', () => {
    load([1, 2, 3])
    expect(neighbourInList(2)).toBe(3)
  })

  it('falls back to the row above for the last one', () => {
    load([1, 2, 3])
    expect(neighbourInList(3)).toBe(2)
  })

  it('has nothing to pick in a list of one', () => {
    load([1])
    expect(neighbourInList(1)).toBeNull()
  })

  // a bulk delete would otherwise land on a row that is about to go as well.
  it('skips rows that are going too', () => {
    load([1, 2, 3, 4])
    expect(neighbourInList(1, new Set([2, 3]))).toBe(4)
  })

  it('searches upwards past skipped rows', () => {
    load([1, 2, 3, 4])
    expect(neighbourInList(3, new Set([4, 2]))).toBe(1)
  })

  it('has nothing to pick when the whole list is going', () => {
    load([1, 2, 3])
    expect(neighbourInList(2, new Set([1, 2, 3]))).toBeNull()
  })

  it('returns null for a row that is not loaded', () => {
    load([1, 2])
    expect(neighbourInList(99)).toBeNull()
  })

  it('returns null while the list is not loaded', () => {
    expect(neighbourInList(1)).toBeNull()
  })
})
