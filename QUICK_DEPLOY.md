# 🚀 Quick EC2 Deployment Summary

Your embedding service has been prepared for EC2 deployment without Docker! Here's what I've created for you:

## 📁 New Files Created

- `ec2-deployment/launch-ec2.ps1` - **One-click Windows deployment script**
- `ec2-deployment/ec2-user-data.sh` - Automatic setup script for EC2
- `ec2-deployment/deploy-to-ec2.sh` - Manual deployment script
- `ec2-deployment/README.md` - Complete documentation

## 🎯 Deploy NOW (3 steps)

### Step 1: Run the Launch Script
```powershell
cd ec2-deployment
.\launch-ec2.ps1
```

### Step 2: Wait 3-5 Minutes
The script will automatically:
- ✅ Create AWS resources (key pair, security group)
- ✅ Launch EC2 instance with Ubuntu 22.04
- ✅ Install Python 3.11 and dependencies
- ✅ Download and start your embedding service
- ✅ Configure systemd service for auto-restart

### Step 3: Update Your App
Replace this line in `src/lib/embedding-service.ts`:
```typescript
production: process.env.NEXT_PUBLIC_EMBEDDING_SERVICE_URL || 'http://100.29.9.155:8000',
```
With your new EC2 IP:
```typescript
production: process.env.NEXT_PUBLIC_EMBEDDING_SERVICE_URL || 'http://3.81.234.132:8000',
```

## 💰 Cost Savings

**Before (Northflank)**: $20-50/month + resource limits
**After (EC2 t3.medium)**: ~$30/month + full control

**Recommended**: Start with `t3.small` (~$15/month) and upgrade if needed.

## 🛠️ Prerequisites

1. **AWS CLI installed**: Download from https://aws.amazon.com/cli/
2. **AWS credentials configured**: Run `aws configure`
3. **PowerShell** (already on Windows)

## 🧪 Test Your Service

Once deployed, test with:
```bash
curl http://3.81.234.132:8000/health
curl -X POST http://3.81.234.132:8000/embed -H "Content-Type: application/json" -d '{"texts": ["test"]}'
```

## 🎉 Benefits

1. **No Docker overhead** - Direct Python execution
2. **Full resource control** - No free-tier limits
3. **Persistent service** - Survives reboots
4. **Cost effective** - ~70% cheaper than managed services
5. **Simple management** - Standard systemd service

Ready to deploy? Run `.\launch-ec2.ps1` in the `ec2-deployment` folder! 