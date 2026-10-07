const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\OfficerController.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `$students = $query->offset($offset)->limit($limit)->get();`,
    `$students = $query->with(['scores' => function($q) {
            $q->where('score_type', 'READINESS_V1')->latest('calculated_at');
        }])->offset($offset)->limit($limit)->get();
        
        $students->transform(function($student) {
            $arr = $student->toArray();
            $arr['readiness_score'] = $student->scores->first()->score_value ?? null;
            return $arr;
        });`
);

fs.writeFileSync(file, content);
console.log('Successfully fixed OfficerController to return readiness_score');
