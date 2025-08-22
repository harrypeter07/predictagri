'use client'

import { useEffect, useState } from 'react'

export default function NasaPanel({ lat = 38.5111, lon = -96.8005 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        setLoading(true)
        const res = await fetch(`/api/agri/nasa?lat=${lat}&lon=${lon}`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'NASA fetch failed')
        if (mounted) setData(json)
      } catch (e) {
        if (mounted) setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [lat, lon])

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">🛰️ NASA Agricultural Data</h3>
      {loading && <p className="text-gray-300">Loading NASA data...</p>}
      {error && <p className="text-red-300">{error}</p>}
      {data && (
        <div className="space-y-3 text-gray-300 text-sm">
          <div>
            <p className="text-gray-400">APOD</p>
            <p className="text-white">{data.apod?.data?.title || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-400">Disasters</p>
            <ul className="list-disc ml-5">
              {(data.disasters?.data || []).slice(0,3).map((e) => (
                <li key={e.id}>{e.title}</li>
              ))}
            </ul>
          </div>
          {data.imagery && (
            <p className="text-gray-400">Imagery Source: {data.imagery?.source}</p>
          )}
        </div>
      )}
    </div>
  )
}
