### PARA RODAR=  1> Set-ExecutionPolicy -Scope Process Bypass
###              2> .\comparar-projetos.ps1

# Força saída UTF-8 no terminal
try {
    chcp 65001 | Out-Null
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {}

# ========= CONFIGURAÇÃO =========

$projetos = @(
    @{
        Nome    = "BACK"
        Origem  = "C:\GITHUB\ESTEIRA-Prod2602[FixImport]\esteira-contabil-back-main"
        Destino = "C:\GITHUB\esteira-contabil-back"
    },
    @{
        Nome    = "FRONT"
        Origem  = "C:\GITHUB\ESTEIRA-Prod2602[FixImport]\esteira-contabil-front-main"
        Destino = "C:\GITHUB\esteira-contabil-front"
    }
)

# Pastas para ignorar
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
    ".env"
    ".env.example"
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".idea",
    ".vscode",
    ".cache",
    "tmp",
    "temp"
)

# Arquivos para ignorar por nome
$ignoredFileNames = @(
    ".DS_Store",
    "Thumbs.db"
)

# Extensões para ignorar
$ignoredExtensions = @(
    ".log",
    ".tmp",
    ".pyc"
)

# Comparar por conteúdo ignorando fim de linha (CRLF vs LF) em arquivos de texto
# Reduz falsos positivos quando a única diferença é line ending
$compareNormalizeLineEndings = $true
$textExtensions = @(".ts", ".tsx", ".js", ".jsx", ".json", ".prisma", ".sql", ".yml", ".yaml", ".md", ".css", ".html", ".xml", ".csv", ".txt", ".mjs", ".cjs", ".config.js", ".config.mjs", ".config.cjs",".prisma")

