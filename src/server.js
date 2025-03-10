
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import AWS from 'aws-sdk';

import puppeteer from 'puppeteer';

dotenv.config();

const app = express();
const port = 3000;
let wUrls = ["https://www.ada.gov", "https://www.ada.gov/topics/"];

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Create a WebSocket server by passing the HTTP server
// const wss = new WebSocketServer.Server({ server });
const wss = new WebSocketServer({ port: 8080 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// WAVE API Integration
async function evaluateAccessibility(url, reportType = 3) {
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

app.get('/th', async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://www.ssa.gov/", { waitUntil: 'domcontentloaded' });
  const base64 = await page.screenshot({
    encoding: 'base64',
    fullPage: false,
    clip: {             // Optional: define the area to capture
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    },
  });
  await browser.close();
  return res.json({base64});
})

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

// Fetch JSON data endpoint
app.get('/api/accessibility/evaluatejson', async (req, res) => {
  const { url } = req.query; // Use req.query for GET requests

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const data = await fetch(url);
    const fetchJsonData = await data.json();
    console.log('fetchJsonData: ', fetchJsonData);
    res.json(fetchJsonData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  console.log('waveUrlsS3: ', wUrls)

  const waveUrls =  wUrls.map(mappedUrl => `${process.env.WAVE_API_URL}?key=${process.env.WAVE_API_KEY}&url=${encodeURIComponent(mappedUrl)}&reporttype=${process.env.REPORT_TYPE}`);

  // Function to fetch data from a URL
  const fetchData = async (url) => {
    try {
      console.log('fetchurl: ', url)
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      return null;
    }
  };

  // Fetch data from all URLs concurrently
  // Promise.all(urls.map(fetchData))
  Promise.all(waveUrls.map(fetchData))
    .then((responses) => {
      // Send the responses to the client via WebSocket
      console.log('ws data')
      ws.send(JSON.stringify(responses));
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
      ws.send(JSON.stringify({ error: 'Failed to fetch data' }));
    });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  setTimeout(() => {
    ws.send('ws sample resend testmessages after an interval ');
  }, 10000)

  ws.on('onmessage', (res) => {
    console.log('running new url:', res)
  })
  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});


// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.ACCESSKEYID, // Replace with your access key
  secretAccessKey: process.env.SECRETACCESSKEY, // Replace with your secret key
  region: 'us-east-2', // Replace with your bucket's region (e.g., 'us-east-1')
});

// Create an S3 instance
const s3 = new AWS.S3();

// Configure AWS SDK (no credentials needed for public buckets)
AWS.config.update({
  region: 'us-east-2', // Replace with your bucket's region (e.g., 'us-east-1')
});

// Create an S3 instance
// Function to download JSON file from a public S3 bucket
async function downloadJsonFromPublicS3(bucketName, fileKey) {
  const params = {
    Bucket: bucketName, // Name of your public S3 bucket
    Key: fileKey, // Key of the file in the S3 bucket
  };

  try {
    // Download the file
    const data = await s3.getObject(params).promise();

    // Parse the JSON data
    const jsonData = JSON.parse(data.Body.toString('utf-8'));

    console.log('Downloaded JSON:', jsonData.names);
    return jsonData.names;
  } catch (error) {
    console.error('Error downloading JSON from S3:', error);
    throw error;
  }
}

// Example usage
const bucketName = 'mya11yurlbucket'; // Replace with your public bucket name
const fileKey = 'data.json'; // Replace with the file key

downloadJsonFromPublicS3(bucketName, fileKey)
  .then((jsonData) => {
    console.log('JSON data:', jsonData);
    wUrls = jsonData
  })
  .catch((error) => {
    console.error('Failed to download JSON:', error);
  });