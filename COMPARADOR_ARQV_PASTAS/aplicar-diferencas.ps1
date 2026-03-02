### PARA RODAR=  1> Set-ExecutionPolicy -Scope Process Bypass
###              2> .\aplicar-diferencas.ps1
###
### Lê diferencas_projetos.csv (gerado por comparar-projetos.ps1), filtra por
### ignoredDirectories, exibe em 2 colunas (BACK / FRONT) e, se o usuário
### confirmar, copia os arquivos Alterados ou Somente na origem da Origem para o Destino.

# Força saída UTF-8 no terminal
try {
    chcp 65001 | Out-Null
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {}

# ========= CONFIGURAÇÃO =========

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csvPath = Join-Path $scriptDir "diferencas_projetos.csv"

# Destinos (raiz de cada projeto) para montar caminho em "Somente na origem"
$destinoBack  = "C:\GITHUB\esteira-contabil-back"
$destinoFront = "C:\GITHUB\esteira-contabil-front"

# Mesma lista do comparar-projetos.ps1 (pastas ignoradas)
$ignoredDirectories = @(
    "node_modules",
    ".next",
    ".nuxt",
    "dist",
    "build",
    ".git",
    ".turbo",
    "coverage",
    ".coverage",
    "out",
    "bin",
    "obj",
    "venv",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".idea",
    ".vscode",
    ".cache",
    "tmp",
    "temp"
)

# ========= FUNÇÕES =========

function Test-ShouldIgnorePath {
    param([string]$RelativePath)
    $parts = $RelativePath -split '[\\/]'
    foreach ($part in $parts) {
        if ($ignoredDirectories -contains $part) { return $true }
    }
    return $false
}

function Get-DestinoPath {
    param(
        [string]$Projeto,
        [string]$RelativePath,
        [string]$DestinoPathFromCsv
    )
    if ([string]::IsNullOrWhiteSpace($DestinoPathFromCsv)) {
        $root = if ($Projeto -eq "BACK") { $destinoBack } else { $destinoFront }
        return Join-Path $root $RelativePath
    }
    return $DestinoPathFromCsv.Trim()
}

# ========= CARREGAR E FILTRAR CSV =========

if (-not (Test-Path -LiteralPath $csvPath)) {
    Write-Host "Arquivo não encontrado: $csvPath" -ForegroundColor Red
    Write-Host "Execute primeiro: .\comparar-projetos.ps1" -ForegroundColor Yellow
    exit 1
}

# Ler CSV com -LiteralPath para suportar colchetes no caminho
$data = Import-Csv -LiteralPath $csvPath -Encoding UTF8

# Apenas Alterado e Somente na origem; ignorar caminhos que contêm pastas ignoradas
$paraAplicar = $data | Where-Object {
    ($_.Status -eq "Alterado" -or $_.Status -eq "Somente na origem") -and
    -not (Test-ShouldIgnorePath -RelativePath $_.RelativePath)
}

$backRows  = @($paraAplicar | Where-Object { $_.Projeto -eq "BACK" })
$frontRows = @($paraAplicar | Where-Object { $_.Projeto -eq "FRONT" })

# ========= EXIBIR EM 2 COLUNAS =========

Write-Host ""
Write-Host "===== DIFERENÇAS A APLICAR (excl. pastas ignoradas) =====" -ForegroundColor Cyan
Write-Host "BACK: $($backRows.Count)  |  FRONT: $($frontRows.Count)" -ForegroundColor Gray
Write-Host ""

$maxRows = [Math]::Max($backRows.Count, $frontRows.Count)
if ($maxRows -eq 0) {
    Write-Host "Nenhum arquivo para aplicar." -ForegroundColor Green
    exit 0
}

$tabela = for ($i = 0; $i -lt $maxRows; $i++) {
    $b = if ($i -lt $backRows.Count)  { "$($backRows[$i].Status): $($backRows[$i].RelativePath)" } else { "" }
    $f = if ($i -lt $frontRows.Count) { "$($frontRows[$i].Status): $($frontRows[$i].RelativePath)" } else { "" }
    [PSCustomObject]@{ BACK = $b; FRONT = $f }
}

$tabela | Format-Table -Property BACK, FRONT -AutoSize -Wrap

# ========= CONFIRMAÇÃO E CÓPIA =========

Write-Host ""
$resposta = Read-Host "Copiar esses arquivos da Origem para o Destino (substituindo)? [s/N]"
if ($resposta -notmatch '^[sS]') {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

$ok = 0
$erros = 0

foreach ($row in $paraAplicar) {
    $origem = $row.OrigemPath.Trim()
    $destino = Get-DestinoPath -Projeto $row.Projeto -RelativePath $row.RelativePath -DestinoPathFromCsv $row.DestinoPath

    if ([string]::IsNullOrWhiteSpace($origem)) {
        Write-Host "  [PULAR] Sem OrigemPath: $($row.RelativePath)" -ForegroundColor Yellow
        continue
    }

    if (-not (Test-Path -LiteralPath $origem -PathType Leaf)) {
        Write-Host "  [ERRO] Origem não encontrada: $($row.RelativePath)" -ForegroundColor Red
        $erros++
        continue
    }

    $dirDestino = Split-Path -Parent $destino
    if (-not (Test-Path -LiteralPath $dirDestino)) {
        New-Item -ItemType Directory -Path $dirDestino -Force | Out-Null
    }

    try {
        Copy-Item -LiteralPath $origem -Destination $destino -Force
        Write-Host "  [OK] $($row.Projeto) -> $($row.RelativePath)" -ForegroundColor Green
        $ok++
    } catch {
        Write-Host "  [ERRO] $($row.RelativePath): $_" -ForegroundColor Red
        $erros++
    }
}

Write-Host ""
Write-Host "Concluído: $ok copiados, $erros erros." -ForegroundColor $(if ($erros -gt 0) { "Yellow" } else { "Green" })
