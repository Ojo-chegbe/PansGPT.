# Simple approach: Update the ECS task definition and force deployment
Write-Host "Updating ECS task definition to use ECR..." -ForegroundColor Green

# Register the new task definition
Write-Host "Registering new task definition..." -ForegroundColor Yellow
$taskDefResult = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecs register-task-definition --cli-input-json file://aws-ecs-task-definition.json --region us-east-1

if ($taskDefResult) {
    $taskDefArn = ($taskDefResult | ConvertFrom-Json).taskDefinition.taskDefinitionArn
    Write-Host "Task definition registered: $taskDefArn" -ForegroundColor Green
    
    # Update the service to use the new task definition
    Write-Host "Updating ECS service..." -ForegroundColor Yellow
    & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecs update-service --cluster embedding-service-cluster --service embedding-service --task-definition $taskDefArn --region us-east-1
    
    # Force new deployment
    Write-Host "Forcing new deployment..." -ForegroundColor Yellow
    & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecs update-service --cluster embedding-service-cluster --service embedding-service --force-new-deployment --region us-east-1
    
    Write-Host "Deployment initiated! The service will now try to use the ECR image." -ForegroundColor Green
    Write-Host "Note: If the ECR image doesn't exist yet, the deployment will fail until we build it." -ForegroundColor Yellow
} else {
    Write-Host "Failed to register task definition" -ForegroundColor Red
} 