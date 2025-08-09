import json
import os
import logging
from sentence_transformers import SentenceTransformer
import numpy as np

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global model variable
model = None
model_name = None

def load_model():
    """Load the embedding model"""
    global model, model_name
    
    if model is not None:
        return model
    
    model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    logger.info(f"Loading embedding model: {model_name}")
    
    try:
        model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

def lambda_handler(event, context):
    """Lambda function handler"""
    
    # Load model (will be cached after first load)
    try:
        model = load_model()
    except Exception as e:
        return {
            'statusCode': 503,
            'body': json.dumps({
                'error': 'Model not loaded',
                'detail': str(e)
            })
        }
    
    # Parse the request
    try:
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
            
        texts = body.get('texts', [])
        
        if not texts:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'No texts provided'
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': 'Invalid request format',
                'detail': str(e)
            })
        }
    
    # Generate embeddings
    try:
        logger.info(f"Generating embeddings for {len(texts)} texts")
        
        embeddings = model.encode(texts, convert_to_tensor=False)
        embeddings_list = embeddings.tolist()
        
        logger.info(f"Generated embeddings with shape: {embeddings.shape}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'embeddings': embeddings_list,
                'model_name': model_name
            })
        }
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to generate embeddings',
                'detail': str(e)
            })
        }

def health_check(event, context):
    """Health check endpoint"""
    try:
        model = load_model()
        
        # Test the model with a simple embedding
        test_text = ["test"]
        embeddings = model.encode(test_text, convert_to_tensor=False)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'healthy',
                'model': model_name
            })
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            'statusCode': 503,
            'body': json.dumps({
                'status': 'unhealthy',
                'error': str(e)
            })
        } 