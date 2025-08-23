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

  async generateRealisticPrediction(inputFeatures) {
    // Check if Gemini is available
    if (!this.available) {
      console.log('❌ Gemini not available, using fallback prediction');
      return this.getFallbackPrediction(inputFeatures);
    }
    
    const prompt = this.buildPredictionPrompt(inputFeatures);
    
    // Try different models if one fails
    for (let i = 0; i < this.models.length; i++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.models[i] });
        console.log(`🔄 Trying Gemini model for prediction: ${this.models[i]}`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Success with model for prediction: ${this.models[i]}`);
        return this.parsePredictionResponse(text);
      } catch (error) {
        console.error(`❌ Model ${this.models[i]} failed for prediction:`, error.message);
        
        // If it's an API key error, don't try other models
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
          console.error('❌ Invalid API key - stopping model attempts');
          break;
        }
        
        // If it's the last model, use fallback
        if (i === this.models.length - 1) {
          console.error('❌ All Gemini models failed for prediction, using fallback');
          return this.getFallbackPrediction(inputFeatures);
        }
      }
    }
    
    // If we get here, use fallback response
    return this.getFallbackPrediction(inputFeatures);
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

  buildPredictionPrompt(inputFeatures) {
    // Add some randomization to prevent pattern repetition
    const randomSeed = Math.random();
    const timestamp = Date.now();
    
    return `You are a highly experienced agricultural scientist and crop yield prediction expert with 30+ years of experience in precision agriculture and machine learning for crop modeling.

**ANALYSIS ID:** ${timestamp}-${randomSeed.toFixed(4)}
**TASK:** Generate a realistic crop yield prediction based on the following environmental and farming conditions.

**INPUT DATA:**
- Temperature: ${inputFeatures.temperature}°C
- Humidity: ${inputFeatures.humidity}%
- Rainfall: ${inputFeatures.rainfall}mm
- Soil pH: ${inputFeatures.ph}
- Fertilizer Usage: ${inputFeatures.fertilizer_usage} kg/ha
- Risk Score: ${(inputFeatures.risk_score * 100).toFixed(1)}%
- Crop: ${inputFeatures.crop || 'Unknown'}
- Region: ${inputFeatures.region || 'Unknown'}

**CRITICAL REQUIREMENTS:**
1. **Generate a realistic yield prediction** between 0.1 (10%) and 0.95 (95%) based on these conditions
2. **MUST VARY predictions significantly** based on different input conditions
3. **Consider all environmental factors** and their interactions
4. **Be realistic** - don't always predict perfect yields
5. **Consider crop-specific requirements** for the given crop type
6. **Account for regional climate patterns** and farming practices

**RESPONSE FORMAT:**
Respond ONLY with a JSON object in this exact format:
{
  "yield_prediction": 0.XX,
  "risk_score": 0.XX,
  "confidence": 0.XX,
  "reasoning": "Brief explanation of the prediction"
}

**PREDICTION GUIDELINES:**
- **Temperature Impact**: 
  * Below 15°C or above 40°C: Reduce yield by 30-50%
  * 15-20°C or 35-40°C: Reduce yield by 10-20%
  * 20-30°C: Optimal range, maintain or slightly increase yield
- **Humidity Impact**:
  * Below 30% or above 80%: Reduce yield by 20-30%
  * 30-40% or 70-80%: Reduce yield by 5-15%
  * 40-70%: Optimal range
- **Rainfall Impact**:
  * Below 10mm or above 50mm: Reduce yield by 25-40%
  * 10-20mm or 30-50mm: Reduce yield by 10-20%
  * 20-30mm: Optimal range
- **Soil pH Impact**:
  * Below 5.5 or above 8.0: Reduce yield by 30-50%
  * 5.5-6.0 or 7.0-8.0: Reduce yield by 10-20%
  * 6.0-7.0: Optimal range
- **Fertilizer Impact**:
  * Below 20 kg/ha or above 150 kg/ha: Reduce yield by 20-35%
  * 20-50 kg/ha or 100-150 kg/ha: Reduce yield by 5-15%
  * 50-100 kg/ha: Optimal range

**IMPORTANT RULES:**
- yield_prediction must be a decimal between 0.1 and 0.95
- risk_score must be a decimal between 0.1 and 0.9
- confidence must be a decimal between 0.5 and 0.95
- NEVER return 1.0 (100%) yield - be realistic
- **CRITICAL**: Each prediction must be unique based on the specific input values
- **CRITICAL**: If inputs are different, predictions MUST be different
- **CRITICAL**: Consider the cumulative effect of multiple suboptimal conditions
- **CRITICAL**: Use the exact input values to calculate a precise prediction
- **CRITICAL**: Do not use generic responses - analyze each factor individually`;
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

  parsePredictionResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const predictionData = JSON.parse(jsonMatch[0]);
        
        // Validate the prediction data
        const yield_prediction = Math.max(0.1, Math.min(0.95, predictionData.yield_prediction || 0.5));
        const risk_score = Math.max(0.1, Math.min(0.9, predictionData.risk_score || 0.3));
        const confidence = Math.max(0.5, Math.min(0.95, predictionData.confidence || 0.7));
        
        console.log('🧠 Gemini generated prediction:', {
          yield_prediction,
          risk_score,
          confidence,
          reasoning: predictionData.reasoning || 'No reasoning provided'
        });
        
        return {
          yield_prediction,
          risk_score,
          confidence,
          reasoning: predictionData.reasoning || 'Prediction generated by AI expert',
          source: 'gemini'
        };
      } else {
        console.warn('⚠️ Could not parse JSON from Gemini response, using fallback');
        return this.getFallbackPrediction({});
      }
    } catch (error) {
      console.error('❌ Error parsing Gemini prediction response:', error);
      return this.getFallbackPrediction({});
    }
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

  getFallbackPrediction(inputFeatures) {
    // Generate a more varied fallback prediction based on environmental conditions
    let baseYield = 0.65; // Base 65% yield
    let baseRisk = 0.25; // Base 25% risk
    
    // Temperature impact (more granular)
    const temp = inputFeatures.temperature || 25;
    if (temp < 10 || temp > 45) {
      baseYield -= 0.4;
      baseRisk += 0.3;
    } else if (temp < 15 || temp > 40) {
      baseYield -= 0.25;
      baseRisk += 0.2;
    } else if (temp < 18 || temp > 35) {
      baseYield -= 0.15;
      baseRisk += 0.1;
    } else if (temp < 22 || temp > 28) {
      baseYield -= 0.05;
      baseRisk += 0.05;
    }
    
    // Humidity impact (more granular)
    const humidity = inputFeatures.humidity || 65;
    if (humidity < 20 || humidity > 90) {
      baseYield -= 0.3;
      baseRisk += 0.25;
    } else if (humidity < 30 || humidity > 80) {
      baseYield -= 0.2;
      baseRisk += 0.15;
    } else if (humidity < 40 || humidity > 70) {
      baseYield -= 0.1;
      baseRisk += 0.1;
    }
    
    // Rainfall impact (more granular)
    const rainfall = inputFeatures.rainfall || 25;
    if (rainfall < 5 || rainfall > 60) {
      baseYield -= 0.35;
      baseRisk += 0.3;
    } else if (rainfall < 10 || rainfall > 50) {
      baseYield -= 0.2;
      baseRisk += 0.2;
    } else if (rainfall < 15 || rainfall > 40) {
      baseYield -= 0.1;
      baseRisk += 0.1;
    }
    
    // Soil pH impact (more granular)
    const soilPh = inputFeatures.ph || 6.5;
    if (soilPh < 4.5 || soilPh > 9.0) {
      baseYield -= 0.4;
      baseRisk += 0.35;
    } else if (soilPh < 5.5 || soilPh > 8.0) {
      baseYield -= 0.3;
      baseRisk += 0.25;
    } else if (soilPh < 6.0 || soilPh > 7.5) {
      baseYield -= 0.15;
      baseRisk += 0.15;
    }
    
    // Fertilizer impact (more granular)
    const fertilizer = inputFeatures.fertilizer_usage || 50;
    if (fertilizer < 10 || fertilizer > 200) {
      baseYield -= 0.3;
      baseRisk += 0.25;
    } else if (fertilizer < 20 || fertilizer > 150) {
      baseYield -= 0.2;
      baseRisk += 0.2;
    } else if (fertilizer < 40 || fertilizer > 120) {
      baseYield -= 0.1;
      baseRisk += 0.1;
    }
    
    // Add some randomness to prevent identical predictions
    const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% variation
    baseYield += randomFactor;
    
    // Ensure values are within bounds
    const yield_prediction = Math.max(0.1, Math.min(0.95, baseYield));
    const risk_score = Math.max(0.1, Math.min(0.9, baseRisk));
    
    return {
      yield_prediction,
      risk_score,
      confidence: 0.6,
      reasoning: `Fallback prediction based on environmental conditions. Temperature: ${temp}°C, Humidity: ${humidity}%, Rainfall: ${rainfall}mm, pH: ${soilPh}, Fertilizer: ${fertilizer}kg/ha`,
      source: 'fallback'
    };
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
