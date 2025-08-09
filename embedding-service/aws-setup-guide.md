# AWS Deployment Guide for Embedding Service

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
3. **Docker Image**: Your image should be pushed to Docker Hub (already done)

## Step 1: AWS CLI Setup

```bash
# Install AWS CLI (if not already installed)
# Download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your output format (json)
```

## Step 2: Create Required AWS Resources

### Create VPC and Subnets
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications ResourceType=vpc,Tags=[{Key=Name,Value=embedding-service-vpc}]

# Create subnets (replace vpc-id with your VPC ID)
aws ec2 create-subnet --vpc-id vpc-12345678 --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-12345678 --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

### Create Security Group
```bash
# Create security group
aws ec2 create-security-group --group-name embedding-service-sg --description "Security group for embedding service" --vpc-id vpc-12345678

# Add inbound rule for port 8000
aws ec2 authorize-security-group-ingress --group-id sg-12345678 --protocol tcp --port 8000 --cidr 0.0.0.0/0
```

### Create IAM Roles
```bash
# Create ECS task execution role
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach required policies
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

## Step 3: Update Configuration Files

1. **Update `aws-ecs-task-definition.json`**:
   - Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID
   - Update the region if needed

2. **Update `aws-deploy.sh`**:
   - Replace subnet and security group IDs with your actual values
   - Update region if needed

## Step 4: Deploy to AWS

```bash
# Make the deployment script executable
chmod +x aws-deploy.sh

# Run the deployment
./aws-deploy.sh
```

## Step 5: Set Up Application Load Balancer (Optional)

For better traffic management and SSL termination:

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name embedding-service-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678

# Create target group
aws elbv2 create-target-group \
  --name embedding-service-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-path /health
```

## Step 6: Update Your Application

Once deployed, update your application to use the new AWS endpoint:

```typescript
// Update your embedding service URL
const EMBEDDING_SERVICE_URL = "http://100.29.9.155:8000";
```

## Monitoring and Logs

```bash
# Check service status
aws ecs describe-services --cluster embedding-service-cluster --services embedding-service

# View logs
aws logs describe-log-groups --log-group-name-prefix /ecs/embedding-service
aws logs tail /ecs/embedding-service/ecs/embedding-service --follow
```

## Cost Estimation

- **ECS Fargate**: ~$0.04048 per vCPU per hour + $0.004445 per GB per hour
- **For 0.5 vCPU + 1GB memory**: ~$0.022 per hour (~$16/month)
- **Data transfer**: Additional costs for outbound traffic

## Troubleshooting

### Common Issues:

1. **Task fails to start**: Check IAM roles and permissions
2. **Health check fails**: Verify the model loads correctly
3. **Network connectivity**: Ensure security groups allow traffic
4. **Memory issues**: Increase memory allocation in task definition

### Useful Commands:

```bash
# Check task status
aws ecs describe-tasks --cluster embedding-service-cluster --tasks $(aws ecs list-tasks --cluster embedding-service-cluster --query 'taskArns' --output text)

# View recent events
aws ecs describe-services --cluster embedding-service-cluster --services embedding-service --query 'services[0].events'
``` 