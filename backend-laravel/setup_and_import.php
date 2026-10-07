<?php
try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=postgres', 'postgres', 'postgres', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec("CREATE USER campuslink WITH PASSWORD 'campuslink_password'");
    $pdo->exec("CREATE DATABASE campuslink_db OWNER campuslink");
    echo "Created DB and User.\n";
} catch (Exception $e) {
    echo "DB/User creation error: " . $e->getMessage() . "\n";
}

try {
    $pdo2 = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=campuslink_db', 'campuslink', 'campuslink_password', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $sql = file_get_contents(__DIR__ . '/campuslink_db_dump.sql');
    // Remove the backslash commands like \restrict that pg_dump creates which PDO might choke on
    $sql = preg_replace('/^\\\\.*$/m', '', $sql);
    $pdo2->exec($sql);
    echo "Dump imported successfully!\n";
} catch (Exception $e) {
    echo "Import failed: " . $e->getMessage() . "\n";
}
