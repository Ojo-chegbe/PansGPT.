from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import torch
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize model with explicit device placement
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    model.to(device)
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

class EmbedRequest(BaseModel):
    texts: list[str]

@app.post("/embed")
async def embed(req: EmbedRequest):
    try:
        if not req.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        vectors = model.encode(req.texts, device=device).tolist()
        return {"embeddings": vectors}
    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "device": device} 