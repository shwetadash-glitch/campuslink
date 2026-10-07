const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\OfficerController.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `    public function student($id) {
        return Student::findOrFail($id);
    }`,
    `    public function student($id) {
        $student = Student::findOrFail($id);
        $student->load(['academicHistory', 'skills.skill', 'projects', 'certifications', 'assessments']);
        return new \\App\\Http\\Resources\\FullStudentProfileResource($student);
    }`
);

fs.writeFileSync(file, content);
console.log('Successfully updated OfficerController to return full profile');
