<?php
$urls = [
    'http://172.20.216.88:11434',
    'http://127.0.0.1:11434',
    'http://localhost:11434'
];
foreach ($urls as $url) {
    echo 'Testing ' . $url . ' ... ';
    try {
        $response = Http::timeout(2)->get($url . '/api/tags');
        echo 'SUCCESS (' . $response->status() . ')' . PHP_EOL;
    } catch (\Exception $e) {
        echo 'FAILED (' . $e->getMessage() . ')' . PHP_EOL;
    }
}

