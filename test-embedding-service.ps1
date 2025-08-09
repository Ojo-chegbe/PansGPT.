#!/usr/bin/env pwsh
# Test script for the embedding service

$serviceUrl = "http://3.81.234.132:8000"

Write-Host "Testing Embedding Service at: $serviceUrl" -ForegroundColor Green
Write-Host ""

# Test health endpoint
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$serviceUrl/health" -Method Get
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Cyan
    Write-Host "   Model: $($healthResponse.model_name)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   The service might still be starting up. Wait 2-3 minutes and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test embedding generation
Write-Host "2. Testing embedding generation..." -ForegroundColor Yellow
try {
    $testData = @{
        texts = @("Hello world", "This is a test")
    }
    $body = $testData | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$serviceUrl/embed" -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "✅ Embedding generation successful!" -ForegroundColor Green
    Write-Host "   Generated embeddings for $($testData.texts.Count) texts" -ForegroundColor Cyan
    Write-Host "   Embedding dimensions: $($response.embeddings[0].Count)" -ForegroundColor Cyan
    Write-Host "   Model used: $($response.model_name)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Embedding generation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All tests passed! Your embedding service is working correctly." -ForegroundColor Green
Write-Host "You can now use it in your application at: $serviceUrl" -ForegroundColor Cyan 