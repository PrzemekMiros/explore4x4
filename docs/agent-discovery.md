# Odkrywanie strony przez agentów

## Dodatkowe mechanizmy

| Kontrola | Implementacja / zastosowanie |
| --- | --- |
| Content Signals | `robots.txt`: `search=yes, ai-input=yes, ai-train=no`. Wyszukiwanie i odpowiedzi AI dozwolone, trening niedozwolony. To deklaracja preferencji, nie techniczna blokada pobierania. |
| API Catalog | `/.well-known/api-catalog`, format Linkset RFC 9727, typ `application/linkset+json`; wskazuje rzeczywiste API treści. |
| Publiczne API | `/api/pages.json`, bez logowania, tylko odczyt; OpenAPI 3.1 w `/api/openapi.json`, opis w `/api/README.md`. Dane odświeżane podczas budowania strony. |
| OAuth/OIDC discovery | Nie dotyczy: brak serwera autoryzacji, kont i logowania w publicznym API. Nie publikujemy fikcyjnych endpointów tokenów ani kluczy. |
| OAuth Protected Resource | Nie dotyczy: API nie jest chronione OAuth. Ścieżka discovery zwraca 404. |
| auth.md | `/auth.md` opisuje dostęp anonimowy. Nie implementuje protokołu rejestracji agentów WorkOS. |
| MCP Server Card | Nie dotyczy: brak serwera backendowego MCP. WebMCP w przeglądarce nie jest takim serwerem. |
| A2A Agent Card | Nie dotyczy: brak agenta obsługującego protokół A2A. |
| Agent Skills | `/.well-known/agent-skills/index.json`, schemat discovery 0.2.0, instrukcja odczytu treści i SHA-256 jej rzeczywistych bajtów. |
| WebMCP | `search_explore4x4` przeszukuje publiczne treści i zwraca linki oraz fragmenty. Rejestruje się przez `document.modelContext`, gdy przeglądarka wspiera API; bez tej funkcji strona działa normalnie. |
| ARD | `/.well-known/ard.json` opisuje OpenAPI oraz instrukcję odczytu treści; link w HTML i `Agentmap` w robots.txt. |
| Poppy | `/.well-known/poppy.json`, draft 0.3, publiczny kanał OpenAPI bez logowania i bez polegania na tożsamości sesji. Nie deklaruje OAuth, rozmów, zamówień ani sesji przeglądarkowych. |

Audyt ogólny może nadal zgłaszać brak usług, których ta strona nie udostępnia.
Wprowadzenie OAuth, zdalnego MCP lub A2A wymaga odrębnego wdrożenia backendu,
a nie wyłącznie plików discovery. `auth.md` nie oznacza obsługi rejestracji.
Narzędzie WebMCP nie wysyła formularzy, nie dokonuje zakupów i nie pobiera danych
prywatnych. Formularz kontaktowy oraz zewnętrzny sklep nie są częścią nowego API.

