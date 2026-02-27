import { StorageAdapter } from './adapter'
import { LocalFileStorage } from './local'
import { SupabaseStorage } from './supabase'

let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter

  const type = process.env.STORAGE_ADAPTER ?? 'local'

  switch (type) {
    case 'supabase':
      _adapter = new SupabaseStorage()
      return _adapter
    case 'local':
    default:
      _adapter = new LocalFileStorage()
      return _adapter
  }
}
