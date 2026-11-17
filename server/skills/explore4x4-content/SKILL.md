---
name: explore4x4-content
description: Find and cite published Explore 4x4 information about roof tents, vehicle conversions, accessories and contact details using its public content API.
---

# Explore 4x4 public content

Fetch https://explore4x4.pl/api/pages.json without credentials. The response has
a `pages` array with `title`, `url`, `markdown_url` and `content` (Markdown).
Select relevant pages by their title and content, then cite their canonical `url`.
The content reflects the latest website build, not a live inventory system.

For individual pages, fetch `markdown_url`, or request the canonical page with
`Accept: text/markdown`. API schema: https://explore4x4.pl/api/openapi.json.

Do not infer current prices, stock, vehicle compatibility or booking availability
when the published text does not establish them. Refer those questions to
https://explore4x4.pl/kontakt/. The API cannot submit inquiries or place orders.
The shop linked by the site is a separate service with its own access rules.

Read https://explore4x4.pl/robots.txt for content usage preferences. No account,
OAuth token or agent registration is needed for these public resources.
