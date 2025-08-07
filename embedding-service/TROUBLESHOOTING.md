# Embedding Service Troubleshooting Guide

## "No Healthy Upstream" Error

This error typically occurs when the health check fails. Here are the most common causes and solutions:

### 1. Docker Image Issues

**Problem**: Wrong Docker image name or missing image
**Solution**: 
- Verify the image name in `northflank.yaml` matches your Docker Hub repository
- Ensure the GitHub workflow is successfully building and pushing the image
- Check Docker Hub for the latest image: `ojochegbe/embedding-service:latest`

### 2. Health Check Failures

**Problem**: The `/health` endpoint is not responding correctly
**Causes**:
- Model not loading properly
- Service not starting
- Memory issues
- Network connectivity problems

**Solutions**:
- Check Northflank logs for startup errors
- Verify the model downloads correctly (first run may take time)
- Ensure sufficient memory allocation

### 3. Model Loading Issues

**Problem**: The sentence-transformers model fails to load
**Solutions**:
- Check if the model name is correct: `all-MiniLM-L6-v2`
- Verify internet connectivity for model download
- Ensure sufficient disk space for model storage

### 4. Resource Constraints

**Problem**: Container runs out of memory or CPU
**Solutions**:
- Increase memory allocation in Northflank
- Use a smaller model if needed
- Add resource limits to Dockerfile

## Debugging Steps

### 1. Check Northflank Logs
```bash
# View service logs in Northflank dashboard
# Look for:
# - Startup errors
# - Model loading messages
# - Health check failures
```

### 2. Test Locally
```bash
# Build and run locally
cd embedding-service
docker build -t embedding-service .
docker run -p 8000:8000 embedding-service

# Test health endpoint
curl http://localhost:8000/health

# Test embedding endpoint
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["test"]}'
```

### 3. Verify Docker Image
```bash
# Check if image exists on Docker Hub
docker pull ojochegbe/embedding-service:latest

# Run the pulled image
docker run -p 8000:8000 ojochegbe/embedding-service:latest
```

### 4. Check GitHub Actions
- Verify the Docker build workflow is successful
- Check that secrets are properly configured
- Ensure the image is being pushed to Docker Hub

## Common Fixes

### 1. Update Northflank Configuration
If you changed the Docker image name, update `northflank.yaml`:
```yaml
docker:
  image: ojochegbe/embedding-service:latest  # Use your actual username
```

### 2. Increase Health Check Timeout
If the model takes time to load, increase the timeout:
```yaml
healthcheck:
  path: /health
  interval: 60s  # Increased from 30s
  timeout: 30s   # Increased from 10s
  retries: 5     # Increased from 3
```

### 3. Add Environment Variables
If needed, add more environment variables:
```yaml
env:
  - name: EMBEDDING_MODEL
    value: all-MiniLM-L6-v2
  - name: PYTHONUNBUFFERED
    value: "1"
  - name: LOG_LEVEL
    value: "INFO"
```

## Monitoring

### Health Check Endpoint
The `/health` endpoint returns:
```json
{
  "status": "healthy",
  "model": "all-MiniLM-L6-v2",
  "model_loaded": true,
  "embedding_shape": [1, 384]
}
```

### Logs to Watch For
- `"Loading embedding model: all-MiniLM-L6-v2"`
- `"Model loaded successfully"`
- `"Starting embedding service..."`
- Any error messages during startup

## Quick Fixes

1. **Restart the service** in Northflank
2. **Redeploy** the latest image
3. **Check resource allocation** (memory/CPU)
4. **Verify network connectivity** for model downloads
5. **Clear and rebuild** the Docker image if needed 