'use client'

import { useState, useEffect } from 'react'
import { getClientTimezone } from '../../lib/deviceTimezoneService.js'

export const DeviceTimezoneWidget = () => {
  const [timezoneData, setTimezoneData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchTimezoneData()
  }, [])

  const fetchTimezoneData = async () => {
    try {
      setLoading(true)
      
      // First try to get timezone from client-side
      let clientTimezone = getClientTimezone()
      
      if (clientTimezone) {
        // Use client-side timezone data
        setTimezoneData({
          ...clientTimezone,
          formatted: formatTimezone(clientTimezone.gmtOffset),
          abbreviation: getTimezoneAbbreviation(clientTimezone.timezone),
          source: 'client_device'
        })
      } else {
        // Fallback to server API
        const response = await fetch('/api/timezone')
        if (response.ok) {
          const data = await response.json()
          setTimezoneData(data)
        } else {
          throw new Error('Failed to fetch timezone data')
        }
      }
      
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError('Failed to fetch timezone data')
      console.error('Timezone fetch error:', err)
      
      // Set fallback data
      setTimezoneData({
        timezone: 'Asia/Kolkata',
        gmtOffset: 19800,
        dst: false,
        formatted: 'GMT+05:30',
        abbreviation: 'IST',
        source: 'fallback'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimezone = (gmtOffset) => {
    const sign = gmtOffset >= 0 ? '+' : '-'
    const hours = Math.abs(Math.floor(gmtOffset / 3600))
    const minutes = Math.abs(Math.floor((gmtOffset % 3600) / 60))
    return `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const getTimezoneAbbreviation = (timezone) => {
    const abbreviations = {
      'Asia/Kolkata': 'IST',
      'Asia/Dhaka': 'BDT',
      'Asia/Karachi': 'PKT',
      'America/New_York': 'EST',
      'America/Los_Angeles': 'PST',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Australia/Sydney': 'AEST'
    }
    return abbreviations[timezone] || timezone.split('/').pop()
  }

  const getAgriculturalZone = (gmtOffset) => {
    if (gmtOffset >= 19800 && gmtOffset <= 23400) {
      return 'South Asia'
    } else if (gmtOffset >= 25200 && gmtOffset <= 28800) {
      return 'Southeast Asia'
    } else if (gmtOffset >= -18000 && gmtOffset <= -14400) {
      return 'North America East'
    } else if (gmtOffset >= -28800 && gmtOffset <= -25200) {
      return 'North America West'
    } else if (gmtOffset >= 0 && gmtOffset <= 3600) {
      return 'Europe West'
    } else if (gmtOffset >= 3600 && gmtOffset <= 7200) {
      return 'Europe Central'
    } else {
      return 'Other'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 text-sm">
            ⚠️ {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🕐</span>
          Device Timezone
        </h3>
        <button
          onClick={fetchTimezoneData}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {timezoneData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Timezone:</span>
            <span className="font-medium text-gray-800">
              {timezoneData.timezone}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Offset:</span>
            <span className="font-medium text-gray-800">
              {timezoneData.formatted}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Abbreviation:</span>
            <span className="font-medium text-gray-800">
              {timezoneData.abbreviation}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">DST:</span>
            <span className={`font-medium ${timezoneData.dst ? 'text-green-600' : 'text-gray-600'}`}>
              {timezoneData.dst ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Agricultural Zone:</span>
            <span className="font-medium text-blue-600">
              {getAgriculturalZone(timezoneData.gmtOffset)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Source:</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {timezoneData.source}
            </span>
          </div>

          {lastUpdated && (
            <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DeviceTimezoneWidget
