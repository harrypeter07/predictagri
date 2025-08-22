#!/usr/bin/env node

/**
 * 🚀 HTML Error Parsing Test Script
 * 
 * This script demonstrates how the improved NASA service
 * parses HTML error responses and provides frontend-friendly information.
 */

// Sample HTML error responses from NASA APIs
const sampleHtmlErrors = [
  {
    name: 'Server Error 500',
    html: `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Server Error</title>
    </head>
    <body>
        <div class="max-w-xl mx-auto sm:px-6 lg:px-8">
            <div class="flex items-center pt-8 sm:justify-start sm:pt-0">
                <div class="px-4 text-lg text-gray-500 border-r border-gray-400 tracking-wider">
                    500
                </div>
                <div class="ml-4 text-lg text-gray-500 uppercase tracking-wider">
                    Server Error
                </div>
            </div>
        </div>
    </body>
</html>`,
    statusCode: 500
  },
  {
    name: 'Not Found 404',
    html: `<!DOCTYPE html>
<html>
<head>
    <title>Not Found</title>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The requested resource was not found.</p>
</body>
</html>`,
    statusCode: 404
  },
  {
    name: 'Forbidden 403',
    html: `<!DOCTYPE html>
<html>
<head>
    <title>Forbidden</title>
</head>
<body>
    <h1>403 - Forbidden</h1>
    <p>Access to this resource is forbidden.</p>
</body>
</html>`,
    statusCode: 403
  }
]

// HTML parsing function (same as in nasaDataService)
function parseHtmlError(htmlContent, statusCode) {
  try {
    // Extract title from HTML
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Error'
    
    // Extract error code if present
    const errorCodeMatch = htmlContent.match(/(\d{3})/)
    const errorCode = errorCodeMatch ? errorCodeMatch[1] : statusCode.toString()
    
    // Extract main error message
    let errorMessage = title
    if (title.includes('Server Error')) {
      errorMessage = `NASA API Server Error (${errorCode})`
    } else if (title.includes('Not Found')) {
      errorMessage = `NASA API Endpoint Not Found (${errorCode})`
    } else if (title.includes('Forbidden')) {
      errorMessage = `NASA API Access Forbidden (${errorCode})`
    } else if (title.includes('Unauthorized')) {
      errorMessage = `NASA API Unauthorized (${errorCode})`
    }
    
    return {
      errorType: 'html_response',
      statusCode: parseInt(errorCode),
      title: title,
      message: errorMessage,
      isHtmlError: true,
      rawHtml: htmlContent.substring(0, 500) // First 500 chars for debugging
    }
  } catch (parseError) {
    return {
      errorType: 'parse_error',
      statusCode: statusCode,
      title: 'HTML Parse Error',
      message: `Failed to parse HTML error response: ${parseError.message}`,
      isHtmlError: true,
      rawHtml: htmlContent.substring(0, 200)
    }
  }
}

// User-friendly error creation function
function createUserFriendlyError(errorData, apiName) {
  const baseMessage = `${apiName} is currently unavailable`
  
  if (errorData.statusCode === 503) {
    return {
      userMessage: `${baseMessage} - NASA service is temporarily down`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please try again in a few minutes',
      severity: 'warning'
    }
  } else if (errorData.statusCode === 500) {
    return {
      userMessage: `${baseMessage} - NASA server error`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'This is a NASA server issue, please try again later',
      severity: 'error'
    }
  } else if (errorData.statusCode === 403) {
    return {
      userMessage: `${baseMessage} - API key issue`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please check your NASA API key configuration',
      severity: 'error'
    }
  } else if (errorData.statusCode === 404) {
    return {
      userMessage: `${baseMessage} - Endpoint not found`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'The requested NASA API endpoint may have changed',
      severity: 'warning'
    }
  } else {
    return {
      userMessage: `${baseMessage}`,
      technicalDetails: `Status: ${errorData.statusCode}, Service: ${apiName}`,
      recommendation: 'Please try again or contact support',
      severity: 'info'
    }
  }
}

// Test the HTML parsing
console.log('🚀 HTML Error Parsing Test\n')

sampleHtmlErrors.forEach((sample, index) => {
  console.log(`📋 Test ${index + 1}: ${sample.name}`)
  console.log('-'.repeat(50))
  
  const parsedError = parseHtmlError(sample.html, sample.statusCode)
  const userError = createUserFriendlyError(parsedError, 'Sample API')
  
  console.log('🔍 Parsed Error:')
  console.log(`   Status Code: ${parsedError.statusCode}`)
  console.log(`   Title: ${parsedError.title}`)
  console.log(`   Message: ${parsedError.message}`)
  console.log(`   Type: ${parsedError.errorType}`)
  
  console.log('\n👤 User-Friendly Error:')
  console.log(`   Message: ${userError.userMessage}`)
  console.log(`   Technical: ${userError.technicalDetails}`)
  console.log(`   Recommendation: ${userError.recommendation}`)
  console.log(`   Severity: ${userError.severity}`)
  
  console.log('\n' + '='.repeat(60) + '\n')
})

console.log('✅ HTML parsing test completed!')
console.log('\n💡 Frontend Benefits:')
console.log('   • Clear user messages instead of technical errors')
console.log('   • Actionable recommendations for users')
console.log('   • Severity levels for UI styling')
console.log('   • Fallback data when APIs fail')
console.log('   • Detailed logging for developers')
