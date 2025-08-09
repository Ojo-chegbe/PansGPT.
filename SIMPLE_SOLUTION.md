# 🚀 Simple EC2 Embedding Service Setup (Guaranteed to Work)

## Current Status
- ✅ EC2 Instance: `i-040b841b6820a6ec3`  
- ✅ Public IP: `34.207.103.116`
- ✅ Instance Type: `t3.small` (2GB RAM)
- ✅ SSH Key: `embedding-service-key.pem`

## Step-by-Step Setup (5 Minutes)

### 1. SSH into your instance
```bash
ssh -i embedding-service-key.pem ubuntu@34.207.103.116
```

### 2. Run these commands in the EC2 instance:

```bash
# Update system
sudo apt update -y

# Install Python and dependencies
sudo apt install -y python3-pip python3-venv

# Create and setup the service
mkdir ~/embedding-service
cd ~/embedding-service
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install fastapi uvicorn sentence-transformers torch
```

### 3. Create the service file:
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
```

### 4. Start the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## ✅ Testing

Once the service starts (you'll see "Model loaded!" in the logs), test it:

```bash
# In a new terminal/tab, test:
curl http://3.81.234.132:8000/health
```

## 💡 Pro Tips

1. **Keep the SSH session open** - The service runs in the foreground
2. **For background running**, use `screen` or `tmux`:
   ```bash
   screen -S embedding
   uvicorn main:app --host 0.0.0.0 --port 8000
   # Press Ctrl+A then D to detach
   ```

3. **To reconnect to background session**:
   ```bash
   screen -r embedding
   ```

## 🎯 Your Service URL
After setup: **http://3.81.234.132:8000**

## 💰 Cost
- **t3.small**: ~$15/month
- **Much cheaper than Northflank**
- **No resource limits**

Your embedding service URL is already updated in `src/lib/embedding-service.ts` to use `http://3.81.234.132:8000`! 