Specyfikacje użyte przy implementacji:
- [Content Signals](https://contentsignals.org/)
- [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html)
- [WebMCP](https://github.com/webmachinelearning/webmcp)
- [Agent Skills discovery 0.2.0](https://github.com/cloudflare/agent-skills-discovery-rfc)
- [ARD](https://github.com/ards-project/ard-spec/blob/main/spec/ard.md)
- [Poppy 0.3, w szczególności sekcje 3.2 i 5.3](https://personalagentprotocol.org/docs/0.3/spec.md)
- [auth.md — wymagania rejestracji](https://github.com/workos/auth.md/tree/main/agent-services)

`npm run build:eleventy` (również część `npm run build`) generuje wersje
`index.md` publicznych stron z ich głównej treści HTML, `llms.txt`, pełną mapę
witryny, `.well-known/agents-index.json`, mapę tras i `.htaccess`.
Strony bez `<main>` oraz z `noindex` nie trafiają do tego indeksu.

## Wdrożenie

Istniejący workflow FTP wysyła katalog `public/`. Na serwerze LiteSpeed/Apache
muszą być aktywne PHP 7.4+, reguły `.htaccess`, mod_rewrite i mod_headers
(lub ich odpowiedniki LiteSpeed). Przed wysłaniem sprawdź, czy istniejący
serwerowy `.htaccess` zawiera dodatkowe reguły, które trzeba scalić.
Nie wdrożono tych zmian automatycznie na produkcję.

Nagłówki `Link` wskazują sitemap, robots.txt, llms.txt oraz indeks zasobów.
Żądanie publicznej strony z `Accept: text/markdown` otrzymuje jej Markdown
pod tym samym URL. Jakości `q` są respektowane; przy remisie wygrywa Markdown.
`text/markdown;q=0` nie włącza Markdown. Zwykłe przeglądarki nadal pobierają
statyczny HTML. `Vary: Accept` rozdziela warianty; odpowiedzi PHP mają dodatkowo
`Cache-Control: private, no-store`. Cache CDN musi respektować te nagłówki.
Podgląd Eleventy nie interpretuje `.htaccess` ani PHP.

## DNS-AID — wymagana zmiana poza repozytorium

DNS-AID jest obecnie projektem IETF, a nie opublikowanym RFC. Dotyczy odkrywania
agentów i katalogów organizacji, nie jest obowiązkowym elementem SEO.
Ta witryna nie udostępnia MCP ani A2A: indeks zawiera pustą listę `agents`
i osobną listę rzeczywistych zasobów strony. Nie reklamujemy fikcyjnego agenta.

Po opublikowaniu indeksu administrator DNS domeny `explore4x4.pl` może dodać:

```dns
_index._agents.explore4x4.pl. 3600 IN SVCB 1 explore4x4.pl. alpn="http/1.1" well-known="agents-index.json"
```

Typ: **SVCB**, nazwa względna: **_index._agents**, TTL: **3600**, priorytet:
**1**, cel: **explore4x4.pl.** Parametr `well-known` jest eksperymentalny;
nie każdy panel DNS go obsługuje. Nie zastępuj go dowolnym numerem `keyNNNN`.
Jeśli panel obsługuje SVCB, lecz nie ten parametr, projekt opisuje wariant
SVCB dla celu i TXT dla dodatkowych parametrów, pod tą samą nazwą:

```dns
_index._agents.explore4x4.pl. 3600 IN SVCB 1 explore4x4.pl. alpn="http/1.1"
_index._agents.explore4x4.pl. 3600 IN TXT "well-known=agents-index.json"
```

Sam TXT nie przenosi nazwy hosta docelowego; nie jest tutaj równoważnym
zamiennikiem SVCB. W razie braku obsługi SVCB należy skontaktować się z operatorem
DNS. Nie ma dostępu do panelu DNS w tym repozytorium i rekord nie został dodany.
Wynik konkretnego audytora zależy od wspieranej przez niego wersji projektu.

## Sprawdzenie po wdrożeniu

```sh
curl -I https://explore4x4.pl/
curl -i -H 'Accept: text/markdown' https://explore4x4.pl/
curl -I -H 'Accept: text/markdown' https://explore4x4.pl/kontakt/
curl -I -H 'Accept: text/html;q=1, text/markdown;q=0.5' https://explore4x4.pl/
curl -i https://explore4x4.pl/.well-known/agents-index.json
dig SVCB _index._agents.explore4x4.pl
```

Oczekiwane: `Link`, `Vary: Accept`, dla Markdown `Content-Type: text/markdown;
charset=utf-8`, dla preferowanego HTML `text/html`, działający indeks i wpis DNS.
Sprawdź również zwykłe strony, formularze, zasoby oraz odpowiedź 404.

Automatyczny test HTTP (Node.js 18+, po buildzie i uruchomieniu Apache/LiteSpeed):

```sh
node scripts/check-agent-discovery.js http://127.0.0.1:18764
```

Sprawdza każdą wygenerowaną trasę, treść Markdown, nagłówki, priorytety formatów,
HEAD, 404, 406, ochronę mapy tras oraz dostępność indeksu.
Sprawdza również katalog API i typy MIME, zgodność treści API z Markdown,
SHA-256 instrukcji, odnośniki ARD, manifest Poppy oraz brak fikcyjnych endpointów
OAuth. Logika WebMCP jest wykonywana w środowisku JS z zastępczym interfejsem
rejestracji i rzeczywistymi żądaniami HTTP; nie zastępuje to testu integracyjnego
w przeglądarce z natywną obsługą WebMCP.

Źródła:
- [RFC 8288 — Web Linking](https://www.rfc-editor.org/rfc/rfc8288)
- [Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
- [DNS-AID, projekt z 2 listopada 2026](https://datatracker.ietf.org/doc/html/draft-mozleywilliams-dawn-dnsaid-00)
