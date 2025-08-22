'use client'

import { useState } from 'react'

export default function VoicePanel() {
  const [language, setLanguage] = useState('en')
  const [query, setQuery] = useState('What crops should I plant this season?')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    try {
      setLoading(true)
      setResult(null)
      // For now we simulate audioInput with a string token
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioInput: 'SIMULATED_AUDIO', language, context: { query } })
      })
      const json = await res.json()
      setResult(json)
    } catch (e) {
      setResult({ success: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">🎤 Voice Assistant (Gemini)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input
          className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
        <button
          onClick={ask}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>
      {result && (
        <pre className="text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded p-3 overflow-auto max-h-56">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
