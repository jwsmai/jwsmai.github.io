import { nextTick } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp({ router }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    // The voice list loads asynchronously; refresh it when it becomes ready
    let voices: SpeechSynthesisVoice[] = []
    const refreshVoices = () => {
      voices = window.speechSynthesis.getVoices()
    }
    refreshVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)

    // Prefer the most natural en-US voices, falling back gracefully
    const pickVoice = (): SpeechSynthesisVoice | null => {
      if (!voices.length) refreshVoices()
      const en = voices.filter((v) =>
        v.lang.toLowerCase().startsWith('en'),
      )
      if (!en.length) return null

      const match = (keywords: string[]) =>
        en.find((v) =>
          keywords.some((k) => v.name.toLowerCase().includes(k)),
        )

      return (
        // Chrome: Google US English (neural when online)
        match(['google us english']) ||
        // Edge: Microsoft Aria Online (Natural) — free neural voice
        match(['online (natural)', 'natural - online']) ||
        match(['samantha', 'aria', 'ava', 'allison', 'jenny']) ||
        en.find((v) => v.lang.toLowerCase() === 'en-us') ||
        en[0]
      )
    }

    const speak = (text: string) => {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = pickVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        utterance.lang = 'en-US'
      }
      utterance.rate = 0.85
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }

    const attachButtons = () => {
      document.querySelectorAll('.vp-doc table').forEach((table) => {
        table.querySelectorAll('tbody tr').forEach((row) => {
          const cell = row.querySelector('td:first-child')
          if (!cell || cell.querySelector('.pronounce-btn')) return

          const word = (cell.textContent || '').trim()
          // Skip rows without a word / overly long phrases
          if (!word || word.length > 60) return
          // Skip non-English entries (e.g. Chinese words) — no English pronunciation button
          if (/[\u4e00-\u9fff]/.test(word)) return

          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'pronounce-btn'
          btn.title = 'Listen to pronunciation'
          btn.setAttribute('aria-label', `Listen to ${word}`)
          btn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
          btn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            speak(word)
          })
          cell.appendChild(btn)
        })
      })
    }

    // DOM might not be ready when enhanceApp runs; retry at several points
    const run = () => {
      nextTick(attachButtons)
      setTimeout(attachButtons, 50)
      setTimeout(attachButtons, 300)
      setTimeout(attachButtons, 1000)
    }

    run()
    router.onAfterRouteChanged = run

    // Also react to async content rendering
    const observer = new MutationObserver(() => attachButtons())
    observer.observe(document.body, { childList: true, subtree: true })
  }
}
