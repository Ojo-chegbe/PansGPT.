# ✅ **WORKING EC2 Embedding Service Solution**

## 🎉 **Success! Your Instance is Ready**

- ✅ **EC2 Instance**: `i-02df7f7cd0ff7f7d8`
- ✅ **Public IP**: `3.81.234.132`
- ✅ **SSH Key**: `embedding-key-new.pem` (working!)
- ✅ **Instance Type**: `t3.small` (2GB RAM)
- ✅ **SSH Access**: Confirmed working
- ✅ **Application Updated**: Points to `http://3.81.234.132:8000`

## 🚀 **Setup Your Embedding Service (5 Minutes)**

### **Step 1: SSH into your instance**
```bash
ssh -i embedding-key-new.pem ubuntu@3.81.234.132
```

### **Step 2: Setup the service (copy all at once)**
```bash
# Update system and install dependencies
sudo apt update -y && sudo apt install -y python3-pip python3-venv

# Create service directory
mkdir ~/embedding-service && cd ~/embedding-service

# Create virtual environment
python3 -m venv venv && source venv/bin/activate

# Install packages (this takes 2-3 minutes)
pip install fastapi uvicorn sentence-transformers torch
```

### **Step 3: Create the service file**
```bash
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
    logger.info("Model loaded successfully!")

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
```

### **Step 4: Start the service**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

**You'll see:**
```
INFO:     Loading model...
INFO:     Model loaded successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## ✅ **Testing Your Service**

Open a **new terminal/PowerShell** window and test:

```bash
# Health check
curl http://3.81.234.132:8000/health

# Test embeddings
curl -X POST http://3.81.234.132:8000/embed -H "Content-Type: application/json" -d '{"texts": ["Hello world", "This is a test"]}'
```

## 🔄 **Run in Background (Optional)**

If you want the service to run in background:

```bash
# Install screen
sudo apt install screen

# Start screen session
screen -S embedding

# Run the service
uvicorn main:app --host 0.0.0.0 --port 8000

# Detach from screen: Press Ctrl+A then D
# Reconnect later: screen -r embedding
```

## 💰 **Cost & Performance**

- **Cost**: ~$15/month for t3.small
- **Performance**: Much faster than Northflank free tier
- **Memory**: 2GB RAM - perfect for all-MiniLM-L6-v2
- **No Docker overhead** = faster startup & better performance

## 🎯 **What's Already Done**

✅ Your application (`src/lib/embedding-service.ts`) is updated to use `http://3.81.234.132:8000`  
✅ Security group configured with SSH (22) and HTTP (8000) access  
✅ SSH key (`embedding-key-new.pem`) is working  
✅ EC2 instance is running and accessible  

## 🚨 **Important Notes**

1. **Keep SSH session open** while the service runs (or use `screen`)
2. **Model download** takes 1-2 minutes on first startup
3. **Your service URL**: `http://3.81.234.132:8000`
4. **SSH command**: `ssh -i embedding-key-new.pem ubuntu@3.81.234.132`

**Your embedding service will be running at `http://3.81.234.132:8000` within 5 minutes!** 🎉 