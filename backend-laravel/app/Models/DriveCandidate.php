<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;
use App\Enums\CandidateDriveStatus;

class DriveCandidate extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'eligibility_details' => 'array',
        'round_results' => 'array',
        'current_round_number' => 'integer',
        'registered_at' => 'datetime',
    ];

    public function drive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function placementDrive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function statusHistories()
    {
        return $this->hasMany(DriveCandidateStatusHistory::class, 'drive_candidate_id')->orderBy('id', 'desc');
    }

    /**
     * Transition the student-drive application to a new canonical status with auditable history.
     * Prevents duplicate/contradictory transitions.
     *
     * @throws \InvalidArgumentException
     */
    public function transitionTo(string $newStatus, ?int $changedByUserId = null, ?string $reason = null): self
    {
        // Enforce canonical lifecycle case
        $canonicalCases = array_map(fn($case) => $case->value, CandidateDriveStatus::cases());
        if (!in_array($newStatus, $canonicalCases, true)) {
            throw new \InvalidArgumentException("Invalid candidate status [{$newStatus}]. Must be one of canonical states: " . implode(', ', $canonicalCases));
        }

        $currentStatus = is_object($this->status) ? $this->status->value : (string) $this->status;

        if ($currentStatus === $newStatus) {
            return $this; // Idempotent, no duplicate history
        }

        // Terminal states cannot transition to active states
        $terminalStates = [
            CandidateDriveStatus::WITHDRAWN->value,
            CandidateDriveStatus::REJECTED->value,
            CandidateDriveStatus::JOINED->value,
            CandidateDriveStatus::OFFER_REJECTED->value
        ];

        if (in_array($currentStatus, $terminalStates, true)) {
            throw new \InvalidArgumentException("Cannot transition drive candidate from terminal state [{$currentStatus}] to [{$newStatus}].");
        }

        DB::transaction(function () use ($newStatus, $changedByUserId, $reason, $currentStatus) {
            $this->update(['status' => $newStatus]);

            DriveCandidateStatusHistory::create([
                'drive_candidate_id' => $this->id,
                'student_id' => $this->student_id,
                'drive_id' => $this->drive_id,
                'from_status' => $currentStatus,
                'to_status' => $newStatus,
                'changed_by_user_id' => $changedByUserId,
                'reason' => $reason,
                'timestamp' => now(),
            ]);
        });

        return $this;
    }

    /**
     * Record round-level result without corrupting the canonical global application status.
     */
    public function recordRoundResult(int $roundNumber, string $result, ?float $score = null, ?int $changedByUserId = null, ?string $notes = null): self
    {
        $allowedResults = ['PASSED', 'FAILED', 'PENDING', 'ABSENT'];
        if (!in_array($result, $allowedResults, true)) {
            throw new \InvalidArgumentException("Invalid round result [{$result}]. Must be one of: " . implode(', ', $allowedResults));
        }

        $roundResults = $this->round_results ?? [];
        $roundResults[(string) $roundNumber] = [
            'round_number' => $roundNumber,
            'result' => $result,
            'score' => $score,
            'notes' => $notes,
            'updated_at' => now()->toIso8601String(),
        ];

        $this->round_results = $roundResults;
        $this->current_round_number = $roundNumber;
        $this->save();

        if ($result === 'FAILED' || $result === 'ABSENT') {
            $this->transitionTo(
                CandidateDriveStatus::REJECTED->value,
                $changedByUserId,
                "Eliminated in selection round #{$roundNumber}: {$result}."
            );
        } elseif ($result === 'PASSED') {
            // Keep canonical lifecycle state in INTERVIEWING
            if ($this->status !== CandidateDriveStatus::INTERVIEWING->value && $this->status !== CandidateDriveStatus::OFFERED->value) {
                $this->transitionTo(
                    CandidateDriveStatus::INTERVIEWING->value,
                    $changedByUserId,
                    "Cleared selection round #{$roundNumber}. Progressing in interview cycle."
                );
            }
        }

        return $this;
    }
}
