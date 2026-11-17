const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

module.exports = ({ origin, pages }) => {
  const write = (name, data) => {
    const target = path.join('public', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  };
  const pageSchema = {
    type: 'object', required: ['title', 'url', 'markdown_url', 'content'],
    properties: {
      title: { type: 'string' }, url: { type: 'string', format: 'uri' },
      markdown_url: { type: 'string', format: 'uri' },
      content: { type: 'string', description: 'Public page main content in Markdown.' }
    }
  };
  write('api/pages.json', { pages: [...pages].sort(([a], [b]) => a.localeCompare(b)).map(([url, page]) => ({
    title: page.title, url: origin + url, markdown_url: origin + '/' + page.markdown, content: page.content
  })) });
  write('api/openapi.json', {
    openapi: '3.1.0', info: { title: 'Explore 4x4 public content API', version: '1.0.0',
      description: 'Read-only public website content, regenerated on each site build. No accounts, authentication, orders or inventory operations.' },
    servers: [{ url: origin }], security: [],
    paths: { '/api/pages.json': { get: {
      operationId: 'listPublicPages', summary: 'Read public pages and their Markdown content',
      responses: { '200': { description: 'Public content index', content: { 'application/json': { schema: {
        type: 'object', required: ['pages'], properties: { pages: { type: 'array', items: pageSchema } }
      } } } } }
    } } }
  });
  write('.well-known/api-catalog', { linkset: [{
    anchor: origin + '/api/pages.json',
    'service-desc': [{ href: origin + '/api/openapi.json', type: 'application/vnd.oai.openapi+json' }],
    'service-doc': [{ href: origin + '/api/README.md', type: 'text/markdown' }]
  }] });
  write('api/README.md', `# Explore 4x4 public content API\n\nGET ${origin}/api/pages.json returns an object with a pages array. Each page includes title, url, markdown_url and content (Markdown). Data is refreshed when the site is built.\n\nNo authentication, API key or registration is required. This API is read-only and does not provide stock levels, current quotations, bookings or ordering. Contact the company using ${origin}/kontakt/ for those requests.\n\nOpenAPI: ${origin}/api/openapi.json\nContent usage preferences: ${origin}/robots.txt\n`);
  write('auth.md', `# Access to Explore 4x4\n\nThe public content API at ${origin}/api/pages.json and the public website are available without authentication. Do not send credentials or Authorization headers. No agent registration is required or offered.\n\nThis site does not operate an OAuth/OIDC issuer, token endpoint, protected-resource API or WorkOS auth.md registration flow. This document describes anonymous access; it does not declare support for agent registration.\n\nAPI documentation: ${origin}/api/README.md\n`);
  const skill = fs.readFileSync('server/skills/explore4x4-content/SKILL.md', 'utf8');
  const skillDescription = skill.match(/^description: (.+)$/m)[1];
  const skillUrl = origin + '/.well-known/agent-skills/explore4x4-content/SKILL.md';
  write('.well-known/agent-skills/explore4x4-content/SKILL.md', skill);
  write('.well-known/agent-skills/index.json', {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{ name: 'explore4x4-content', description: skillDescription, type: 'skill-md',
      url: skillUrl, digest: 'sha256:' + createHash('sha256').update(skill).digest('hex') }]
  });
  write('.well-known/ard.json', { entries: [{
    identifier: 'urn:air:explore4x4.pl:api:public-content', displayName: 'Explore 4x4 public content API',
    type: 'application/vnd.oai.openapi+json', url: origin + '/api/openapi.json',
    description: 'Read published pages about roof tents, vehicle conversions and accessories. Anonymous read-only access.',
    representativeQueries: ['Jakie namioty dachowe opisuje Explore 4x4?', 'Jak skontaktować się z Explore 4x4?']
  }, {
    identifier: 'urn:air:explore4x4.pl:skill:explore4x4-content', displayName: 'Explore 4x4 content guide',
    type: 'text/markdown', url: skillUrl,
    representativeQueries: ['Jak odczytać publiczne treści Explore 4x4?', 'Gdzie znaleźć źródła informacji o ofercie Explore 4x4?']
  }] });
  // Poppy 0.3 allows public APIs with no issuer or reliance on Session identity.
  write('.well-known/poppy.json', {
    protocol_version: '0.3', organization: { name: 'Explore 4x4', domain: new URL(origin).hostname },
    apis: [{ type: 'openapi', url: origin + '/api/openapi.json', description: 'Anonymous, read-only published website content. No account access or session state.' }]
  });
};
