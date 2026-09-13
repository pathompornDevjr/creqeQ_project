const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Drawing
$srcPath = "d:\\p-ldcode\\frontend-qrshop\\public\\Logo.png"
$dstPath = "d:\\p-ldcode\\frontend-qrshop\\public\\LogoSquare.png"
$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

# Crop / Fit to 512x512 square centered
$scale = [Math]::Max(512 / $src.Width, 512 / $src.Height)
$w = [int]($src.Width * $scale)
$h = [int]($src.Height * $scale)
$x = [int]((512 - $w) / 2)
$y = [int]((512 - $h) / 2)

$g.DrawImage($src, $x, $y, $w, $h)
$bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()
Write-Host "SUCCESS"
`;

fs.writeFileSync(path.join(__dirname, 'make-square.ps1'), psScript);
console.log('Script written');
