# Embedding Service for Render Deployment

This service provides embedding generation capabilities using Sentence Transformers, optimized for deployment on Render.

## Features

- FastAPI-based REST API
- Sentence Transformers integration
- Health check endpoints
- CORS support
- Docker support
- Render deployment ready

## Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the service:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:8000/health
   ```

## Render Deployment

### Option 1: Using Render Dashboard

1. **Create a new Web Service on Render**
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:**
     - `EMBEDDING_MODEL`: `all-MiniLM-L6-v2` (or your preferred model)
     - `PYTHON_VERSION`: `3.11.0`

### Option 2: Using render.yaml (Recommended)

1. **Push your code to GitHub**
2. **Connect your repository to Render**
3. **Render will automatically detect the `render.yaml` file**
4. **The service will be deployed automatically**

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMBEDDING_MODEL` | Sentence Transformers model name | `all-MiniLM-L6-v2` |
| `PORT` | Port to run the service on | `8000` (set by Render) |

## API Endpoints

### Health Check
```bash
GET /health
```

### Generate Embeddings
```bash
POST /embed
Content-Type: application/json

{
  "texts": ["Your text here", "Another text"]
}
```

### Generate Single Embedding
```bash
POST /embed-single
Content-Type: application/json

{
  "texts": ["Your text here"]
}
```

## Performance Considerations

1. **Model Loading:** The model is loaded once when the service starts
2. **Memory Usage:** Consider upgrading to a paid Render plan for better performance
3. **Cold Starts:** The service may take time to start initially due to model downloading

## Troubleshooting

### Common Issues

1. **Service not starting:**
   - Check the logs in Render dashboard
   - Ensure all dependencies are in `requirements.txt`

2. **Model loading errors:**
   - Verify the model name in environment variables
   - Check internet connectivity for model download

3. **Memory issues:**
   - Upgrade to a paid Render plan
   - Consider using a smaller model

### Logs

Check the Render dashboard logs for detailed error information.

## Updating Your Frontend

After deployment, update your frontend environment variables:

```env
NEXT_PUBLIC_EMBEDDING_SERVICE_URL=https://your-service-name.onrender.com
```

## Cost Optimization

- **Free Tier:** Limited to 750 hours/month
- **Paid Plans:** Start at $7/month for better performance
- **Auto-sleep:** Free tier services sleep after 15 minutes of inactivity

## Security Considerations

1. **CORS:** Configure `allow_origins` properly for production
2. **Rate Limiting:** Consider adding rate limiting for production use
3. **Authentication:** Add API key authentication if needed 