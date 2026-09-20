param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$publicDirectory = Join-Path $projectRoot 'public'
$master = [System.Drawing.Bitmap]::new(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($master)

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $canvas = [System.Drawing.Rectangle]::new(0, 0, 1024, 1024)
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $canvas,
    [System.Drawing.ColorTranslator]::FromHtml('#1A754C'),
    [System.Drawing.ColorTranslator]::FromHtml('#0F4D31'),
    48
  )
  $graphics.FillRectangle($background, $canvas)
  $background.Dispose()

  $glow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(15, 255, 255, 255))
  $graphics.FillEllipse($glow, 690, -4, 340, 340)
  $glow.Dispose()

  $graphics.TranslateTransform(12, -20)
  $graphics.RotateTransform(-5)
  $cardPath = New-RoundedRectanglePath -X 206 -Y 256 -Width 572 -Height 264 -Radius 58
  $gold = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F2B84B'))
  $graphics.FillPath($gold, $cardPath)
  $cardPath.Dispose()
  $graphics.ResetTransform()

  $walletPath = New-RoundedRectanglePath -X 150 -Y 330 -Width 724 -Height 430 -Radius 88
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.FillPath($white, $walletPath)
  $walletPath.Dispose()
  $white.Dispose()

  $pocketPath = New-RoundedRectanglePath -X 584 -Y 454 -Width 304 -Height 176 -Radius 56
  $green = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#176B45'))
  $graphics.FillPath($green, $pocketPath)
  $pocketPath.Dispose()
  $green.Dispose()

  $graphics.FillEllipse($gold, 645, 513, 58, 58)
  $gold.Dispose()

  foreach ($size in 1024, 512, 192, 180) {
    $outputPath = Join-Path $publicDirectory "icon-$size.png"
    if ($size -eq 1024) {
      $master.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      continue
    }

    $resized = [System.Drawing.Bitmap]::new($size, $size)
    $resizeGraphics = [System.Drawing.Graphics]::FromImage($resized)
    try {
      $resizeGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $resizeGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $resizeGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $resizeGraphics.DrawImage($master, 0, 0, $size, $size)
      $resized.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $resizeGraphics.Dispose()
      $resized.Dispose()
    }
  }
} finally {
  $graphics.Dispose()
  $master.Dispose()
}
