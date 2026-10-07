<?php
$users = ['postgres', 'campuslink', 'root'];
$passwords = ['postgres', 'password', 'root', 'admin', 'campuslink_password', '123456', '1234', 'campuslink'];
foreach ($users as $u) {
    foreach ($passwords as $p) {
        try {
            new PDO('pgsql:host=127.0.0.1;port=5432;dbname=postgres', $u, $p);
            echo "Success: $u / $p\n";
            exit(0);
        } catch (Exception $e) {}
    }
}
echo "Failed\n";
