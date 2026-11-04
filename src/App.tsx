import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Plus, Dumbbell, Search, Download, Upload, Pencil, Trash2, X, Check, ArrowLeftRight, Trophy, ChevronRight } from 'lucide-react'
import { loadWords, saveWords, loadStats, saveStats, normalize, type Word, type Stats } from './db'

type Tab = 'dictionary' | 'add' | 'training'
type Direction = 'en-ru' | 'ru-en'
type ImportData = { version?: number; words?: Word[]; statistics?: { bestCorrectStreakEnRu?: number; bestCorrectStreakRuEn?: number } }
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export default function App() {
  const [tab, setTab] = useState<Tab>('dictionary')
  const [words, setWords] = useState<Word[]>([])
  const [stats, setStats] = useState<Stats>({ bestCorrectStreakEnRu: 0, bestCorrectStreakRuEn: 0 })
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [translationInput, setTranslationInput] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { Promise.all([loadWords(), loadStats()]).then(([w, s]) => { setWords(w); setStats(s); setReady(true) }).catch(() => { setNotice('Не удалось открыть локальное хранилище') }) }, [])
  useEffect(() => { if (ready) void saveWords(words) }, [words, ready])
  useEffect(() => { if (ready) void saveStats(stats) }, [stats, ready])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3200); return () => window.clearTimeout(timer) }, [notice])

  const sortedWords = useMemo(() => [...words].sort((a, b) => a.word.localeCompare(b.word, 'en')), [words])
  const filteredWords = useMemo(() => sortedWords.filter(w => normalize(w.word).includes(normalize(query)) || w.translations.some(t => normalize(t).includes(normalize(query)))), [sortedWords, query])

  function clearForm() { setWordInput(''); setTranslationInput(''); setEditId(null) }
  function submitWord(e: React.FormEvent) {
    e.preventDefault()
    const word = wordInput.trim().replace(/\s+/g, ' ')
    const translations = [...new Set(translationInput.split(/[,;\n]/).map(t => t.trim().replace(/\s+/g, ' ')).filter(Boolean))]
    if (!word || !translations.length) { setNotice('Заполните английское слово и хотя бы один перевод'); return }
    const duplicate = words.find(w => normalize(w.word) === normalize(word) && w.id !== editId)
    if (duplicate) { setNotice('Это слово уже есть в словаре'); return }
    if (editId) setWords(prev => prev.map(w => w.id === editId ? { ...w, word, translations, updatedAt: now() } : w))
    else setWords(prev => [...prev, { id: uid(), word, translations, createdAt: now(), updatedAt: now() }])
    clearForm(); setTab('dictionary'); setNotice(editId ? 'Изменения сохранены' : 'Слово добавлено')
  }
  function editWord(w: Word) { setEditId(w.id); setWordInput(w.word); setTranslationInput(w.translations.join(', ')); setTab('add') }
  function deleteWord(w: Word) { if (window.confirm(`Удалить «${w.word}» из словаря?`)) setWords(prev => prev.filter(item => item.id !== w.id)) }
  function exportJSON() {
    const payload = { version: 1, exportedAt: now(), words: sortedWords, statistics: stats }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `my-vocabulary-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
  }
  async function importJSON(file?: File) {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as ImportData
      if (!Array.isArray(data.words)) throw new Error('В файле не найден массив words')
      const imported: Word[] = data.words.map(item => {
        if (!item || typeof item.word !== 'string' || !Array.isArray(item.translations) || !item.translations.every(t => typeof t === 'string')) throw new Error('Некорректная структура слова')
        return { id: typeof item.id === 'string' ? item.id : uid(), word: item.word.trim(), translations: item.translations.map(t => t.trim()).filter(Boolean), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || now() }
      }).filter(w => w.word && w.translations.length)
      const mode = window.prompt('Введите «объединить» или «заменить»', 'объединить')?.trim().toLowerCase()
      if (mode !== 'объединить' && mode !== 'заменить') return
      if (mode === 'заменить' && !window.confirm('Текущий словарь будет полностью заменён. Продолжить?')) return
      if (mode === 'заменить') { setWords(imported); setStats({ bestCorrectStreakEnRu: Math.max(0, data.statistics?.bestCorrectStreakEnRu ?? 0), bestCorrectStreakRuEn: Math.max(0, data.statistics?.bestCorrectStreakRuEn ?? 0) }); setNotice(`Импортировано слов: ${imported.length}`) }
      else {
        const seen = new Set(words.map(w => normalize(w.word))); const additions = imported.filter(w => { const key = normalize(w.word); if (seen.has(key)) return false; seen.add(key); return true })
        setWords(prev => [...prev, ...additions]); setStats(prev => ({ bestCorrectStreakEnRu: Math.max(prev.bestCorrectStreakEnRu, data.statistics?.bestCorrectStreakEnRu ?? 0), bestCorrectStreakRuEn: Math.max(prev.bestCorrectStreakRuEn, data.statistics?.bestCorrectStreakRuEn ?? 0) }))
        setNotice(`Добавлено: ${additions.length}. Пропущено дубликатов: ${imported.length - additions.length}`)
      }
    } catch (error) { setNotice(error instanceof Error ? `Ошибка импорта: ${error.message}` : 'Не удалось прочитать файл') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">M</span><span>My Vocabulary</span></div><div className="top-count">{words.length} {wordLabel(words.length)}</div></header>
    <main className="main-content">
      {tab === 'dictionary' && <section className="page">
        <div className="page-heading"><div><p className="eyebrow">ТВОЯ КОЛЛЕКЦИЯ</p><h1>Словарь</h1><p className="muted">Все слова, которые ты хочешь запомнить.</p></div><div className="toolbar"><button className="icon-button" title="Импортировать JSON" onClick={() => fileRef.current?.click()}><Upload size={18}/></button><button className="icon-button" title="Экспортировать JSON" onClick={exportJSON}><Download size={18}/></button></div></div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => void importJSON(e.target.files?.[0])}/>
        {words.length === 0 ? <div className="empty-state"><div className="empty-icon"><BookOpen size={26}/></div><h2>Здесь пока пусто</h2><p>Добавь первое английское слово — и начни собирать свой словарь.</p><button className="primary-button" onClick={() => setTab('add')}><Plus size={18}/> Добавить слово</button></div> : <>
          <div className="word-table"><div className="table-head"><span>АНГЛИЙСКИЙ</span><span>ПЕРЕВОД</span><span></span></div>
            {filteredWords.map(w => <div className="word-row" key={w.id}><div className="english-word">{w.word}</div><div className="translations">{w.translations.join(', ')}</div><div className="row-actions"><button className="mini-button" title="Редактировать" onClick={() => editWord(w)}><Pencil size={16}/></button><button className="mini-button danger" title="Удалить" onClick={() => deleteWord(w)}><Trash2 size={16}/></button></div></div>)}
            {filteredWords.length === 0 && <div className="no-results">Ничего не найдено</div>}
          </div>
          <div className="search-wrap"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по словарю"/><span className="search-count">{filteredWords.length} / {words.length}</span>{query && <button className="clear-search" onClick={() => setQuery('')}><X size={16}/></button>}</div>
        </>}
      </section>}
      {tab === 'add' && <section className="page narrow-page"><div className="page-heading"><div><p className="eyebrow">ПОПОЛНЯЙ СЛОВАРЬ</p><h1>{editId ? 'Редактировать' : 'Новое слово'}</h1><p className="muted">Одно слово — несколько вариантов перевода.</p></div>{editId && <button className="icon-button" onClick={clearForm}><X size={18}/></button>}</div>
        <form className="word-form" onSubmit={submitWord}><label>Английское слово<input autoFocus value={wordInput} onChange={e => setWordInput(e.target.value)} placeholder="Например, nevertheless"/></label><label>Перевод на русский <span className="label-hint">несколько вариантов разделяй запятой</span><textarea value={translationInput} onChange={e => setTranslationInput(e.target.value)} placeholder="тем не менее, несмотря на это" rows={4}/></label><button className="primary-button full-button" type="submit"><Check size={18}/>{editId ? 'Сохранить изменения' : 'Добавить в словарь'}</button></form>
      </section>}
      {tab === 'training' && <Training words={sortedWords} stats={stats} setStats={setStats} />}
    </main>
    <nav className="bottom-nav"><button className={tab === 'dictionary' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('dictionary')}><BookOpen size={20}/><span>Словарь</span></button><button className={tab === 'add' ? 'nav-item active add-nav' : 'nav-item add-nav'} onClick={() => { clearForm(); setTab('add') }}><span className="nav-add-icon"><Plus size={22}/></span><span>Добавить</span></button><button className={tab === 'training' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('training')}><Dumbbell size={20}/><span>Тренировка</span></button></nav>
    {notice && <div className="toast">{notice}</div>}
  </div>
}

function wordLabel(n: number) { const mod10 = n % 10, mod100 = n % 100; if (mod10 === 1 && mod100 !== 11) return 'слово'; if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'слова'; return 'слов' }

type TrainingCard = { word: Word; translation: string }

function Training({ words, stats, setStats }: { words: Word[]; stats: Stats; setStats: React.Dispatch<React.SetStateAction<Stats>> }) {
  const [direction, setDirection] = useState<Direction>('en-ru')
  const [active, setActive] = useState(false)
  const [deck, setDeck] = useState<TrainingCard[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'manual' | null>(null)
  const [streak, setStreak] = useState(0)
  const [manualWord, setManualWord] = useState<Word | null>(null)
  const timer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = deck[index]
  const prompt = current ? (direction === 'en-ru' ? current.word.word : current.translation) : ''
  const expected = current ? (direction === 'en-ru' ? current.word.translations : [current.word.word]) : []
  const bestStreak = direction === 'en-ru' ? stats.bestCorrectStreakEnRu : stats.bestCorrectStreakRuEn

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  function shuffle(items: TrainingCard[]) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  function makeDeck(source: Word[], mode: Direction): TrainingCard[] {
    const cards = mode === 'en-ru'
      ? source.map(word => ({ word, translation: word.translations[0] ?? '' }))
      : source.flatMap(word => word.translations.map(translation => ({ word, translation })))
    return shuffle(cards)
  }
  function start() { setDeck(makeDeck(words, direction)); setIndex(0); setAnswer(''); setFeedback(null); setStreak(0); setActive(true) }
  function next() {
    if (timer.current) window.clearTimeout(timer.current)
    if (index + 1 >= deck.length) { setDeck(makeDeck(words, direction)); setIndex(0) } else setIndex(i => i + 1)
    setAnswer(''); setFeedback(null); setManualWord(null)
  }
  function scheduleNext() { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(next, 1000) }
  function mark(correct: boolean) {
    setFeedback(correct ? 'correct' : 'wrong')
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    if (correct && nextStreak > bestStreak) setStats(prev => direction === 'en-ru'
      ? { ...prev, bestCorrectStreakEnRu: nextStreak }
      : { ...prev, bestCorrectStreakRuEn: nextStreak })
    scheduleNext()
  }
  function check(e: React.FormEvent) {
    e.preventDefault()
    if (!current || feedback || !answer.trim()) return
    if (expected.some(v => normalize(v) === normalize(answer))) mark(true)
    else { setFeedback('manual'); setManualWord(current.word) }
  }
  if (!words.length) return <section className="page"><div className="page-heading"><div><p className="eyebrow">ЗАКРЕПЛЯЙ ЗНАНИЯ</p><h1>Тренировка</h1><p className="muted">Добавь слова в словарь, чтобы начать заниматься.</p></div></div><div className="empty-state"><div className="empty-icon"><Dumbbell size={26}/></div><h2>Пока нечего повторять</h2><p>Сначала добавь несколько слов в словарь.</p></div></section>
  if (!active) return <section className="page training-page"><div className="page-heading"><div><p className="eyebrow">ЗАКРЕПЛЯЙ ЗНАНИЯ</p><h1>Тренировка</h1><p className="muted">Небольшая практика каждый день.</p></div></div><div className="record-card"><div className="record-icon"><Trophy size={21}/></div><div><span>Рекорд серии · {direction === 'en-ru' ? 'EN → RU' : 'RU → EN'}</span><strong>{bestStreak}</strong><small>правильных ответов подряд</small></div></div><div className="direction-card"><h2>Выбери направление</h2><button className={direction === 'en-ru' ? 'direction-option selected' : 'direction-option'} onClick={() => setDirection('en-ru')}><span className="direction-flag">EN</span><span><strong>Английский → Русский</strong><small>Вспоминай перевод слова</small></span><span className="radio-dot"/></button><button className={direction === 'ru-en' ? 'direction-option selected' : 'direction-option'} onClick={() => setDirection('ru-en')}><span className="direction-flag ru">RU</span><span><strong>Русский → Английский</strong><small>Вспоминай английское слово</small></span><span className="radio-dot"/></button><button className="primary-button full-button start-button" onClick={start}>Начать тренировку <ChevronRight size={18}/></button><p className="training-note">В этом цикле {direction === 'en-ru' ? words.length : words.reduce((sum, word) => sum + word.translations.length, 0)} карточек. Каждая встретится один раз за круг.</p></div></section>
  return <section className="page training-page"><div className="training-topline"><button className="back-button" onClick={() => setActive(false)}>← Завершить</button><span>{index + 1} / {deck.length}</span></div><div className="streak-line"><span>Текущая серия</span><strong>{streak}</strong></div><div className="progress-track"><div style={{ width: `${((index + 1) / deck.length) * 100}%` }}/></div><div className="flash-card"><span className="card-direction">{direction === 'en-ru' ? 'ПЕРЕВЕДИ НА РУССКИЙ' : 'ПЕРЕВЕДИ НА АНГЛИЙСКИЙ'}</span><div className="flash-word">{prompt}</div><form onSubmit={check} className="answer-form"><input ref={inputRef} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="done" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Твой перевод…"/><button className="primary-button" disabled={!!feedback || !answer.trim()} onPointerDown={event => event.preventDefault()} type="submit">Проверить</button></form>
    {feedback === 'correct' && <div className="feedback good"><Check size={18}/> Верно!</div>}{feedback === 'wrong' && <div className="feedback bad"><X size={18}/> Неверно. {expected.join(', ')}</div>}{feedback === 'manual' && <div className="manual-check"><p>В словаре указано: <strong>{expected.join(', ')}</strong></p><p>Твой вариант подходит?</p><div><button className="secondary-button" onPointerDown={event => event.preventDefault()} onClick={() => mark(false)}>Неправильно</button><button className="success-button" onPointerDown={event => event.preventDefault()} onClick={() => mark(true)}>Правильно</button></div></div>}
    {feedback && <button className="next-button" onClick={next}>Следующее слово <ChevronRight size={18}/></button>}
  </div><div className="training-bottom"><span><Trophy size={16}/> Рекорд: {bestStreak}</span><span><ArrowLeftRight size={16}/> {direction === 'en-ru' ? 'EN → RU' : 'RU → EN'}</span></div></section>
}
