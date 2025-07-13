<?php

header('Content-Type: application/json');

// Handle GET ?url=... for single requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['url'])) {
    $urls = [$_GET['url']];
}

// Handle POST {"urls": [...]}
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $urls = $data['urls'] ?? ($_POST['urls'] ?? null);
}

// Invalid input
else {
    http_response_code(400);
    echo json_encode(['error' => 'Send a POST request with {"urls": [url1, url2, ...]} or a GET request with ?url=...']);
    exit;
}

if (!$urls || !is_array($urls)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing URLs']);
    exit;
}

function fingerprintUrl($url, $duration = 60) {
    $tempFile = tempnam(sys_get_temp_dir(), 'fp_');

    $fp = fopen($tempFile, 'w+');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    if (!curl_exec($ch)) {
        curl_close($ch);
        fclose($fp);
        unlink($tempFile);
        return ['url' => $url, 'error' => 'Download failed'];
    }

    curl_close($ch);
    fclose($fp);

    $cmd = "fpcalc -raw -length $duration " . escapeshellarg($tempFile);
    $output = shell_exec($cmd);
    unlink($tempFile);

    if (!$output) {
        return ['url' => $url, 'error' => 'Fingerprinting failed'];
    }

    $lines = explode("\n", trim($output));
    $fingerprint = null;
    $dur = null;

    foreach ($lines as $line) {
        if (str_starts_with($line, 'FINGERPRINT=')) {
            $fingerprint = substr($line, strlen('FINGERPRINT='));
        } elseif (str_starts_with($line, 'DURATION=')) {
            $dur = floatval(substr($line, strlen('DURATION=')));
        }
    }

    return [
        'url' => $url,
        'duration' => $dur,
        'fingerprint' => $fingerprint
    ];
}

$results = array_map('fingerprintUrl', $urls);
echo json_encode(['results' => $results]);
