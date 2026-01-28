#!/usr/bin/env pwsh

# Kill all Node processes
Write-Host "Matando todos os processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Find and kill processes using specific ports
Write-Host "Liberando portas 3011, 5173 e 5174..." -ForegroundColor Yellow

$ports = @(3011, 5173, 5174)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pid = $process.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✓ Processos parados!" -ForegroundColor Green
Write-Host "✓ Portas liberadas!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute: npm run dev" -ForegroundColor Cyan
Write-Host ""
