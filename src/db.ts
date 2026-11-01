export type Word = { id: string; word: string; translations: string[]; createdAt: string; updatedAt: string }
export type Stats = { bestCorrectStreak: number }
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
export const loadStats = () => get<Stats>('stats', { bestCorrectStreak: 0 })
export const saveStats = (stats: Stats) => put('stats', stats)
export const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
