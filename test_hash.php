<?php
$h1 = '$2y$12$k62KlvJMJBDxyD8MIANGbuwxetmj/4bkWounCYS.0euBRB.uf83/q';
$h2 = '$2y$12$ss4HJBpvXeATiPih2/.8ieFXfeOimGW/ftz4F07W7af9aK3asTpx.';
var_dump(password_verify('password', $h1));
var_dump(password_verify('admin123', $h1));
var_dump(password_verify('password', $h2));
var_dump(password_verify('rec123', $h2));
