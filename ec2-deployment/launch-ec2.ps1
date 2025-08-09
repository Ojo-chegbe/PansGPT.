# PowerShell script to launch EC2 instance with embedding service
# Run this from your Windows machine

param(
    [string]$KeyPairName = "embedding-service-key",
    [string]$InstanceType = "t3.medium",
    [string]$SecurityGroupName = "embedding-service-sg"
)

Write-Host "Launching EC2 instance for Embedding Service..." -ForegroundColor Green

# Check if AWS CLI is installed
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "AWS credentials verified" -ForegroundColor Green
} catch {
    Write-Host "AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Create key pair if it doesn't exist
Write-Host "Checking for key pair..." -ForegroundColor Yellow
$keyExists = aws ec2 describe-key-pairs --key-names $KeyPairName 2>$null
if (!$keyExists) {
    Write-Host "Creating new key pair: $KeyPairName" -ForegroundColor Yellow
    aws ec2 create-key-pair --key-name $KeyPairName --query 'KeyMaterial' --output text | Out-File -FilePath "$KeyPairName.pem" -Encoding ASCII
    Write-Host "Key pair created and saved as $KeyPairName.pem" -ForegroundColor Green
} else {
    Write-Host "Key pair $KeyPairName already exists" -ForegroundColor Green
}

# Create security group if it doesn't exist
Write-Host "Setting up security group..." -ForegroundColor Yellow
$sgExists = aws ec2 describe-security-groups --group-names $SecurityGroupName 2>$null
if (!$sgExists) {
    Write-Host "Creating security group: $SecurityGroupName" -ForegroundColor Yellow
    $sgId = (aws ec2 create-security-group --group-name $SecurityGroupName --description "Security group for embedding service" --query 'GroupId' --output text)
    
    # Add inbound rules
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0    # SSH
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8000 --cidr 0.0.0.0/0  # Embedding service
    
    Write-Host "Security group created with ID: $sgId" -ForegroundColor Green
} else {
    Write-Host "Security group $SecurityGroupName already exists" -ForegroundColor Green
}

# Get the latest Ubuntu 22.04 LTS AMI ID
Write-Host "Finding latest Ubuntu 22.04 LTS AMI..." -ForegroundColor Yellow
$amiId = aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" --query 'Images[*].[ImageId,CreationDate]' --output text | Sort-Object {$_[1]} -Descending | Select-Object -First 1 | ForEach-Object {$_.Split()[0]}
Write-Host "Using AMI: $amiId" -ForegroundColor Green

# Read user data script
$userDataPath = Join-Path $PSScriptRoot "ec2-user-data.sh"
if (!(Test-Path $userDataPath)) {
    Write-Host "User data script not found at: $userDataPath" -ForegroundColor Red
    exit 1
}

# Launch EC2 instance
Write-Host "Launching EC2 instance..." -ForegroundColor Yellow
$instanceId = aws ec2 run-instances `
    --image-id $amiId `
    --count 1 `
    --instance-type $InstanceType `
    --key-name $KeyPairName `
    --security-groups $SecurityGroupName `
    --user-data file://$userDataPath `
    --query 'Instances[0].InstanceId' `
    --output text

if ($instanceId) {
    Write-Host "Instance launched with ID: $instanceId" -ForegroundColor Green
    
    # Add name tag
    aws ec2 create-tags --resources $instanceId --tags Key=Name,Value="Embedding Service"
    
    Write-Host "Waiting for instance to be running..." -ForegroundColor Yellow
    aws ec2 wait instance-running --instance-ids $instanceId
    
    # Get public IP
    $publicIp = aws ec2 describe-instances --instance-ids $instanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    Write-Host "Instance is now running!" -ForegroundColor Green
    Write-Host "Instance ID: $instanceId" -ForegroundColor Cyan
    Write-Host "Public IP: $publicIp" -ForegroundColor Cyan
    Write-Host "Embedding Service will be available at: http://$publicIp:8000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The service is setting up automatically. This takes 3-5 minutes." -ForegroundColor Yellow
    Write-Host "Test the service with: curl http://$publicIp:8000/health" -ForegroundColor Yellow
    Write-Host "SSH command: ssh -i $KeyPairName.pem ubuntu@$publicIp" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Don't forget to update your application's embedding service URL to: http://$publicIp:8000" -ForegroundColor Magenta
    
} else {
    Write-Host "Failed to launch instance" -ForegroundColor Red
    exit 1
} 