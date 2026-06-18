import { create } from 'zustand'
import { Lang, translations, TranslationKey } from './translations'

interface LangStore {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

export const useLang = create<LangStore>((set, get) => ({
  lang: (localStorage.getItem('cad-lang') as Lang) ?? 'ja',
  setLang: (lang) => {
    localStorage.setItem('cad-lang', lang)
    set({ lang })
  },
  t: (key) => translations[get().lang][key],
}))
