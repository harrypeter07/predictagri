import { GoogleGenerativeAI } from '@google/generative-ai';

// Secret Gemini service for agriculture expert responses
class AgriExpertGemini {
  constructor() {
    // Check if API key is available
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('❌ GOOGLE_GEMINI_API_KEY not found in environment variables');
      this.available = false;
      return;
    }
    
    // Initialize Gemini with API key from environment
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    // Try different models in order of preference
    this.models = [
      "gemini-1.5-flash",
      "gemini-1.5-pro", 
      "gemini-pro",
      "gemini-1.0-pro"
    ];
    this.currentModelIndex = 0;
    this.model = this.genAI.getGenerativeModel({ model: this.models[0] });
    this.available = true;
  }

  async generateExpertAnalysis(predictionData, inputFeatures) {
    // Check if Gemini is available
    if (!this.available) {
      console.log('❌ Gemini not available, using fallback response');
      return this.getFallbackResponse(predictionData, inputFeatures);
    }
    
    const prompt = this.buildExpertPrompt(predictionData, inputFeatures);
    
    // Try different models if one fails
    for (let i = 0; i < this.models.length; i++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.models[i] });
        console.log(`🔄 Trying Gemini model: ${this.models[i]}`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Success with model: ${this.models[i]}`);
        return this.parseExpertResponse(text);
      } catch (error) {
        console.error(`❌ Model ${this.models[i]} failed:`, error.message);
        
        // If it's an API key error, don't try other models
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
          console.error('❌ Invalid API key - stopping model attempts');
          break;
        }
        
        // If it's the last model, use fallback
        if (i === this.models.length - 1) {
          console.error('❌ All Gemini models failed, using fallback');
          return this.getFallbackResponse(predictionData, inputFeatures);
        }
      }
    }
    
    // If we get here, use fallback response
    return this.getFallbackResponse(predictionData, inputFeatures);
  }

  buildExpertPrompt(predictionData, inputFeatures) {
    const yieldPercentage = (predictionData.yield_prediction * 100).toFixed(1);
    const riskPercentage = (predictionData.risk_score * 100).toFixed(1);
    
    return `You are a highly experienced agriculture expert with 25+ years of experience in crop yield analysis and farming practices. 

Based on the following crop yield prediction data and environmental conditions, provide a comprehensive expert analysis:

**CROP YIELD PREDICTION DATA:**
- Predicted Yield: ${yieldPercentage}%
- Risk Score: ${riskPercentage}%
- Crop: ${predictionData.crop}
- Region: ${predictionData.region}

**ENVIRONMENTAL CONDITIONS:**
- Temperature: ${inputFeatures.temperature}°C
- Humidity: ${inputFeatures.humidity}%
- Rainfall: ${inputFeatures.rainfall}mm
- Soil pH: ${inputFeatures.ph}
- Fertilizer Usage: ${inputFeatures.fertilizer_usage} kg/ha
- Risk Score: ${(inputFeatures.risk_score * 100).toFixed(1)}%

**EXPERT ANALYSIS REQUIREMENTS:**
1. **Yield Assessment**: Provide a realistic interpretation of the ${yieldPercentage}% yield prediction
2. **Risk Analysis**: Explain what the ${riskPercentage}% risk score means for this crop
3. **Environmental Impact**: Analyze how current conditions affect crop performance
4. **Recommendations**: Provide specific, actionable farming recommendations
5. **Market Context**: Consider regional farming practices and market conditions

**RESPONSE FORMAT:**
Provide your analysis in a structured format with clear sections. Be realistic, practical, and consider local farming conditions. Use technical agricultural terminology where appropriate, but keep it accessible to farmers.

**IMPORTANT:** 
- Be realistic about yield expectations based on the data
- Consider seasonal factors and regional farming practices
- Provide practical, implementable advice
- Address both opportunities and challenges
- Consider economic viability of recommendations`;

  }

  parseExpertResponse(responseText) {
    try {
      // Extract key sections from the response
      const sections = {
        yieldAssessment: this.extractSection(responseText, 'Yield Assessment', 'Risk Analysis'),
        riskAnalysis: this.extractSection(responseText, 'Risk Analysis', 'Environmental Impact'),
        environmentalImpact: this.extractSection(responseText, 'Environmental Impact', 'Recommendations'),
        recommendations: this.extractSection(responseText, 'Recommendations', 'Market Context'),
        marketContext: this.extractSection(responseText, 'Market Context', '')
      };

      return {
        expertAnalysis: responseText,
        sections: sections,
        summary: this.generateSummary(sections),
        confidence: this.calculateConfidence(responseText),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing expert response:', error);
      return {
        expertAnalysis: responseText,
        sections: {},
        summary: 'Expert analysis provided',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    }
  }

  extractSection(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    const endIndex = endMarker ? text.indexOf(endMarker, startIndex) : text.length;
    const sectionText = text.substring(startIndex, endIndex > startIndex ? endIndex : text.length);
    
    // Clean up the section text
    return sectionText
      .replace(startMarker, '')
      .replace(endMarker, '')
      .trim()
      .replace(/^[:\-\s]+/, '')
      .trim();
  }

  generateSummary(sections) {
    const keyPoints = [];
    
    if (sections.yieldAssessment) {
      keyPoints.push('Yield assessment completed');
    }
    if (sections.riskAnalysis) {
      keyPoints.push('Risk factors analyzed');
    }
    if (sections.recommendations) {
      keyPoints.push('Farming recommendations provided');
    }
    
    return keyPoints.join(' | ');
  }

  calculateConfidence(text) {
    // Simple confidence calculation based on response length and structure
    const wordCount = text.split(' ').length;
    const hasRecommendations = text.toLowerCase().includes('recommend') || text.toLowerCase().includes('suggest');
    const hasTechnicalTerms = text.toLowerCase().includes('fertilizer') || text.toLowerCase().includes('soil') || text.toLowerCase().includes('irrigation');
    
    let confidence = 0.7; // Base confidence
    
    if (wordCount > 100) confidence += 0.1;
    if (wordCount > 200) confidence += 0.1;
    if (hasRecommendations) confidence += 0.1;
    if (hasTechnicalTerms) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  getFallbackResponse(predictionData, inputFeatures) {
    const yieldPercentage = (predictionData.yield_prediction * 100).toFixed(1);
    const riskPercentage = (predictionData.risk_score * 100).toFixed(1);
    
    return {
      expertAnalysis: `**Yield Assessment:**
Based on the current prediction of ${yieldPercentage}% yield for ${predictionData.crop} in ${predictionData.region}, this indicates ${yieldPercentage >= 70 ? 'good' : yieldPercentage >= 50 ? 'moderate' : 'challenging'} growing conditions.

**Risk Analysis:**
The ${riskPercentage}% risk score suggests ${riskPercentage <= 30 ? 'low' : riskPercentage <= 60 ? 'moderate' : 'high'} risk factors that need attention.

**Environmental Impact:**
Current temperature of ${inputFeatures.temperature}°C and humidity of ${inputFeatures.humidity}% are ${inputFeatures.temperature >= 20 && inputFeatures.temperature <= 35 ? 'suitable' : 'suboptimal'} for ${predictionData.crop} growth. Soil pH of ${inputFeatures.ph} is ${inputFeatures.ph >= 6.0 && inputFeatures.ph <= 7.5 ? 'optimal' : 'needs adjustment'}.

**Recommendations:**
- Monitor soil moisture levels regularly
- Consider ${inputFeatures.ph < 6.0 ? 'liming' : inputFeatures.ph > 7.5 ? 'sulfur application' : 'maintaining current pH'}
- Optimize fertilizer application based on soil test results
- Implement proper irrigation scheduling

**Market Context:**
${predictionData.region} has established farming practices for ${predictionData.crop}. Consider local market demand and pricing trends.`,
      sections: {
        yieldAssessment: `Based on the current prediction of ${yieldPercentage}% yield for ${predictionData.crop} in ${predictionData.region}, this indicates ${yieldPercentage >= 70 ? 'good' : yieldPercentage >= 50 ? 'moderate' : 'challenging'} growing conditions.`,
        riskAnalysis: `The ${riskPercentage}% risk score suggests ${riskPercentage <= 30 ? 'low' : riskPercentage <= 60 ? 'moderate' : 'high'} risk factors that need attention.`,
        environmentalImpact: `Current temperature of ${inputFeatures.temperature}°C and humidity of ${inputFeatures.humidity}% are ${inputFeatures.temperature >= 20 && inputFeatures.temperature <= 35 ? 'suitable' : 'suboptimal'} for ${predictionData.crop} growth.`,
        recommendations: `Monitor soil moisture levels regularly. Consider ${inputFeatures.ph < 6.0 ? 'liming' : inputFeatures.ph > 7.5 ? 'sulfur application' : 'maintaining current pH'}. Optimize fertilizer application based on soil test results.`,
        marketContext: `${predictionData.region} has established farming practices for ${predictionData.crop}. Consider local market demand and pricing trends.`
      },
      summary: 'Fallback expert analysis provided',
      confidence: 0.6,
      timestamp: new Date().toISOString()
    };
  }
}

export default AgriExpertGemini;
