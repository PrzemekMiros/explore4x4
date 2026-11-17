const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');
const TurndownService = require('turndown');

const origin = 'https://explore4x4.pl';

module.exports = function (eleventyConfig) {
  const pages = new Map();
  eleventyConfig.on('beforeBuild', () => pages.clear());
  eleventyConfig.addPassthroughCopy({ 'server/agent-content.php': 'agent-content.php' });
  eleventyConfig.addWatchTarget('server/.htaccess');
  eleventyConfig.addWatchTarget('server/skills');
  eleventyConfig.addWatchTarget('scripts/agent-metadata.js');

  eleventyConfig.addTransform('agent-markdown', function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith('.html')) return content;
    const root = parse(content);
    const main = root.querySelector('main');
    const robots = root.querySelector('meta[name="robots"]');
    if (!main || /noindex/i.test(robots?.getAttribute('content') || '')) return content;
    const title = root.querySelector('title')?.textContent.trim() || 'Explore 4x4';
    const relative = path.relative('public', outputPath).split(path.sep).join('/');
    const url = '/' + relative.replace(/index\.html$/, '');
    main.querySelectorAll('script, style, form, button, noscript, svg').forEach(node => node.remove());
    main.querySelectorAll('a[href], img[src]').forEach(node => {
      const attr = node.tagName === 'A' ? 'href' : 'src';
      const value = node.getAttribute(attr);
      if (/^(javascript|data):/i.test(value)) node.remove();
      else node.setAttribute(attr, new URL(value, origin + url).href);
    });
    const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
    const markdown = `# ${title}\n\nŹródło: ${origin}${url}\n\n${converter.turndown(main.innerHTML)}\n`;
    pages.set(url, { title, html: relative, markdown: relative.replace(/\.html$/, '.md'), content: markdown });
    return content;
  });

  eleventyConfig.on('afterBuild', () => {
    const routes = {};
    const links = [];
    const resources = [];
    for (const [url, page] of [...pages].sort(([a], [b]) => a.localeCompare(b))) {
      fs.writeFileSync(path.join('public', page.markdown), page.content);
      const entry = { html: page.html, markdown: page.markdown };
      routes[url] = entry;
      routes['/' + page.html] = entry;
      if (url !== '/' && url.endsWith('/')) routes[url.slice(0, -1)] = entry;
      links.push(`- [${page.title.replace(/[\[\]]/g, '')}](${origin}/${page.markdown})`);
      resources.push({ url: origin + url, markdown: origin + '/' + page.markdown });
    }
    fs.writeFileSync('public/agent-routes.json', JSON.stringify(routes, null, 2));
    const routePattern = Object.keys(routes).map(url => url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const htaccess = fs.readFileSync('server/.htaccess', 'utf8').replace('# GENERATED_PAGE_ROUTES', `RewriteCond %{REQUEST_URI} ^(?:${routePattern})$`);
    fs.writeFileSync('public/.htaccess', htaccess);
    fs.writeFileSync('public/llms.txt', `# Explore 4x4\n\n> Namioty dachowe, zabudowy i akcesoria samochodowe.\n\n## Strony w formacie Markdown\n\n${links.join('\n')}\n\n## Zasoby\n\n- [Mapa witryny](${origin}/sitemap.xml)\n- [Zasady indeksowania](${origin}/robots.txt)\n`);
    fs.mkdirSync('public/.well-known', { recursive: true });
    fs.writeFileSync('public/.well-known/agents-index.json', JSON.stringify({
      name: 'Explore 4x4', url: origin, description: 'Public website resources. No conversational or executable agents are advertised.',
      agents: [], resources, sitemap: origin + '/sitemap.xml', robots: origin + '/robots.txt', llms: origin + '/llms.txt'
    }, null, 2));
    require('./agent-metadata')({ origin, pages });
    const urls = [...pages.keys()].map(url => `  <url><loc>${origin}${url}</loc></url>`).join('\n');
    fs.writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    console.log(`[agents] Generated Markdown for ${pages.size} pages, llms.txt, sitemap and resource index.`);
  });
};
