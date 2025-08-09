#!/bin/bash

# AWS Lambda Deployment Script for Embedding Service

set -e

# Configuration
FUNCTION_NAME="embedding-service"
REGION="us-east-1"
RUNTIME="python3.9"
HANDLER="lambda-function.lambda_handler"
MEMORY_SIZE="1024"
TIMEOUT="300"

echo "🚀 Starting AWS Lambda deployment..."

# 1. Create deployment package
echo "📦 Creating deployment package..."
pip install -r lambda-requirements.txt -t ./lambda-package
cp lambda-function.py ./lambda-package/
cd lambda-package
zip -r ../lambda-deployment-package.zip .
cd ..

# 2. Create or update Lambda function
echo "🔧 Creating/updating Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime $RUNTIME \
  --handler $HANDLER \
  --memory-size $MEMORY_SIZE \
  --timeout $TIMEOUT \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --zip-file fileb://lambda-deployment-package.zip \
  --environment Variables="{EMBEDDING_MODEL=all-MiniLM-L6-v2}" \
  --region $REGION || \
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://lambda-deployment-package.zip \
  --region $REGION

# 3. Update function configuration
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --memory-size $MEMORY_SIZE \
  --timeout $TIMEOUT \
  --environment Variables="{EMBEDDING_MODEL=all-MiniLM-L6-v2}" \
  --region $REGION

# 4. Create API Gateway (optional)
echo "🌐 Creating API Gateway..."
aws apigateway create-rest-api \
  --name embedding-service-api \
  --region $REGION || echo "API Gateway already exists"

echo "✅ Lambda function deployed successfully!"
echo "🔗 Function ARN: $(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)"

# Cleanup
rm -rf lambda-package lambda-deployment-package.zip 