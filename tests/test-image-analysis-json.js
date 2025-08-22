// Test: Image Analysis via JSON base64 payload
// Usage: node tests/test-image-analysis-json.js [--file public/image.png] [--type comprehensive] [--port 3000]

import fs from 'fs'
import path from 'path'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true])
  return acc
}, []))

const filePath = args.file || 'public/image.png'
const analysisType = args.type || 'comprehensive'
const port = args.port || '3000'

async function main() {
  try {
    const abs = path.resolve(filePath)
    if (!fs.existsSync(abs)) {
      console.error(`❌ File not found: ${abs}`)
      process.exit(1)
    }

    const buf = fs.readFileSync(abs)
    const imageBase64 = buf.toString('base64')

    const res = await fetch(`http://localhost:${port}/api/image-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, analysisType })
    })

    const json = await res.json()
    console.log('✅ Status:', res.status)
    console.log('📦 Response:')
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.error('❌ Test failed:', e.message)
    process.exit(1)
  }
}

main()
