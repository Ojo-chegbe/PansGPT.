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

# Load the embedding model
model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
logger.info(f"Loading embedding model: {model_name}")

try:
    model = SentenceTransformer(model_name)
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

@app.on_event("startup")
async def startup_event():
    global model
    logger.info("Starting embedding service...")
    if model is None:
        logger.info("Attempting to load model on startup...")
        try:
            model = SentenceTransformer(model_name)
            logger.info("Model loaded successfully on startup")
        except Exception as e:
            logger.error(f"Failed to load model on startup: {e}")
            model = None

class EmbeddingRequest(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model_name: str

@app.get("/")
async def root():
    return {"message": "Embedding Service is running", "model": model_name}

@app.get("/health")
async def health_check():
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Test model with a simple embedding to ensure it's working
        test_text = "test"
        test_embedding = model.encode([test_text])
        
        return {
            "status": "healthy", 
            "model": model_name,
            "model_loaded": model is not None,
            "embedding_shape": test_embedding.shape if test_embedding is not None else None
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

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
    if len(request.texts) != 1:
        raise HTTPException(status_code=400, detail="This endpoint expects exactly one text")
    
    response = await generate_embeddings(request)
    return {"embedding": response.embeddings[0], "model_name": response.model_name}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 