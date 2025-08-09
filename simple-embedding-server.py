#!/usr/bin/env python3
"""
Simple Embedding Server - Local Fallback
This provides basic embedding functionality when the remote service is down.
"""

import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleEmbeddingHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests (health check)"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "status": "healthy",
                "model": "simple-fallback",
                "message": "Simple embedding service is running"
            }
            
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def do_POST(self):
        """Handle POST requests (embedding generation)"""
        if self.path == '/embed':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                
                texts = request_data.get('texts', [])
                if not texts:
                    self.send_error(400, "No texts provided")
                    return
                
                # Generate simple embeddings (random vectors for now)
                # In a real implementation, you'd use a proper embedding model
                embeddings = []
                for text in texts:
                    # Create a simple embedding based on text length and content
                    # This is just a placeholder - in production you'd use a real model
                    embedding = self.generate_simple_embedding(text)
                    embeddings.append(embedding)
                
                response = {
                    "embeddings": embeddings,
                    "model_name": "simple-fallback"
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                logger.error(f"Error processing embedding request: {e}")
                self.send_error(500, f"Internal server error: {str(e)}")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def generate_simple_embedding(self, text):
        """Generate a simple embedding vector for the given text"""
        # This is a very simple embedding generation
        # In production, you'd use a proper embedding model like SentenceTransformers
        
        # Create a 384-dimensional vector (same as all-MiniLM-L6-v2)
        embedding_dim = 384
        
        # Use text characteristics to generate a deterministic embedding
        text_lower = text.lower()
        
        # Create a simple hash-based embedding
        import hashlib
        hash_obj = hashlib.md5(text_lower.encode())
        hash_bytes = hash_obj.digest()
        
        # Convert hash to embedding vector
        embedding = []
        for i in range(embedding_dim):
            # Use hash bytes cyclically to fill the embedding
            byte_val = hash_bytes[i % len(hash_bytes)]
            # Normalize to [-1, 1] range
            normalized_val = (byte_val / 255.0) * 2 - 1
            embedding.append(normalized_val)
        
        return embedding
    
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"{self.address_string()} - {format % args}")

def run_server(port=8001):
    """Run the simple embedding server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleEmbeddingHandler)
    logger.info(f"Simple embedding server starting on port {port}")
    logger.info(f"Health check: http://localhost:{port}/health")
    logger.info(f"Embed endpoint: http://localhost:{port}/embed")
    httpd.serve_forever()

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    run_server(port) 