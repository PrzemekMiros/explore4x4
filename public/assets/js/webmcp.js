// WebMCP is progressive enhancement: ordinary browsing needs no support for it.
(async function () {
  const context = document.modelContext;
  if (!context || typeof context.registerTool !== 'function') return;
  try {
    await context.registerTool({
      name: 'search_explore4x4',
      description: 'Search published Explore 4x4 pages about roof tents, vehicle conversions, accessories and contact details. Returns page links and excerpts; does not check live stock or place orders.',
      inputSchema: {
        type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 200 } },
        required: ['query'], additionalProperties: false
      },
      annotations: { readOnlyHint: true },
      async execute(input) {
        if (!input || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 200) {
          throw new Error('Provide a search query between 1 and 200 characters.');
        }
        const response = await fetch('/api/pages.json', { credentials: 'omit' });
        if (!response.ok) throw new Error('The public content index is temporarily unavailable.');
        const data = await response.json();
        const terms = input.query.trim().toLocaleLowerCase('pl').split(/\s+/);
        const results = data.pages.filter(page => {
          const text = (page.title + ' ' + page.content).toLocaleLowerCase('pl');
          return terms.every(term => text.includes(term));
        }).slice(0, 8).map(page => {
          const position = page.content.toLocaleLowerCase('pl').indexOf(terms[0]);
          const start = Math.max(0, position - 80);
          return { title: page.title, url: page.url, markdown_url: page.markdown_url,
            excerpt: page.content.slice(start, start + 700) };
        });
        return { content: [{ type: 'text', text: JSON.stringify({ results }) }] };
      }
    });
  } catch (error) {
    console.warn('Explore 4x4 WebMCP registration unavailable:', error.message);
  }
})();