# ========= FUNÇÕES =========

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $base = [System.IO.Path]::GetFullPath($BasePath)
    $full = [System.IO.Path]::GetFullPath($FullPath)

    if (-not $base.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $base += [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = [Uri]$base
    $fullUri = [Uri]$full
    $relativeUri = $baseUri.MakeRelativeUri($fullUri)

    return [Uri]::UnescapeDataString($relativeUri.ToString().Replace('/', '\'))
}

function Should-IgnoreFile {
    param(
        [string]$RelativePath,
        [string]$FileName,
        [string]$Extension
    )

    $parts = $RelativePath -split '[\\/]'

    foreach ($part in $parts) {
        if ($ignoredDirectories -contains $part) {
            return $true
        }
    }

    if ($ignoredFileNames -contains $FileName) {
        return $true
    }

    if ($ignoredExtensions -contains $Extension.ToLower()) {
        return $true
    }

    return $false
}

function Get-FileHashForCompare {
    param(
        [string]$LiteralPath,
        [string]$Extension
    )
    $ext = $Extension.ToLower()
    $isText = $compareNormalizeLineEndings -and ($textExtensions -contains $ext)
    if ($isText) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($LiteralPath)
            $content = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($content.Length -gt 0) {
                $normalized = ($content -replace "`r`n", "`n") -replace "`r", "`n"
                $bytesNorm = [System.Text.Encoding]::UTF8.GetBytes($normalized)
                $sha = [System.Security.Cryptography.SHA256]::Create()
                $hashBytes = $sha.ComputeHash($bytesNorm)
                return [BitConverter]::ToString($hashBytes) -replace "-", ""
            }
        } catch {
            # Fallback: hash binário se falhar leitura como texto
        }
    }
    return (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash
}

function Get-FileMap {
    param(
        [string]$Root
    )

    $map = @{}

    Get-ChildItem -LiteralPath $Root -Recurse -File -Force | ForEach-Object {
        $relative = Get-RelativePath -BasePath $Root -FullPath $_.FullName

        if (Should-IgnoreFile -RelativePath $relative -FileName $_.Name -Extension $_.Extension) {
            return
        }

        $key = $relative.ToLower()

        $map[$key] = [PSCustomObject]@{
            RelativePath  = $relative
            FullPath      = $_.FullName
            Length        = $_.Length
            LastWriteTime = $_.LastWriteTime
        }
    }

    return $map
}

function Compare-Directories {
    param(
        [string]$Nome,
        [string]$Origem,
        [string]$Destino
    )

    Write-Host ""
    Write-Host "===== COMPARANDO: $Nome =====" -ForegroundColor Cyan
    Write-Host "Origem : $Origem"
    Write-Host "Destino: $Destino"
    Write-Host ""

    if (!(Test-Path -LiteralPath $Origem)) {
        Write-Host "Origem não encontrada: $Origem" -ForegroundColor Red
        return @(
            [PSCustomObject]@{
                Projeto         = $Nome
                Status          = "Erro: origem não encontrada"
                RelativePath    = $null
                OrigemPath      = $Origem
                DestinoPath     = $Destino
                OrigemData      = $null
                DestinoData     = $null
                OrigemSize      = $null
                DestinoSize     = $null
                HashOrigem      = $null
                HashDestino     = $null
            }
        )
    }

    if (!(Test-Path -LiteralPath $Destino)) {
        Write-Host "Destino não encontrado: $Destino" -ForegroundColor Red
        return @(
            [PSCustomObject]@{
                Projeto         = $Nome
                Status          = "Erro: destino não encontrado"
                RelativePath    = $null
                OrigemPath      = $Origem
                DestinoPath     = $Destino
                OrigemData      = $null
                DestinoData     = $null
                OrigemSize      = $null
                DestinoSize     = $null
                HashOrigem      = $null
                HashDestino     = $null
            }
        )
    }

    $origemMap = Get-FileMap -Root $Origem
    $destinoMap = Get-FileMap -Root $Destino

    $allKeys = ($origemMap.Keys + $destinoMap.Keys | Sort-Object -Unique)

    $resultado = foreach ($key in $allKeys) {
        $o = $origemMap[$key]
        $d = $destinoMap[$key]

        if ($o -and -not $d) {
            [PSCustomObject]@{
                Projeto         = $Nome
                Status          = "Somente na origem"
                RelativePath    = $o.RelativePath
                OrigemPath      = $o.FullPath
                DestinoPath     = $null
                OrigemData      = $o.LastWriteTime
                DestinoData     = $null
                OrigemSize      = $o.Length
                DestinoSize     = $null
                HashOrigem      = $null
                HashDestino     = $null
            }
            continue
        }

        if (-not $o -and $d) {
            [PSCustomObject]@{
                Projeto         = $Nome
                Status          = "Somente no destino"
                RelativePath    = $d.RelativePath
                OrigemPath      = $null
                DestinoPath     = $d.FullPath
                OrigemData      = $null
                DestinoData     = $d.LastWriteTime
                OrigemSize      = $null
                DestinoSize     = $d.Length
                HashOrigem      = $null
                HashDestino     = $null
            }
            continue
        }

        $precisaHash = $false

        if ($o.Length -ne $d.Length) {
            $precisaHash = $true
        }
        elseif ($o.LastWriteTime -ne $d.LastWriteTime) {
            $precisaHash = $true
        }

        if ($precisaHash) {
            $ext = [System.IO.Path]::GetExtension($o.RelativePath)
            $hashO = Get-FileHashForCompare -LiteralPath $o.FullPath -Extension $ext
            $hashD = Get-FileHashForCompare -LiteralPath $d.FullPath -Extension $ext

            if ($hashO -ne $hashD) {
                [PSCustomObject]@{
                    Projeto         = $Nome
                    Status          = "Alterado"
                    RelativePath    = $o.RelativePath
                    OrigemPath      = $o.FullPath
                    DestinoPath     = $d.FullPath
                    OrigemData      = $o.LastWriteTime
                    DestinoData     = $d.LastWriteTime
                    OrigemSize      = $o.Length
                    DestinoSize     = $d.Length
                    HashOrigem      = $hashO
                    HashDestino     = $hashD
                }
            }
        }
    }

    return $resultado
}

# ========= EXECUÇÃO =========

$todos = @()

foreach ($p in $projetos) {
    $todos += Compare-Directories -Nome $p.Nome -Origem $p.Origem -Destino $p.Destino
}

if ($todos.Count -eq 0) {
    Write-Host ""
    Write-Host "Nenhuma diferença encontrada." -ForegroundColor Green
    return
}

$todos = $todos | Sort-Object Projeto, Status, RelativePath

Write-Host ""
Write-Host "===== RESUMO =====" -ForegroundColor Yellow

$todos | Group-Object Projeto, Status | ForEach-Object {
    $projeto = $_.Group[0].Projeto
    $status  = $_.Group[0].Status
    $count   = $_.Count
    Write-Host ("{0} -> {1}: {2}" -f $projeto, $status, $count)
}

Write-Host ""
$todos | Format-Table Projeto, Status, RelativePath, OrigemData, DestinoData -AutoSize

# Caminho do CSV: usar caminho absoluto e gravar com .NET para evitar que
# colchetes no diretório (ex: ESTEIRA-Prod2602[FixImport]) sejam interpretados como curinga pelo Export-Csv
$csvPath = Join-Path (Get-Location).Path "diferencas_projetos.csv"
$csvLines = $todos | ConvertTo-Csv -NoTypeInformation
$csvContent = $csvLines -join [Environment]::NewLine
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($csvPath, $csvContent, $utf8NoBom)

Write-Host ""
Write-Host "Relatório salvo em: $csvPath" -ForegroundColor Green