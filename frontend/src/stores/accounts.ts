// accounts.ts loads and holds the sidebar data: the accounts, each account's
// folder tree, and the unified cross-account views. it exposes one load function
// plus a lightweight refresh used when sync events report new mail so badges and
// counts stay current.

import { writable } from 'svelte/store'
import type { Account, Folder, UnifiedView } from '../lib/types'
import { listAccounts, listFolders, listUnifiedViews, listPinnedFolders } from '../lib/api'
import { type AsyncState, idle, loading, ready, failed } from '../lib/async'
import { errorMessage } from './toast'

// the whole sidebar payload loaded together so the tree renders in one pass.
export interface SidebarData {
  accounts: Account[]
  foldersByAccount: Record<number, Folder[]>
  views: UnifiedView[]
  // the Pinned group, across every account, in the order the user arranged it.
  // these folders also appear in foldersByAccount: pinning mirrors, it does not
  // move.
  pinned: Folder[]
}

export const sidebar = writable<AsyncState<SidebarData>>(idle())

// loadSidebar fetches accounts, their folders and the unified views. on failure
// it records the error so the sidebar can show an error state rather than a
// blank column.
export async function loadSidebar(): Promise<void> {
  sidebar.update((s) => loading(s))
  try {
    const accounts = await listAccounts()
    const foldersByAccount: Record<number, Folder[]> = {}
    await Promise.all(
      accounts.map(async (acc) => {
        foldersByAccount[acc.id] = await listFolders(acc.id)
      }),
    )
    const views = await listUnifiedViews()
    const pinned = await listPinnedFolders()
    sidebar.set(ready({ accounts, foldersByAccount, views, pinned }))
  } catch (err) {
    sidebar.set(failed(errorMessage(err)))
  }
}

// refreshSidebar reloads counts quietly. it reuses loadSidebar but is named for
// intent at the call sites that react to sync events.
export const refreshSidebar = loadSidebar

// countSettleMs is how long a burst of local changes is allowed to run before
// the counts are re-read. Long enough that a bulk delete of fifty messages is
// one round trip rather than fifty, short enough to read as immediate.
const countSettleMs = 200

let countTimer: ReturnType<typeof setTimeout> | null = null

// refreshCountsSoon re-reads the sidebar after a local change, coalescing a
// burst into a single pass.
//
// Deleting a message, marking one read or moving one changes what the badges
// should say, but nothing told the sidebar: it was only refreshed on sync
// events, so a folder stayed bold and kept its unread count until the next
// sync, and an already-triaged folder still looked like it needed attention.
//
// The counts are re-read rather than adjusted in place on purpose. Which
// folders feed which unified view, and what counts as unread in each, is the
// backend's rule; a second copy of it here would be one more thing to keep in
// step. Reading is cheap, and loading() keeps the current data on screen, so
// the sidebar never blanks while it happens.
export function refreshCountsSoon(): void {
  if (countTimer !== null) {
    clearTimeout(countTimer)
  }
  countTimer = setTimeout(() => {
    countTimer = null
    void refreshSidebar()
  }, countSettleMs)
}
