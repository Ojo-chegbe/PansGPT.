# Test the deployed embedding service
Write-Host "Testing deployed embedding service..." -ForegroundColor Green

$publicIp = "18.234.180.179"
$healthUrl = "http://$publicIp:8000/health"
$embedUrl = "http://$publicIp:8000/embed"

Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  Health Check: $healthUrl" -ForegroundColor White
Write-Host "  Embed Service: $embedUrl" -ForegroundColor White
Write-Host "  API Docs: http://$publicIp:8000/docs" -ForegroundColor White
Write-Host ""

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 30
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Service is healthy and running!" -ForegroundColor Green
        Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ Service responded but with status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Service is not responding yet" -ForegroundColor Red
    Write-Host "This is normal - the model is still loading. Please wait a few more minutes." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing embed endpoint..." -ForegroundColor Yellow

# Test embed endpoint
$testPayload = @{
    texts = @("Hello world", "This is a test")
} | ConvertTo-Json

try {
    $embedResponse = Invoke-WebRequest -Uri $embedUrl -Method POST -Body $testPayload -ContentType "application/json" -TimeoutSec 30
    if ($embedResponse.StatusCode -eq 200) {
        Write-Host "✅ Embed service is working!" -ForegroundColor Green
        Write-Host "Response: $($embedResponse.Content)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ Embed service responded but with status: $($embedResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Embed service is not responding yet" -ForegroundColor Red
    Write-Host "The model is still loading. This can take 5-10 minutes for the first startup." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait a few more minutes for the model to load completely" -ForegroundColor White
Write-Host "2. Test the service again by running this script" -ForegroundColor White
Write-Host "3. Once working, you can use the service at: $embedUrl" -ForegroundColor White 