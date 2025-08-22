'use client'

import { useState } from 'react'

export default function AgriPipelinePanel({ region = 'kansas' }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runPipeline = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Pipeline failed')
      setResult(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">🚀 Automated Agri Pipeline</h3>
        <button
          onClick={runPipeline}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Running...' : 'Run Now'}
        </button>
      </div>
      {error && <p className="mt-3 text-red-300 text-sm">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2 text-gray-300 text-sm">
          <p>Pipeline ID: <span className="text-white">{result.pipelineId}</span></p>
          <p>Insights: <span className="text-white">{result.insights?.length || 0}</span></p>
          <p>Predictions: <span className="text-white">{result.predictions?.length || 0}</span></p>
          <p>Alerts: <span className="text-white">{result.alerts?.length || 0}</span></p>
          {result.insights?.length > 0 && (
            <div className="mt-3">
              <p className="text-gray-400 mb-1">Top Insight</p>
              <div className="bg-gray-800 border border-gray-700 rounded p-3">
                {result.insights[0].message}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
