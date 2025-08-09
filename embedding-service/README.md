# Embedding Service for AWS Deployment

This service provides embedding generation capabilities using Sentence Transformers, optimized for deployment on AWS EC2.

## Features

- FastAPI-based REST API
- Sentence Transformers integration
- Health check endpoints
- CORS support
- AWS EC2 deployment ready

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

## AWS Deployment

The service is currently deployed on AWS EC2 at:
- **URL:** `http://100.29.9.155:8000`
- **Health Check:** `http://100.29.9.155:8000/health`
- **Embed Service:** `http://100.29.9.155:8000/embed`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMBEDDING_MODEL` | Sentence Transformers model name | `all-MiniLM-L6-v2` |
| `PORT` | Port to run the service on | `8000` |

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

- The model is loaded at startup and kept in memory for fast inference.
- AWS EC2 provides reliable performance and uptime.

## Troubleshooting

### Common Issues

1. **Service not starting:**
   - Check the AWS EC2 instance logs
   - Ensure all dependencies are in `requirements.txt`

2. **Model loading errors:**
   - Verify the model name in environment variables
   - Check internet connectivity for model download

3. **Memory issues:**
   - Consider upgrading the EC2 instance type
   - Monitor instance performance in AWS Console

### Logs

Check the AWS EC2 instance logs for detailed error information.

## Updating Your Frontend

After deployment, update your frontend environment variables:

```env
NEXT_PUBLIC_EMBEDDING_SERVICE_URL=http://100.29.9.155:8000
```

## Cost Optimization

- **EC2 Instance:** Pay only for compute time used
- **Auto-scaling:** Can be configured for traffic spikes
- **Monitoring:** Use AWS CloudWatch for performance monitoring

## Security Considerations

1. **CORS:** Configure `allow_origins` properly for production
2. **Rate Limiting:** Consider adding rate limiting for production use
3. **Authentication:** Add API key authentication if needed 