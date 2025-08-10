# 🚀 EC2 Deployment for Embedding Service

This deployment moves your embedding service from Northflank to Amazon EC2 without Docker, making it more cost-effective and resource-efficient.

## 🎯 Quick Start (Automated)

### Option 1: One-Click Launch (Windows)
```powershell
# Run from this directory
.\launch-ec2.ps1
```

This will:
- ✅ Create AWS resources (key pair, security group)
- ✅ Launch EC2 instance with automatic setup
- ✅ Install and start the embedding service
- ✅ Configure firewall and systemd service
- ✅ Provide you with the new service URL

### Option 2: Manual Launch (Any OS)

1. **Launch EC2 instance:**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: `t3.medium` (recommended) or `t3.small` (minimal)
   - Security Group: Allow ports 22 (SSH) and 8000 (HTTP)
   - User Data: Copy contents of `ec2-user-data.sh`

2. **Wait 3-5 minutes** for automatic setup to complete

3. **Test the service:**
   ```bash
   curl http://YOUR_EC2_PUBLIC_IP:8000/health
   ```

## 🔧 Manual Setup (if needed)

If you prefer to set up manually:

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i embedding-key-new.pem ubuntu@3.81.234.132
   ```

2. **Run the deployment script:**
   ```bash
   wget https://raw.githubusercontent.com/YOUR_REPO/main/ec2-deployment/deploy-to-ec2.sh
   chmod +x deploy-to-ec2.sh
   ./deploy-to-ec2.sh
   ```

## 💰 Cost Optimization

### Instance Types & Costs (us-east-1):
- **t3.nano**: $0.0052/hour (~$3.74/month) - Too small for transformers
- **t3.micro**: $0.0104/hour (~$7.49/month) - Minimal but might work
- **t3.small**: $0.0208/hour (~$14.98/month) - Recommended minimum
- **t3.medium**: $0.0416/hour (~$29.97/month) - Good performance
- **t3.large**: $0.0832/hour (~$59.94/month) - High performance

### Memory Requirements:
- **all-MiniLM-L6-v2**: ~500MB model + ~1GB Python/dependencies
- **Minimum**: 2GB RAM (t3.small)
- **Recommended**: 4GB RAM (t3.medium)

## 🔄 Updating Your Application

Update your embedding service URL in your application:

```typescript
// In src/lib/embedding-service.ts
export const EMBEDDING_SERVICE_CONFIG = {
  production: 'http://3.81.234.132:8000',  // Updated to actual EC2 IP
  getUrl: () => EMBEDDING_SERVICE_CONFIG.production
};
```

## 📊 Monitoring & Management

### Service Commands:
```bash
# Check status
sudo systemctl status embedding-service

# View logs
sudo journalctl -u embedding-service -f

# Restart service
sudo systemctl restart embedding-service

# Stop service
sudo systemctl stop embedding-service
```

### Health Monitoring:
```bash
# Health check
curl http://3.81.234.132:8000/health

# Test embedding generation
curl -X POST http://3.81.234.132:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello world", "Test embedding"]}'
```

## 🛡️ Security Best Practices

1. **Restrict Security Group:**
   - Only allow port 8000 from your application's IP range
   - Restrict SSH (port 22) to your IP only

2. **Use Application Load Balancer:**
   - For production, consider putting ALB in front
   - Enables HTTPS and better availability

3. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade
   sudo systemctl restart embedding-service
   ```

## 🚨 Troubleshooting

### Service Won't Start:
```bash
# Check logs
sudo journalctl -u embedding-service -f

# Common issues:
# 1. Model download failed (network/disk space)
# 2. Python dependencies missing
# 3. Permissions issue
```

### High Memory Usage:
```bash
# Check memory
free -h
htop

# Solutions:
# 1. Upgrade to larger instance type
# 2. Optimize model loading
# 3. Add swap space (temporary fix)
```

### Connection Issues:
```bash
# Check if service is listening
sudo netstat -tlnp | grep 8000

# Check security group allows port 8000
# Check if public IP is correct
```

## 🎉 Benefits Over Northflank

1. **Cost**: ~70% cheaper than managed services
2. **Resources**: Full control over CPU/memory allocation
3. **No Docker**: Direct Python execution = faster startup
4. **Flexibility**: Can install additional tools/models
5. **Persistence**: Data survives across deployments

## 📝 Files Included

- `launch-ec2.ps1` - One-click Windows deployment
- `ec2-user-data.sh` - Automatic setup script for EC2
- `deploy-to-ec2.sh` - Manual deployment script
- `README.md` - This documentation

Your embedding service will be running at `http://3.81.234.132:8000` within 3-5 minutes of launch! 