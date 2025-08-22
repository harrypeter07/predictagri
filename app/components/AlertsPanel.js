'use client'

import { useState } from 'react'

export default function AlertsPanel() {
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('en')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const sendAlert = async () => {
    try {
      setLoading(true)
      setStatus(null)
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          language,
          alertData: {
            type: 'drought',
            severity: 'high',
            region: 'Demo Region',
            crop: 'Wheat',
            recommendation: 'Expected rainfall deficit – consider drought resistant options.'
          }
        })
      })
      const json = await res.json()
      setStatus(json)
    } catch (e) {
      setStatus({ success: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">📣 Send Test Alert (Twilio)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input
          className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
          placeholder="Phone e.g. +91XXXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          onClick={sendAlert}
          disabled={loading || !phone}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Sending...' : 'Send Alert'}
        </button>
      </div>
      {status && (
        <pre className="text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded p-3 overflow-auto max-h-40">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  )
}
