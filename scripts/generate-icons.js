// Execute com: node scripts/generate-icons.js
// Requer: npm install sharp

const fs = require('fs');
const path = require('path');

// SVG base do ícone
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0A0A0A"/>
  <path d="M256 80L400 160V352L256 432L112 352V160L256 80Z" fill="#FACC15"/>
  <path d="M256 140L340 190V290L256 340L172 290V190L256 140Z" fill="#0A0A0A"/>
  <circle cx="256" cy="240" r="40" fill="#FACC15"/>
  <path d="M256 260L280 300H232L256 260Z" fill="#FACC15"/>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const publicDir = path.join(__dirname, '../public');
    
    // Criar diretório icons se não existir
    const iconsDir = path.join(publicDir, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Gerar cada tamanho
    for (const size of sizes) {
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
      
      console.log(`✓ Gerado icon-${size}x${size}.png`);
    }

    // Gerar ícones principais para PWA
    await sharp(Buffer.from(svgIcon))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    
    await sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));

    console.log('\n✅ Todos os ícones foram gerados!');
  } catch (error) {
    console.error('Erro ao gerar ícones:', error.message);
    console.log('\nPara gerar os ícones, instale sharp: npm install sharp');
  }
}

generateIcons();