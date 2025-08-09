#!/bin/bash

# EC2 User Data Script - Runs automatically on instance launch
# This script sets up the embedding service without manual intervention

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "🚀 Starting automatic EC2 setup for Embedding Service..."

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install Python 3.11 and dependencies
apt-get install -y python3.11 python3.11-pip python3.11-venv git curl

# Create application directory
mkdir -p /opt/embedding-service
chown -R ubuntu:ubuntu /opt/embedding-service

# Switch to ubuntu user context for the rest
sudo -u ubuntu bash << 'USERSCRIPT'
cd /opt/embedding-service

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 sentence-transformers==2.7.0 torch>=2.0.0,<3.0.0 transformers>=4.30.0,<5.0.0 numpy>=1.24.0,<2.0.0 pydantic>=2.0.0,<3.0.0 requests>=2.28.0

# Create the main application file
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

USERSCRIPT

# Create systemd service file
cat > /etc/systemd/system/embedding-service.service << 'EOF'
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
systemctl daemon-reload
systemctl enable embedding-service
systemctl start embedding-service

# Configure firewall
ufw allow 22    # SSH
ufw allow 8000  # Embedding service
ufw --force enable

echo "🎉 Embedding Service setup complete!"
echo "Service will be available at port 8000 once the model downloads and loads." 