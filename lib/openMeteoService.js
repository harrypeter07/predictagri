// Open-Meteo wrapper (no API key required)
class OpenMeteoService {
  constructor(baseUrl = 'https://api.open-meteo.com/v1') {
    this.baseUrl = baseUrl
  }

  async getCurrent(lat, lon) {
    const url = `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenMeteo current failed: ${res.status}`)
    return res.json()
  }

  async getDaily(lat, lon) {
    const url = `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenMeteo daily failed: ${res.status}`)
    return res.json()
  }
}

export const openMeteoService = new OpenMeteoService()
export default openMeteoService
