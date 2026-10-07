<?php

require __DIR__ . '/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/backend-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$faker = Faker\Factory::create();
$students = App\Models\Student::all();

$count = 0;
foreach($students as $s) {
    if(strpos($s->first_name, 'First') !== false || $s->first_name == 'First1' || $s->first_name == 'Alice') {
        $s->first_name = $faker->firstName;
        $s->last_name = $faker->lastName;
        $s->save();
        $count++;
    }
}

echo "Successfully updated $count student names to realistic names!\n";
