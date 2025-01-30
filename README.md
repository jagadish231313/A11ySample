# Node.js API Server with WAVE Accessibility

A REST API server with WAVE accessibility evaluation integration.

## Available Endpoints

- `GET /` - Welcome message
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `POST /api/accessibility/evaluate` - Evaluate website accessibility using WAVE

## Testing the API

You can test the API using cURL or any API client:

```bash
# Evaluate website accessibility
curl -X POST http://localhost:3000/api/accessibility/evaluate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Get all users
curl http://localhost:3000/api/users

# Get user by ID
curl http://localhost:3000/api/users/1

# Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "New User", "email": "new@example.com"}'
```

## Setup

1. Get your WAVE API key from [WAVE API](https://wave.webaim.org/api/)
2. Add your API key to the `.env` file
3. Run `npm install` to install dependencies
4. Start the server with `npm run dev`