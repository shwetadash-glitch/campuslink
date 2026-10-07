const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\OfficerController.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `$student = Student::findOrFail($id);`,
    `$student = Student::where('student_identifier', $id)->orWhere('id', $id)->firstOrFail();`
);

fs.writeFileSync(file, content);
console.log('Successfully updated OfficerController lookup');
