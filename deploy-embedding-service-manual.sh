#!/bin/bash

echo "🚀 Deploying FastAPI Embedding Service with SentenceTransformers..."

# Stop existing services
echo "🛑 Stopping existing services..."
pkill -f simple_server.py
pkill -f fastapi_server.py
pkill -f main.py
sleep 2

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install sentence-transformers torch transformers numpy pydantic fastapi uvicorn

# Create service directory
echo "📁 Creating service directory..."
mkdir -p /opt/embedding-service
cd /opt/embedding-service

# Create the FastAPI embedding service
echo "🔧 Creating FastAPI embedding service..."
cat > main.py << 'EOF'
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Embedding Service")

# Global model variable
model = None
model_name = None

@app.on_event("startup")
async def startup_event():
    """Load the embedding model on startup"""
    global model, model_name
    
    model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    logger.info(f"Loading embedding model: {model_name}")
    
    try:
        model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model = None

class EmbeddingRequest(BaseModel):
    texts: list[str]

@app.get("/")
async def root():
    return {"message": "Embedding Service is running", "model": model_name}

@app.get("/health")
async def health_check():
    if model is None:
        logger.error("Health check failed: Model not loaded")
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Test the model with a simple embedding
        test_text = ["test"]
        embeddings = model.encode(test_text, convert_to_tensor=False)
        logger.info("Health check passed: Model is working correctly")
        return {"status": "healthy", "model": model_name}
    except Exception as e:
        logger.error(f"Health check failed: Model error - {e}")
        raise HTTPException(status_code=503, detail=f"Model error: {str(e)}")

@app.post("/embed")
async def generate_embeddings(request: EmbeddingRequest):
    """Generate embeddings for multiple texts"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")
        
        # Generate embeddings
        embeddings = model.encode(request.texts, convert_to_tensor=False)
        
        # Convert to list of lists
        embeddings_list = embeddings.tolist()
        
        logger.info(f"Generated embeddings with shape: {embeddings.shape}")
        
        return {
            "embeddings": embeddings_list,
            "model_name": model_name
        }
    
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

@app.post("/embed-single")
async def generate_single_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    if len(request.texts) != 1:
        raise HTTPException(status_code=400, detail="This endpoint expects exactly one text")
    
    response = await generate_embeddings(request)
    return {"embedding": response["embeddings"][0], "model_name": response["model_name"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# Create systemd service
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/embedding-service.service << 'EOF'
[Unit]
Description=Embedding Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/embedding-service
Environment=EMBEDDING_MODEL=all-MiniLM-L6-v2
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start the service
echo "🚀 Starting embedding service..."
systemctl daemon-reload
systemctl enable embedding-service
systemctl start embedding-service

# Wait for service to start
echo "⏳ Waiting for service to start (this may take a few minutes for model download)..."
sleep 120

# Check if service is running
if systemctl is-active --quiet embedding-service; then
    echo "✅ Embedding service started successfully!"
    echo "🔍 Testing health endpoint..."
    curl -s http://localhost:8000/health
    echo ""
    echo "🎉 Deployment complete!"
    echo "📊 Service URLs:"
    echo "   Health: http://localhost:8000/health"
    echo "   Embed: http://localhost:8000/embed"
    echo "   Root: http://localhost:8000/"
else
    echo "❌ Failed to start embedding service"
    systemctl status embedding-service
    echo "📋 Checking logs..."
    journalctl -u embedding-service -n 20
fi 