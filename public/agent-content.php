<?php
// Serve only build-generated public pages; never turn a request path into a file path.
function mediaQuality($accept, $type) {
    $bestSpecificity = -1;
    $quality = 0.0;
    foreach (explode(',', strtolower($accept)) as $range) {
        $parts = array_map('trim', explode(';', $range));
        $media = array_shift($parts);
        $specificity = $media === $type ? 2 : ($media === 'text/*' ? 1 : ($media === '*/*' ? 0 : -1));
        if ($specificity < 0 || $specificity < $bestSpecificity) continue;
        $q = 1.0;
        foreach ($parts as $part) {
            if (preg_match('/^q\s*=\s*(.*)$/', $part, $match)) {
                $q = is_numeric($match[1]) ? max(0, min(1, (float)$match[1])) : 0;
            }
        }
        if ($specificity > $bestSpecificity) $quality = $q;
        else $quality = max($quality, $q);
        $bestSpecificity = $specificity;
    }
    return $quality;
}

$routes = json_decode(file_get_contents(__DIR__ . '/agent-routes.json'), true);
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$page = $routes[$uri] ?? null;
header('Vary: Accept');
// Avoid intermediary caches mixing the negotiated representation with static HTML.
header('Cache-Control: private, no-store');
if (!$page) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo 'Nie znaleziono strony.';
    exit;
}
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$md = mediaQuality($accept, 'text/markdown');
$html = mediaQuality($accept, 'text/html');
if ($md <= 0 && $html <= 0) {
    http_response_code(406);
    exit;
}
$markdown = $md > 0 && $md >= $html;
$file = __DIR__ . '/' . $page[$markdown ? 'markdown' : 'html'];
header('Content-Type: ' . ($markdown ? 'text/markdown' : 'text/html') . '; charset=utf-8');
header('Content-Length: ' . filesize($file));
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($file);
