import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


// WAVE API Integration
async function evaluateAccessibility(url, reportType = 1) {
  try {
    const waveUrl = `${process.env.WAVE_API_URL}?key=${process.env.WAVE_API_KEY}&url=${encodeURIComponent(url)}&reporttype=${reportType}`;
    const response = await fetch(waveUrl);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('WAVE API Error:', error);
    throw new Error('Failed to evaluate accessibility');
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});


// WAVE Accessibility endpoint
app.post('/api/accessibility/evaluate', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const result = await evaluateAccessibility(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});