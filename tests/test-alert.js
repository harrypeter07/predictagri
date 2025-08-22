// Test: Send a demo alert via /api/alerts
// Usage: node tests/test-alert.js --phone +91XXXXXXXXXX [--lang hi] [--port 3000]

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true])
  return acc
}, []))

const phone = args.phone
const language = args.lang || 'en'
const port = args.port || '3000'

if (!phone) {
  console.error('❌ Provide --phone E.164 number (e.g., +91XXXXXXXXXX)')
  process.exit(1)
}

async function main() {
  try {
    const res = await fetch(`http://localhost:${port}/api/alerts`, {
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
    console.log('✅ Status:', res.status)
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.error('❌ Test failed:', e.message)
    process.exit(1)
  }
}

main()
