import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OnnxModelService } from './services/onnxModelService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize ONNX model service
const onnxService = new OnnxModelService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    modelLoaded: onnxService.isModelLoaded()
  });
});

// Prediction endpoint
app.post('/predict', async (req, res) => {
  try {
    const { numeric, categorical } = req.body;
    
    if (!numeric || !categorical) {
      return res.status(400).json({
        error: 'Missing required fields: numeric and categorical features'
      });
    }

    console.log('Received prediction request:', { numeric, categorical });
    
    const prediction = await onnxService.runPrediction(numeric, categorical);
    
    console.log('Prediction completed:', prediction);
    
    res.json({
      success: true,
      prediction: prediction,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: 'Prediction failed',
      details: error.message
    });
  }
});

// Schema endpoint
app.get('/schema', async (req, res) => {
  try {
    const schema = await onnxService.loadSchema();
    res.json(schema);
  } catch (error) {
    console.error('Schema error:', error);
    res.status(500).json({
      error: 'Failed to load schema',
      details: error.message
    });
  }
});

// Model info endpoint
app.get('/model-info', (req, res) => {
  res.json({
    modelLoaded: onnxService.isModelLoaded(),
    modelPath: onnxService.getModelPath(),
    schemaPath: onnxService.getSchemaPath(),
    lastLoaded: onnxService.getLastLoadedTime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PredictAgri Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Prediction endpoint: http://localhost:${PORT}/predict`);
  console.log(`📋 Schema endpoint: http://localhost:${PORT}/schema`);
});

export default app;
