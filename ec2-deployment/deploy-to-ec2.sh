#!/bin/bash

# EC2 Deployment Script for Embedding Service
# This script sets up the embedding service on a fresh EC2 instance

set -e  # Exit on any error

echo "🚀 Starting EC2 Embedding Service Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Python 3.11 and pip
echo "🐍 Installing Python 3.11..."
sudo apt-get install -y python3.11 python3.11-pip python3.11-venv git

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/embedding-service
sudo chown -R ubuntu:ubuntu /opt/embedding-service
cd /opt/embedding-service

# Create virtual environment
echo "🔧 Creating virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install --upgrade pip
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 sentence-transformers==2.7.0 torch>=2.0.0,<3.0.0 transformers>=4.30.0,<5.0.0 numpy>=1.24.0,<2.0.0 pydantic>=2.0.0,<3.0.0 requests>=2.28.0

# Download the embedding service code
echo "📥 Setting up application code..."
cat > main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Embedding Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model_name: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "status": "healthy",
        "model_name": model_name,
        "service": "embedding-service"
    }

@app.post("/embed", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")
        
        # Generate embeddings
        embeddings = model.encode(request.texts, convert_to_tensor=False)
        
        # Convert to list of lists
        embeddings_list = embeddings.tolist()
        
        logger.info(f"Generated embeddings with shape: {embeddings.shape}")
        
        return EmbeddingResponse(
            embeddings=embeddings_list,
            model_name=model_name
        )
    
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

@app.post("/embed-single")
async def generate_single_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # For single embedding, just use the first text
        text = request.texts[0] if request.texts else ""
        embedding = model.encode([text], convert_to_tensor=False)[0]
        
        return {
            "embedding": embedding.tolist(),
            "model_name": model_name
        }
    
    except Exception as e:
        logger.error(f"Error generating single embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# Create systemd service file
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/embedding-service.service > /dev/null << EOF
[Unit]
Description=Embedding Service
After=network.target

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/embedding-service
Environment=PATH=/opt/embedding-service/venv/bin
Environment=EMBEDDING_MODEL=all-MiniLM-L6-v2
ExecStart=/opt/embedding-service/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Start and enable the service
echo "🎯 Starting embedding service..."
sudo systemctl daemon-reload
sudo systemctl enable embedding-service
sudo systemctl start embedding-service

# Configure firewall (if UFW is installed)
if command -v ufw &> /dev/null; then
    echo "🔒 Configuring firewall..."
    sudo ufw allow 22    # SSH
    sudo ufw allow 8000  # Embedding service
    sudo ufw --force enable
fi

# Wait a moment for service to start
sleep 10

# Check service status
echo "✅ Checking service status..."
sudo systemctl status embedding-service --no-pager

# Test the service
echo "🧪 Testing the service..."
if curl -f http://localhost:8000/health; then
    echo "✅ Service is running successfully!"
    echo "🌐 Your embedding service is now available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
else
    echo "❌ Service health check failed. Check logs with: sudo journalctl -u embedding-service -f"
fi

echo "🎉 Deployment complete!"
echo ""
echo "📋 Useful commands:"
echo "  - Check status: sudo systemctl status embedding-service"
echo "  - View logs: sudo journalctl -u embedding-service -f"
echo "  - Restart: sudo systemctl restart embedding-service"
echo "  - Stop: sudo systemctl stop embedding-service" 