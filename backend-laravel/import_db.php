<?php

$host = '127.0.0.1';
$db   = 'campuslink_db';
$user = 'campuslink';
$pass = 'campuslink_password';
$port = "5432";

$dsn = "pgsql:host=$host;port=$port;dbname=$db;";

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "Connected successfully\n";

    $sqlFile = __DIR__ . '/campuslink_db_dump.sql';
    if (!file_exists($sqlFile)) {
        die("Dump file not found: $sqlFile\n");
    }

    $sql = file_get_contents($sqlFile);
    $pdo->exec($sql);
    echo "SQL dump imported successfully.\n";

} catch (\PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
    exit(1);
}
