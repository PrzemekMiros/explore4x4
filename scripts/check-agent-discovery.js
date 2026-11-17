// Run against LiteSpeed/Apache after building, not the Eleventy preview server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const vm = require('node:vm');
const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/check-agent-discovery.js https://explore4x4.pl');

async function check() {
  const routes = JSON.parse(fs.readFileSync('public/agent-routes.json', 'utf8'));
  for (const [route, page] of Object.entries(routes)) {
    const response = await fetch(new URL(route, base), { headers: { Accept: 'text/markdown' } });
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/markdown/);
    assert.match(response.headers.get('vary'), /Accept/i);
    assert.match(response.headers.get('link'), /rel="sitemap"/);
    assert.equal(await response.text(), fs.readFileSync('public/' + page.markdown, 'utf8'), route);
  }
  for (const accept of ['text/html', '*/*', 'text/markdown;q=0, text/html', 'text/markdown;q=0.5, text/html;q=1']) {
    const response = await fetch(base, { headers: { Accept: accept } });
    assert.match(response.headers.get('content-type'), /text\/html/, accept);
    assert.equal(await response.text(), fs.readFileSync('public/index.html', 'utf8'));
  }
  const head = await fetch(base, { method: 'HEAD', headers: { Accept: 'text/markdown' } });
  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type'), /text\/markdown/);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base, { headers: { Accept: 'text/markdown;q=0, text/html;q=0' } })).status, 406);
  assert.equal((await fetch(new URL('/missing-agent-test/', base), { headers: { Accept: 'text/markdown' } })).status, 404);
  assert.equal((await fetch(new URL('/agent-routes.json', base))).status, 403);
  const index = await (await fetch(new URL('/.well-known/agents-index.json', base))).json();
  assert.equal(index.agents.length, 0);
  assert.equal(index.resources.length, Object.keys(routes).filter(url => url.endsWith('/')).length);
  const robots = await (await fetch(new URL('/robots.txt', base))).text();
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=no/);
  const catalogResponse = await fetch(new URL('/.well-known/api-catalog', base));
  assert.match(catalogResponse.headers.get('content-type'), /application\/linkset\+json/);
  assert.match(catalogResponse.headers.get('link'), /rel="api-catalog"/);
  const catalog = await catalogResponse.json();
  const api = await (await fetch(new URL(new URL(catalog.linkset[0].anchor).pathname, base))).json();
  assert.equal(api.pages.length, index.resources.length);
  for (const page of api.pages) {
    const markdown = await (await fetch(new URL(new URL(page.markdown_url).pathname, base))).text();
    assert.equal(page.content, markdown);
  }
  const schema = await (await fetch(new URL('/api/openapi.json', base))).json();
  assert.equal(schema.openapi, '3.1.0');
  assert.deepEqual(schema.security, []);
  assert.ok(schema.paths['/api/pages.json'].get);
  const skills = await (await fetch(new URL('/.well-known/agent-skills/index.json', base))).json();
  for (const skill of skills.skills) {
    const response = await fetch(new URL(new URL(skill.url).pathname, base));
    assert.match(response.headers.get('content-type'), /text\/markdown/);
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(skill.digest, 'sha256:' + createHash('sha256').update(body).digest('hex'));
  }
  const ard = await (await fetch(new URL('/.well-known/ard.json', base))).json();
  for (const entry of ard.entries) {
    assert.match(entry.identifier, /^urn:air:explore4x4\.pl:/);
    assert.ok(entry.representativeQueries.length >= 2);
    assert.equal((await fetch(new URL(new URL(entry.url).pathname, base))).status, 200);
  }
  const poppy = await (await fetch(new URL('/.well-known/poppy.json', base))).json();
  assert.equal(poppy.protocol_version, '0.3');
  assert.equal(poppy.organization.domain, 'explore4x4.pl');
  assert.equal(poppy.apis[0].url, schema.servers[0].url + '/api/openapi.json');
  assert.equal(poppy.auth, undefined);
  for (const route of ['/.well-known/oauth-protected-resource', '/.well-known/openid-configuration', '/.well-known/oauth-authorization-server']) {
    assert.equal((await fetch(new URL(route, base))).status, 404, route);
  }
  assert.equal((await fetch(new URL('/auth.md', base))).status, 200);
  const source = await (await fetch(new URL('/assets/js/webmcp.js', base))).text();
  let tool;
  const testFetch = (url, options) => fetch(new URL(url, base), options);
  await vm.runInNewContext(source, { document: { modelContext: { registerTool(value) { tool = value; } } }, fetch: testFetch, console });
  assert.ok(tool, 'WebMCP tool registered');
  const results = JSON.parse((await tool.execute({ query: 'namioty' })).content[0].text).results;
  assert.ok(results.length > 0);
  assert.ok(results.every(result => api.pages.some(page => page.url === result.url)));
  assert.equal(JSON.parse((await tool.execute({ query: 'nonexistent-string-736462' })).content[0].text).results.length, 0);
  await assert.rejects(() => tool.execute({ query: '' }));
  await vm.runInNewContext(source, { document: {}, console });
  // Server errors must not turn into fabricated search results.
  await vm.runInNewContext(source, { document: { modelContext: { registerTool(value) { tool = value; } } }, fetch: async () => ({ ok: false }), console });
  await assert.rejects(() => tool.execute({ query: 'namioty' }));
  console.log('Passed: API catalog, content API, skill integrity, ARD, Poppy, no-auth discovery and WebMCP execution.');
  console.log(`Passed: ${Object.keys(routes).length} routes, HTML preferences, HEAD, 406, 404, private map and index.`);
}
check().catch(error => { console.error(error); process.exitCode = 1; });
