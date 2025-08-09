# Simplified EC2 deployment script
# This launches an instance and provides SSH commands for manual setup

param(
    [string]$KeyPairName = "embedding-service-key",
    [string]$InstanceType = "t3.small",
    [string]$SecurityGroupName = "embedding-service-sg"
)

Write-Host "🚀 Launching EC2 instance with manual setup..." -ForegroundColor Green

# Launch instance without user data for manual setup
$instanceId = aws ec2 run-instances `
    --image-id ami-09ac0b140f63d3458 `
    --count 1 `
    --instance-type $InstanceType `
    --key-name $KeyPairName `
    --security-groups $SecurityGroupName `
    --query 'Instances[0].InstanceId' `
    --output text

if ($instanceId) {
    Write-Host "✅ Instance launched: $instanceId" -ForegroundColor Green
    
    # Tag the instance
    aws ec2 create-tags --resources $instanceId --tags Key=Name,Value="Embedding Service Manual"
    
    # Wait for instance to be running
    Write-Host "⏳ Waiting for instance to start..." -ForegroundColor Yellow
    aws ec2 wait instance-running --instance-ids $instanceId
    
    # Get public IP
    $publicIp = aws ec2 describe-instances --instance-ids $instanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    Write-Host "🎉 Instance is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Instance ID: $instanceId" -ForegroundColor Cyan
    Write-Host "🌐 Public IP: $publicIp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Manual Setup Steps:" -ForegroundColor Yellow
    Write-Host "1. SSH into the instance:"
    Write-Host "   ssh -i embedding-service-key.pem ubuntu@$publicIp" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Run these commands on the instance:" -ForegroundColor Yellow
    Write-Host @"
   sudo apt update -y
   sudo apt install -y python3-pip python3-venv
   mkdir ~/embedding-service
   cd ~/embedding-service
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn sentence-transformers torch
   
   # Create the service file
   cat > main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Embedding Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

@app.on_event("startup")
async def startup_event():
    global model
    logger.info("Loading model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("Model loaded!")

class EmbeddingRequest(BaseModel):
    texts: List[str]

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "all-MiniLM-L6-v2"}

@app.post("/embed")
async def embed(request: EmbeddingRequest):
    if model is None:
        raise HTTPException(500, "Model not loaded")
    embeddings = model.encode(request.texts)
    return {"embeddings": embeddings.tolist(), "model_name": "all-MiniLM-L6-v2"}

@app.post("/embed-single") 
async def embed_single(request: EmbeddingRequest):
    if model is None:
        raise HTTPException(500, "Model not loaded")
    embedding = model.encode([request.texts[0]])[0]
    return {"embedding": embedding.tolist(), "model_name": "all-MiniLM-L6-v2"}
EOF
   
   # Start the service
   uvicorn main:app --host 0.0.0.0 --port 8000
"@ -ForegroundColor White
    
    Write-Host ""
    Write-Host "📝 After setup, your service will be at: http://$publicIp:8000" -ForegroundColor Magenta
    Write-Host "🧪 Test with: curl http://$publicIp:8000/health" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Failed to launch instance" -ForegroundColor Red
    exit 1
} 