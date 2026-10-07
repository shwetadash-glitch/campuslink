<?php
namespace App\Console\Commands;
use Illuminate\Console\Command;
use App\Models\Student;
use App\Services\ReadinessScoringService;

class FetchReadiness extends Command
{
    protected $signature = 'app:fetch-readiness';
    public function handle()
    {
        $service = new ReadinessScoringService();
        $students = Student::all();
        $shortlisted = [];
        
        foreach ($students as $student) {
            $readiness = $service->calculateReadiness($student);
            $shortlisted[] = [
                'id' => $student->student_identifier,
                'name' => $student->first_name . ' ' . $student->last_name,
                'branch' => $student->branch,
                'score' => $readiness['overall_score'],
                'tier' => $readiness['readiness_level']
            ];
        }
        
        $this->info(json_encode($shortlisted, JSON_PRETTY_PRINT));
    }
}
