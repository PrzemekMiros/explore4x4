const fs = require('fs');
const path = require('path');

module.exports = () => ({
  galleryImages: fs.readdirSync(path.join(__dirname, '../content/gallery'), { withFileTypes: true })
    .filter(file => file.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }))
    .map(file => ({
      source: path.join(__dirname, '../content/gallery', file.name),
      url: '/content/gallery/' + encodeURIComponent(file.name)
    }))
});
