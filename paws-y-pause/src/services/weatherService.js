const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast'

export async function getCurrentWeather({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
  })
  const response = await fetch(`${WEATHER_API_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`No se pudo consultar el clima (${response.status})`)
  }

  return response.json()
}
