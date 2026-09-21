const Image = require('@11ty/eleventy-img');

module.exports = async function(source, alt) {
  const metadata = await Image(source, {
    widths: [320, 640, 960],
    formats: ['webp', 'jpeg'],
    urlPath: '/assets/img/gallery/',
    outputDir: './public/assets/img/gallery/'
  });

  return Image.generateHTML(metadata, {
    alt,
    sizes: '(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw',
    loading: 'lazy',
    decoding: 'async'
  });
};
