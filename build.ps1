# Gera "Script de Vendas Sapion.html" (arquivo unico, funciona offline e pode ser enviado por e-mail/Drive).
# Uso: clique com o botao direito > "Executar com o PowerShell"  (ou: powershell -ExecutionPolicy Bypass -File build.ps1)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$outFile = Join-Path (Split-Path -Parent $here) 'Script de Vendas Sapion.html'
$utf8 = New-Object System.Text.UTF8Encoding $false

function Read-Text($rel) { [System.IO.File]::ReadAllText((Join-Path $here $rel), [System.Text.Encoding]::UTF8) }
function To-DataUri($rel) {
  $path = Join-Path $here $rel
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  $mime = @{ '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.ttf' = 'font/ttf' }[$ext]
  'data:' + $mime + ';base64,' + [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($path))
}

$html = Read-Text 'index.html'

# 1) CSS com a fonte Sora embutida
$css = Read-Text 'deck.css'
$css = $css.Replace("url('assets/fonts/Sora.ttf')", "url('" + (To-DataUri 'assets/fonts/Sora.ttf') + "')")
$html = $html.Replace('<link rel="stylesheet" href="deck.css">', "<style>`n" + $css + "`n</style>")

# 2) Imagens: cada arquivo entra uma unica vez (mapa JS) e as <img> apontam para ele
$assets = [ordered]@{}
$html = [regex]::Replace($html, 'src="(assets/(?:img|logos)/[^"]+)"', {
  param($m)
  $rel = $m.Groups[1].Value
  if (-not $assets.Contains($rel)) { $assets[$rel] = To-DataUri $rel }
  'data-asset="' + $rel + '"'
})
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append('<script>window.__ASSETS={')
$first = $true
foreach ($k in $assets.Keys) {
  if (-not $first) { [void]$sb.Append(',') }
  [void]$sb.Append('"' + $k + '":"' + $assets[$k] + '"')
  $first = $false
}
[void]$sb.Append('};document.querySelectorAll("[data-asset]").forEach(function(e){e.src=window.__ASSETS[e.getAttribute("data-asset")];});</script>')

# 3) Scripts embutidos (o mapa de imagens roda antes dos demais)
$html = $html.Replace('<script src="assets/icons.js"></script>', $sb.ToString() + "`n<script>`n" + (Read-Text 'assets/icons.js') + "`n</script>")
$html = $html.Replace('<script src="dados.js"></script>', "<script>`n" + (Read-Text 'dados.js') + "`n</script>")
$html = $html.Replace('<script src="deck.js"></script>', "<script>`n" + (Read-Text 'deck.js') + "`n</script>")

[System.IO.File]::WriteAllText($outFile, $html, $utf8)
'Gerado: {0}  ({1:N1} MB, {2} imagens)' -f $outFile, ((Get-Item $outFile).Length / 1MB), $assets.Count
