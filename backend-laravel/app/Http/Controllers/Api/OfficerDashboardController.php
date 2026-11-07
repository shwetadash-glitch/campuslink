<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\DriveCandidate;
use App\Models\PlacementDrive;
use App\Models\Offer;
use App\Models\StudentScore;
use App\Enums\CandidateDriveStatus;
use App\Enums\OfferStatus;
use Illuminate\Support\Facades\DB;

class OfficerDashboardController extends Controller
{
    /**
     * Placement Officer Dashboard with genuine database aggregations.
     */
    public function index(Request $request)
    {
        // 1. Overall Student & Readiness Aggregations
        $totalStudents = Student::count();
        $jobReadyStudents = StudentScore::where('score_type', 'READINESS_V1')
            ->where('score_value', '>=', 70)
            ->distinct('student_id')
            ->count('student_id');

        $eligibleStudents = Student::where('backlogs_current', 0)
            ->where('cgpa', '>=', 6.0)
            ->count();

        // 2. Candidate & Participation Aggregations
        $registeredCandidates = DriveCandidate::count();
        $driveParticipation = DriveCandidate::distinct('student_id')->count('student_id');

        $studentsAwaitingOutcomes = DriveCandidate::whereIn('status', [
            CandidateDriveStatus::REGISTERED->value,
            CandidateDriveStatus::SHORTLISTED->value,
            CandidateDriveStatus::INTERVIEWING->value,
        ])->distinct('student_id')->count('student_id');

        // 3. Selection Progression Breakdown
        $progressionCounts = DriveCandidate::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $selectionProgression = [
            'REGISTERED' => $progressionCounts[CandidateDriveStatus::REGISTERED->value] ?? 0,
            'SHORTLISTED' => $progressionCounts[CandidateDriveStatus::SHORTLISTED->value] ?? 0,
            'INTERVIEWING' => $progressionCounts[CandidateDriveStatus::INTERVIEWING->value] ?? 0,
            'OFFERED' => $progressionCounts[CandidateDriveStatus::OFFERED->value] ?? 0,
            'OFFER_ACCEPTED' => $progressionCounts[CandidateDriveStatus::OFFER_ACCEPTED->value] ?? 0,
            'OFFER_REJECTED' => $progressionCounts[CandidateDriveStatus::OFFER_REJECTED->value] ?? 0,
            'JOINED' => $progressionCounts[CandidateDriveStatus::JOINED->value] ?? 0,
            'REJECTED' => $progressionCounts[CandidateDriveStatus::REJECTED->value] ?? 0,
            'WITHDRAWN' => $progressionCounts[CandidateDriveStatus::WITHDRAWN->value] ?? 0,
        ];

        // 4. Offer Aggregations
        $totalOffers = Offer::count();
        $acceptedOffers = Offer::whereIn('status', [OfferStatus::ACCEPTED, OfferStatus::JOINED])->count();
        $highestCtc = round((float) (Offer::max('ctc') ?? 0), 2);
        $averageCtc = round((float) (Offer::whereIn('status', [OfferStatus::ACCEPTED, OfferStatus::JOINED])->avg('ctc') ?? 0), 2);

        // 5. Department-wise genuine statistics
        $branchGroups = Student::select('branch', DB::raw('count(*) as total'))
            ->groupBy('branch')
            ->get();

        $placedStudentsByBranch = Student::join('offers', 'students.id', '=', 'offers.student_id')
            ->whereIn('offers.status', [OfferStatus::ACCEPTED->value, OfferStatus::JOINED->value])
            ->select('students.branch', DB::raw('count(distinct students.id) as placed'), DB::raw('avg(offers.ctc) as avg_ctc'), DB::raw('max(offers.ctc) as max_ctc'))
            ->groupBy('students.branch')
            ->get()
            ->keyBy('branch');

        $heatmap = $branchGroups->map(function ($b) use ($placedStudentsByBranch) {
            $placedData = $placedStudentsByBranch->get($b->branch);
            $placedCount = $placedData ? (int) $placedData->placed : 0;
            $avgPackage = $placedData && $placedData->avg_ctc ? round((float) $placedData->avg_ctc, 2) : 0.0;
            $maxPackage = $placedData && $placedData->max_ctc ? round((float) $placedData->max_ctc, 2) : 0.0;
            $conversionRate = $b->total > 0 ? round(($placedCount / $b->total) * 100, 1) : 0.0;

            return [
                'name' => $b->branch,
                'total' => (int) $b->total,
                'placed' => $placedCount,
                'avg_package' => $avgPackage,
                'highest_package' => $maxPackage,
                'conversion_rate_percent' => $conversionRate,
            ];
        });

        // 6. Batch-wise genuine statistics
        $batchStats = Student::select('graduation_year', DB::raw('count(*) as total_students'))
            ->groupBy('graduation_year')
            ->orderBy('graduation_year', 'desc')
            ->get()
            ->map(function ($batch) {
                $placed = Student::join('offers', 'students.id', '=', 'offers.student_id')
                    ->where('students.graduation_year', $batch->graduation_year)
                    ->whereIn('offers.status', [OfferStatus::ACCEPTED->value, OfferStatus::JOINED->value])
                    ->distinct('students.id')
                    ->count('students.id');

                $avgCtc = Student::join('offers', 'students.id', '=', 'offers.student_id')
                    ->where('students.graduation_year', $batch->graduation_year)
                    ->whereIn('offers.status', [OfferStatus::ACCEPTED->value, OfferStatus::JOINED->value])
                    ->avg('offers.ctc');

                return [
                    'graduation_year' => $batch->graduation_year,
                    'total_students' => (int) $batch->total_students,
                    'placed_students' => $placed,
                    'placement_rate_percent' => $batch->total_students > 0 ? round(($placed / $batch->total_students) * 100, 1) : 0.0,
                    'avg_package' => $avgCtc ? round((float) $avgCtc, 2) : 0.0,
                ];
            });

        // 7. Active Placement Drives with Real Counts
        $activeDrives = PlacementDrive::with(['company', 'job'])
            ->withCount([
                'candidates as registered_count',
                'candidates as shortlisted_count' => fn($q) => $q->where('status', CandidateDriveStatus::SHORTLISTED->value),
                'candidates as interviewing_count' => fn($q) => $q->where('status', CandidateDriveStatus::INTERVIEWING->value),
                'candidates as offered_count' => fn($q) => $q->whereIn('status', [CandidateDriveStatus::OFFERED->value, CandidateDriveStatus::OFFER_ACCEPTED->value]),
            ])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($d) {
                return [
                    'id' => $d->id,
                    'name' => $d->name,
                    'company_name' => $d->company ? $d->company->name : 'Unknown',
                    'status' => is_object($d->status) ? $d->status->value : $d->status,
                    'role' => $d->job ? $d->job->title : 'Role',
                    'date' => $d->created_at ? $d->created_at->format('M d, Y') : 'N/A',
                    'registered_count' => $d->registered_count,
                    'shortlisted_count' => $d->shortlisted_count,
                    'interviewing_count' => $d->interviewing_count,
                    'offered_count' => $d->offered_count,
                ];
            });

        return response()->json([
            'status' => 'success',
            'total_students' => $totalStudents,
            'job_ready_students' => $jobReadyStudents,
            'eligible_students' => $eligibleStudents,
            'registered_candidates' => $registeredCandidates,
            'drive_participation' => $driveParticipation,
            'students_awaiting_outcomes' => $studentsAwaitingOutcomes,
            'total_offers' => $totalOffers,
            'accepted_offers' => $acceptedOffers,
            'highest_ctc' => $highestCtc,
            'average_ctc' => $averageCtc,
            'selection_progression' => $selectionProgression,
            'department_wise_stats' => $heatmap,
            'batch_wise_stats' => $batchStats,
            'active_drives' => $activeDrives,
            'heatmap' => $heatmap, // Preserves backward compatibility with existing frontend
        ]);
    }
}
