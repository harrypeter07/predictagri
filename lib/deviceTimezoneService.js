// Device Timezone Service - Get timezone directly from device
// No external API calls required

import { Logger } from './logger.js'

class DeviceTimezoneService {
  constructor() {
    this.logger = new Logger({ service: 'DeviceTimezoneService' })
  }

  // Get timezone information from the device
  getDeviceTimezone() {
    try {
      // Get the current timezone offset in minutes
      const timezoneOffset = new Date().getTimezoneOffset()
      
      // Get the timezone name (e.g., "Asia/Kolkata", "America/New_York")
      const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Calculate GMT offset in seconds (positive for timezones ahead of GMT)
      const gmtOffset = -timezoneOffset * 60
      
      // Check if daylight saving time is currently active
      const now = new Date()
      const jan = new Date(now.getFullYear(), 0, 1)
      const jul = new Date(now.getFullYear(), 6, 1)
      const isDST = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== now.getTimezoneOffset()
      
      const timezoneData = {
        timezone: timezoneName,
        gmtOffset: gmtOffset,
        dst: isDST,
        timezoneOffset: timezoneOffset,
        source: 'device'
      }
      
      this.logger.info('device_timezone_retrieved', { 
        timezone: timezoneName, 
        gmtOffset: gmtOffset,
        dst: isDST 
      })
      
      return timezoneData
    } catch (error) {
      this.logger.error('device_timezone_failed', { error: error.message })
      
      // Fallback to a default timezone (Asia/Kolkata for India)
      return {
        timezone: 'Asia/Kolkata',
        gmtOffset: 19800, // 5:30 hours in seconds
        dst: false,
        timezoneOffset: -330, // 5:30 hours in minutes
        source: 'fallback'
      }
    }
  }

  // Get timezone information for a specific date (useful for historical data)
  getTimezoneForDate(date) {
    try {
      const targetDate = new Date(date)
      const timezoneOffset = targetDate.getTimezoneOffset()
      const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone
      const gmtOffset = -timezoneOffset * 60
      
      // Check DST for the specific date
      const jan = new Date(targetDate.getFullYear(), 0, 1)
      const jul = new Date(targetDate.getFullYear(), 6, 1)
      const isDST = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== targetDate.getTimezoneOffset()
      
      return {
        timezone: timezoneName,
        gmtOffset: gmtOffset,
        dst: isDST,
        timezoneOffset: timezoneOffset,
        source: 'device',
        date: targetDate.toISOString()
      }
    } catch (error) {
      this.logger.error('device_timezone_date_failed', { error: error.message, date })
      return this.getDeviceTimezone() // Fallback to current timezone
    }
  }

  // Get formatted timezone string
  getFormattedTimezone() {
    const timezoneData = this.getDeviceTimezone()
    const sign = timezoneData.gmtOffset >= 0 ? '+' : '-'
    const hours = Math.abs(Math.floor(timezoneData.gmtOffset / 3600))
    const minutes = Math.abs(Math.floor((timezoneData.gmtOffset % 3600) / 60))
    
    return `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Get timezone abbreviation (e.g., IST, EST, PST)
  getTimezoneAbbreviation() {
    try {
      const timezoneData = this.getDeviceTimezone()
      const date = new Date()
      const options = { timeZoneName: 'short' }
      const timeZoneName = date.toLocaleDateString('en-US', options).split(', ')[1]
      return timeZoneName || timezoneData.timezone.split('/').pop()
    } catch (error) {
      this.logger.error('timezone_abbreviation_failed', { error: error.message })
      return 'UTC'
    }
  }

  // Check if timezone is supported by the application
  isTimezoneSupported(timezoneName) {
    const supportedTimezones = [
      'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Karachi', 'Asia/Colombo',
      'America/New_York', 'America/Los_Angeles', 'America/Chicago',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin',
      'Australia/Sydney', 'Australia/Melbourne',
      'Africa/Cairo', 'Africa/Lagos'
    ]
    
    return supportedTimezones.includes(timezoneName)
  }

  // Get agricultural timezone classification
  getAgriculturalTimezoneClassification() {
    const timezoneData = this.getDeviceTimezone()
    const gmtOffset = timezoneData.gmtOffset
    
    // Classify based on GMT offset for agricultural purposes
    if (gmtOffset >= 19800 && gmtOffset <= 23400) {
      return 'South_Asia' // India, Pakistan, Bangladesh, Sri Lanka
    } else if (gmtOffset >= 25200 && gmtOffset <= 28800) {
      return 'Southeast_Asia' // Thailand, Vietnam, Indonesia
    } else if (gmtOffset >= -18000 && gmtOffset <= -14400) {
      return 'North_America_East' // Eastern US/Canada
    } else if (gmtOffset >= -28800 && gmtOffset <= -25200) {
      return 'North_America_West' // Western US/Canada
    } else if (gmtOffset >= 0 && gmtOffset <= 3600) {
      return 'Europe_West' // UK, Ireland, Portugal
    } else if (gmtOffset >= 3600 && gmtOffset <= 7200) {
      return 'Europe_Central' // Central Europe
    } else {
      return 'Other'
    }
  }
}

// Create a singleton instance
export const deviceTimezoneService = new DeviceTimezoneService()

// For browser-side usage (client components)
export const getClientTimezone = () => {
  if (typeof window !== 'undefined') {
    try {
      const timezoneOffset = new Date().getTimezoneOffset()
      const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone
      const gmtOffset = -timezoneOffset * 60
      
      const now = new Date()
      const jan = new Date(now.getFullYear(), 0, 1)
      const jul = new Date(now.getFullYear(), 6, 1)
      const isDST = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== now.getTimezoneOffset()
      
      return {
        timezone: timezoneName,
        gmtOffset: gmtOffset,
        dst: isDST,
        timezoneOffset: timezoneOffset,
        source: 'client_device'
      }
    } catch (error) {
      console.warn('Failed to get client timezone:', error)
      return {
        timezone: 'Asia/Kolkata',
        gmtOffset: 19800,
        dst: false,
        timezoneOffset: -330,
        source: 'client_fallback'
      }
    }
  }
  return null
}
