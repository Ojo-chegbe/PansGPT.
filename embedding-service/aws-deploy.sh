#!/bin/bash

# AWS ECS Deployment Script for Embedding Service
# Make sure you have AWS CLI configured with appropriate credentials

set -e

# Configuration
CLUSTER_NAME="embedding-service-cluster"
SERVICE_NAME="embedding-service"
TASK_DEFINITION_FILE="aws-ecs-task-definition.json"
REGION="us-east-1"

echo "🚀 Starting AWS ECS deployment..."

# 1. Create ECS cluster if it doesn't exist
echo "📦 Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION || echo "Cluster already exists"

# 2. Register task definition
echo "📋 Registering task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://$TASK_DEFINITION_FILE \
  --region $REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: $TASK_DEFINITION_ARN"

# 3. Create or update service
echo "🔧 Creating/updating ECS service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_DEFINITION_ARN \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
  --region $REGION || \
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEFINITION_ARN \
  --region $REGION

echo "✅ Service deployed successfully!"
echo "🌐 You can check the service status with:"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION" 