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
