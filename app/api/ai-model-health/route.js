export async function GET() {
  try {
    console.log('🔍 Proxying health check to backend...')
    
    const response = await fetch('https://agribackend-f3ky.onrender.com/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`)
    }
    
    const healthData = await response.json()
    console.log('✅ Health check successful:', healthData)
    
    return Response.json(healthData)
  } catch (error) {
    console.error('❌ Health check proxy error:', error)
    return Response.json(
      { 
        status: 'unhealthy', 
        model_loaded: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}

