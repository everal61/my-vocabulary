export type Word = { id: string; word: string; translations: string[]; createdAt: string; updatedAt: string }
export type Stats = { bestCorrectStreakEnRu: number; bestCorrectStreakRuEn: number }
const DB_NAME = 'my-vocabulary-db'
const STORE = 'app'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function get<T>(key: string, fallback: T): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    request.onsuccess = () => resolve((request.result as T | undefined) ?? fallback)
    request.onerror = () => reject(request.error)
  })
}
async function put<T>(key: string, value: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
export const loadWords = () => get<Word[]>('words', [])
export const saveWords = (words: Word[]) => put('words', words)
export async function loadStats(): Promise<Stats> {
  const saved = await get<Partial<Stats>>('stats', {})
  return { bestCorrectStreakEnRu: Math.max(0, saved.bestCorrectStreakEnRu ?? 0), bestCorrectStreakRuEn: Math.max(0, saved.bestCorrectStreakRuEn ?? 0) }
}
export const saveStats = (stats: Stats) => put('stats', stats)
export const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
