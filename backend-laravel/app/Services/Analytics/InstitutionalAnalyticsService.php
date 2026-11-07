<?php

namespace App\Services\Analytics;

use App\Models\Student;
use App\Models\Offer;
use App\Models\DriveCandidate;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Models\AiInterviewSession;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InstitutionalAnalyticsService
{
    protected ?string $connection = null;

    /**
     * Formally issued offer statuses (excluding WITHDRAWN).
     */
    public const FORMALLY_ISSUED_STATUSES = [
        'PENDING',
        'ACCEPTED',
        'DECLINED',
        'REJECTED',
        'DEFERRED',
        'JOINED',
    ];

    /**
     * Set explicit database connection name (e.g. for multi-connection tests).
     */
    public function setConnection(?string $connection): self
    {
        $this->connection = $connection;
        return $this;
    }

    /**
     * Helper to get query builder for a model on the configured connection.
     */
    protected function modelQuery(string $modelClass)
    {
        return $this->connection ? $modelClass::on($this->connection) : $modelClass::query();
    }

    /**
     * Helper to get DB connection instance.
     */
    protected function db()
    {
        return $this->connection ? DB::connection($this->connection) : DB::connection();
    }

    /**
     * 1. Institutional Placement Overview
     */
    public function getOverview(?int $graduationYear = null, ?string $branch = null): array
    {
        $totalQuery = $this->modelQuery(Student::class);
        if ($graduationYear !== null) {
            $totalQuery->where('graduation_year', $graduationYear);
        }
        if ($branch !== null) {
            $totalQuery->where('branch', $branch);
        }
        $totalCohortCount = (clone $totalQuery)->count();

        // Baseline eligible cohort: backlogs_current == 0 AND cgpa >= 6.0
        $eligibleQuery = (clone $totalQuery)
            ->where('backlogs_current', 0)
            ->where('cgpa', '>=', 6.0);
        $eligibleCohortCount = (clone $eligibleQuery)->count();
        $ineligibleCohortCount = $totalCohortCount - $eligibleCohortCount;

        // Ineligibility breakdown - exact mutual complement partitions
        $backlogOnlyIneligible = (clone $totalQuery)
            ->where(function ($q) {
                $q->where('backlogs_current', '!=', 0)
                  ->orWhereNull('backlogs_current');
            })
            ->where('cgpa', '>=', 6.0)
            ->count();

        $cgpaOnlyIneligible = (clone $totalQuery)
            ->where('backlogs_current', 0)
            ->where(function ($q) {
                $q->where('cgpa', '<', 6.0)->orWhereNull('cgpa');
            })
            ->count();

        $bothIneligible = (clone $totalQuery)
            ->where(function ($q) {
                $q->where('backlogs_current', '!=', 0)
                  ->orWhereNull('backlogs_current');
            })
            ->where(function ($q) {
                $q->where('cgpa', '<', 6.0)->orWhereNull('cgpa');
            })
            ->count();

        // 2. Student Participation (Restricted to baseline eligible cohort)
        $participatingEligibleStudentsCount = (clone $eligibleQuery)
            ->where(function ($q) {
                $q->whereHas('driveCandidates', function ($dc) {
                    $dc->where('status', '!=', 'WITHDRAWN');
                })->orWhereHas('offers', function ($off) {
                    $off->where('is_off_campus', true);
                });
            })
            ->count();

        $participationRate = $eligibleCohortCount > 0
            ? round(($participatingEligibleStudentsCount / $eligibleCohortCount) * 100, 2)
            : 0.0;

        // Gross applications count from baseline eligible cohort
        $eligibleStudentIdsSub = (clone $eligibleQuery)->select('id');
        $grossApplicationsCount = $this->modelQuery(DriveCandidate::class)
            ->whereIn('student_id', $eligibleStudentIdsSub)
            ->where('status', '!=', 'WITHDRAWN')
            ->count();

        // Formally issued offers for eligible cohort
        $formallyIssuedOffersCount = $this->modelQuery(Offer::class)
            ->whereIn('student_id', $eligibleStudentIdsSub)
            ->whereIn('status', self::FORMALLY_ISSUED_STATUSES)
            ->count();

        // 3. Placed Students (Institutional placement: baseline eligible + VERIFIED + ACCEPTED/JOINED)
        $placedEligibleStudents = (clone $eligibleQuery)
            ->whereHas('offers', function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            })
            ->with(['offers' => function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            }])
            ->get();

        $placedStudentsCount = $placedEligibleStudents->count();
        $placementRate = $eligibleCohortCount > 0
            ? round(($placedStudentsCount / $eligibleCohortCount) * 100, 2)
            : 0.0;

        $unplacedStudentsCount = max(0, $eligibleCohortCount - $placedStudentsCount);
        $unplacedRate = $eligibleCohortCount > 0
            ? round(($unplacedStudentsCount / $eligibleCohortCount) * 100, 2)
            : 0.0;

        // 4. Placements Outside Baseline Cohort (True complement: backlogs != 0 OR backlogs IS NULL OR cgpa < 6.0 OR cgpa IS NULL)
        $outsideCohortQuery = (clone $totalQuery)->where(function ($q) {
            $q->where('backlogs_current', '!=', 0)
              ->orWhereNull('backlogs_current')
              ->orWhere('cgpa', '<', 6.0)
              ->orWhereNull('cgpa');
        });

        $outsidePlacedStudents = (clone $outsideCohortQuery)
            ->whereHas('offers', function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            })
            ->get();

        $outsidePlacedCount = $outsidePlacedStudents->count();

        // 5. Compensation Summary
        // Student-level primary offers: select primary offer first, then evaluate CTC
        $primaryCtcs = [];
        $unspecifiedCompensationCount = 0;
        foreach ($placedEligibleStudents as $student) {
            $primary = $this->selectPrimaryOffer($student->offers);
            if ($primary) {
                if ($primary->ctc !== null && (float)$primary->ctc > 0) {
                    $primaryCtcs[] = (float) $primary->ctc;
                } else {
                    $unspecifiedCompensationCount++;
                }
            }
        }

        $studentHighestCtc = !empty($primaryCtcs) ? round(max($primaryCtcs), 2) : null;
        $studentLowestCtc = !empty($primaryCtcs) ? round(min($primaryCtcs), 2) : null;
        $studentAverageCtc = $this->calculateAverage($primaryCtcs);
        $studentMedianCtc = $this->calculateMedian($primaryCtcs);

        // Offer-level gross offers
        $qualifyingOffers = $this->modelQuery(Offer::class)
            ->whereIn('student_id', $eligibleStudentIdsSub)
            ->where('verification_status', 'VERIFIED')
            ->whereIn('status', ['ACCEPTED', 'JOINED'])
            ->whereNotNull('ctc')
            ->where('ctc', '>', 0)
            ->pluck('ctc')
            ->map(fn($v) => (float)$v)
            ->all();

        $offerHighestCtc = !empty($qualifyingOffers) ? round(max($qualifyingOffers), 2) : null;
        $offerLowestCtc = !empty($qualifyingOffers) ? round(min($qualifyingOffers), 2) : null;
        $offerAverageCtc = $this->calculateAverage($qualifyingOffers);
        $offerMedianCtc = $this->calculateMedian($qualifyingOffers);

        return [
            'cohort' => [
                'total_students' => $totalCohortCount,
                'eligible_students' => $eligibleCohortCount,
                'ineligible_students' => $ineligibleCohortCount,
                'ineligibility_breakdown' => [
                    'backlog_ineligible' => $backlogOnlyIneligible,
                    'cgpa_ineligible' => $cgpaOnlyIneligible,
                    'both_ineligible' => $bothIneligible,
                ],
            ],
            'participation' => [
                'participating_students' => $participatingEligibleStudentsCount,
                'participation_rate' => $participationRate,
                'gross_applications' => $grossApplicationsCount,
                'formally_issued_offers' => $formallyIssuedOffersCount,
            ],
            'placement' => [
                'placed_students' => $placedStudentsCount,
                'placement_rate' => $placementRate,
                'unplaced_students' => $unplacedStudentsCount,
                'unplaced_rate' => $unplacedRate,
            ],
            'placements_outside_baseline_eligibility' => [
                'total_count' => $outsidePlacedCount,
                'special_clearance_association' => 'UNAVAILABLE',
                'special_clearance_limitation_note' => 'Individual student placement eligibility exception records are not persisted in the database schema; emergency_clearances tracks institutional event scheduling conflict overrides only.',
                'note' => 'Reported separately; not included in eligible cohort placement rate numerator or denominator.',
            ],
            'compensation' => [
                'currency' => 'INR',
                'unit' => 'LPA',
                'student_level_primary' => [
                    'placed_students_count' => $placedStudentsCount,
                    'placed_students_evaluated' => count($primaryCtcs),
                    'placed_students_with_unspecified_compensation' => $unspecifiedCompensationCount,
                    'highest_ctc' => $studentHighestCtc,
                    'lowest_ctc' => $studentLowestCtc,
                    'average_ctc' => $studentAverageCtc,
                    'median_ctc' => $studentMedianCtc,
                ],
                'offer_level_gross' => [
                    'verified_offers_evaluated' => count($qualifyingOffers),
                    'highest_ctc' => $offerHighestCtc,
                    'lowest_ctc' => $offerLowestCtc,
                    'average_ctc' => $offerAverageCtc,
                    'median_ctc' => $offerMedianCtc,
                ],
            ],
            'filters_applied' => [
                'graduation_year' => $graduationYear,
                'branch' => $branch,
            ],
        ];
    }

    /**
     * 2. Placement Funnel
     */
    public function getPlacementFunnel(?int $graduationYear = null, ?string $branch = null): array
    {
        $totalQuery = $this->modelQuery(Student::class);
        if ($graduationYear !== null) {
            $totalQuery->where('graduation_year', $graduationYear);
        }
        if ($branch !== null) {
            $totalQuery->where('branch', $branch);
        }
        $totalCohort = (clone $totalQuery)->count();

        $eligibleQuery = (clone $totalQuery)
            ->where('backlogs_current', 0)
            ->where('cgpa', '>=', 6.0);
        $eligibleCohort = (clone $eligibleQuery)->count();

        // Participating students
        $participatingCount = (clone $eligibleQuery)
            ->where(function ($q) {
                $q->whereHas('driveCandidates', function ($dc) {
                    $dc->where('status', '!=', 'WITHDRAWN');
                })->orWhereHas('offers', function ($off) {
                    $off->where('is_off_campus', true);
                });
            })
            ->count();

        // Reached Interview Stage: Candidates in eligible cohort who progressed past screening or reached interview
        $interviewStageCount = (clone $eligibleQuery)
            ->where(function ($q) {
                $q->whereHas('driveCandidates', function ($dc) {
                    $dc->where('status', '!=', 'WITHDRAWN')
                       ->where(function ($sub) {
                           $sub->where('current_round_number', '>', 1)
                               ->orWhereIn('status', [
                                   'SHORTLISTED',
                                   'INTERVIEWING',
                                   'OFFERED',
                                   'OFFER_ACCEPTED',
                                   'OFFER_REJECTED',
                                   'JOINED'
                               ]);
                       });
                })
                ->orWhereHas('schedules')
                ->orWhereHas('aiInterviewSessions');
            })
            ->count();

        // Offered Students (Eligible students receiving at least one formally issued offer)
        $offeredStudentsCount = (clone $eligibleQuery)
            ->whereHas('offers', function ($q) {
                $q->whereIn('status', self::FORMALLY_ISSUED_STATUSES);
            })
            ->count();

        // Verified Placed Students
        $verifiedPlacedCount = (clone $eligibleQuery)
            ->whereHas('offers', function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            })
            ->count();

        return [
            'stages' => [
                [
                    'stage' => 'total_cohort',
                    'label' => 'Total Enrolled Cohort',
                    'count' => $totalCohort,
                    'conversion_rate' => 100.0,
                ],
                [
                    'stage' => 'eligible_cohort',
                    'label' => 'Baseline Eligible Cohort',
                    'count' => $eligibleCohort,
                    'conversion_rate' => $totalCohort > 0 ? round(($eligibleCohort / $totalCohort) * 100, 2) : 0.0,
                ],
                [
                    'stage' => 'participating',
                    'label' => 'Active Participation',
                    'count' => $participatingCount,
                    'conversion_rate' => $eligibleCohort > 0 ? round(($participatingCount / $eligibleCohort) * 100, 2) : 0.0,
                ],
                [
                    'stage' => 'interview_stage',
                    'label' => 'Reached Interview / Assessment Stage',
                    'count' => $interviewStageCount,
                    'conversion_rate' => $participatingCount > 0 ? round(($interviewStageCount / $participatingCount) * 100, 2) : 0.0,
                ],
                [
                    'stage' => 'offered',
                    'label' => 'Received Formal Offer(s)',
                    'count' => $offeredStudentsCount,
                    'conversion_rate' => $interviewStageCount > 0 ? round(($offeredStudentsCount / $interviewStageCount) * 100, 2) : 0.0,
                ],
                [
                    'stage' => 'verified_placed',
                    'label' => 'Verified Institutional Placement',
                    'count' => $verifiedPlacedCount,
                    'conversion_rate' => $offeredStudentsCount > 0 ? round(($verifiedPlacedCount / $offeredStudentsCount) * 100, 2) : 0.0,
                    'overall_placement_rate' => $eligibleCohort > 0 ? round(($verifiedPlacedCount / $eligibleCohort) * 100, 2) : 0.0,
                ],
            ],
            'filters_applied' => [
                'graduation_year' => $graduationYear,
                'branch' => $branch,
            ],
        ];
    }

    /**
     * 3. Branch Comparison (PII-free)
     */
    public function getBranchComparison(?int $graduationYear = null): array
    {
        $baseQuery = $this->modelQuery(Student::class);
        if ($graduationYear !== null) {
            $baseQuery->where('graduation_year', $graduationYear);
        }

        $branches = (clone $baseQuery)->distinct()->pluck('branch')->filter()->values();

        $result = [];
        foreach ($branches as $branch) {
            $branchTotalQuery = (clone $baseQuery)->where('branch', $branch);
            $totalCount = (clone $branchTotalQuery)->count();

            $eligibleQuery = (clone $branchTotalQuery)
                ->where('backlogs_current', 0)
                ->where('cgpa', '>=', 6.0);
            $eligibleCount = (clone $eligibleQuery)->count();

            $participatingCount = (clone $eligibleQuery)
                ->where(function ($q) {
                    $q->whereHas('driveCandidates', fn($dc) => $dc->where('status', '!=', 'WITHDRAWN'))
                      ->orWhereHas('offers', fn($off) => $off->where('is_off_campus', true));
                })
                ->count();

            $participationRate = $eligibleCount > 0 ? round(($participatingCount / $eligibleCount) * 100, 2) : 0.0;

            $placedStudents = (clone $eligibleQuery)
                ->whereHas('offers', function ($q) {
                    $q->where('verification_status', 'VERIFIED')
                      ->whereIn('status', ['ACCEPTED', 'JOINED']);
                })
                ->with(['offers' => function ($q) {
                    $q->where('verification_status', 'VERIFIED')
                      ->whereIn('status', ['ACCEPTED', 'JOINED']);
                }])
                ->get();

            $placedCount = $placedStudents->count();
            $placementRate = $eligibleCount > 0 ? round(($placedCount / $eligibleCount) * 100, 2) : 0.0;
            $unplacedCount = max(0, $eligibleCount - $placedCount);

            // Primary CTCs for placed students in this branch
            $primaryCtcs = [];
            $unspecifiedCount = 0;
            foreach ($placedStudents as $st) {
                $primary = $this->selectPrimaryOffer($st->offers);
                if ($primary) {
                    if ($primary->ctc !== null && (float)$primary->ctc > 0) {
                        $primaryCtcs[] = (float) $primary->ctc;
                    } else {
                        $unspecifiedCount++;
                    }
                }
            }

            $highestCtc = !empty($primaryCtcs) ? round(max($primaryCtcs), 2) : null;
            $averageCtc = $this->calculateAverage($primaryCtcs);
            $medianCtc = $this->calculateMedian($primaryCtcs);

            $result[] = [
                'branch' => $branch,
                'total_students' => $totalCount,
                'eligible_students' => $eligibleCount,
                'participating_students' => $participatingCount,
                'participation_rate' => $participationRate,
                'placed_students' => $placedCount,
                'placement_rate' => $placementRate,
                'unplaced_students' => $unplacedCount,
                'placed_students_with_unspecified_compensation' => $unspecifiedCount,
                'highest_ctc' => $highestCtc,
                'average_ctc' => $averageCtc,
                'median_ctc' => $medianCtc,
            ];
        }

        usort($result, fn($a, $b) => strcmp($a['branch'], $b['branch']));

        return [
            'currency' => 'INR',
            'unit' => 'LPA',
            'graduation_year_filter' => $graduationYear,
            'branches' => $result,
        ];
    }

    /**
     * 4. Academic Year Trends
     */
    public function getAcademicYearTrends(?string $branch = null): array
    {
        $baseQuery = $this->modelQuery(Student::class);
        if ($branch !== null) {
            $baseQuery->where('branch', $branch);
        }

        $years = (clone $baseQuery)->distinct()->pluck('graduation_year')->filter()->sort()->values();

        $result = [];
        foreach ($years as $year) {
            $yearTotalQuery = (clone $baseQuery)->where('graduation_year', $year);
            $totalCount = (clone $yearTotalQuery)->count();

            $eligibleQuery = (clone $yearTotalQuery)
                ->where('backlogs_current', 0)
                ->where('cgpa', '>=', 6.0);
            $eligibleCount = (clone $eligibleQuery)->count();

            $participatingCount = (clone $eligibleQuery)
                ->where(function ($q) {
                    $q->whereHas('driveCandidates', fn($dc) => $dc->where('status', '!=', 'WITHDRAWN'))
                      ->orWhereHas('offers', fn($off) => $off->where('is_off_campus', true));
                })
                ->count();

            $participationRate = $eligibleCount > 0 ? round(($participatingCount / $eligibleCount) * 100, 2) : 0.0;

            $placedStudents = (clone $eligibleQuery)
                ->whereHas('offers', function ($q) {
                    $q->where('verification_status', 'VERIFIED')
                      ->whereIn('status', ['ACCEPTED', 'JOINED']);
                })
                ->with(['offers' => function ($q) {
                    $q->where('verification_status', 'VERIFIED')
                      ->whereIn('status', ['ACCEPTED', 'JOINED']);
                }])
                ->get();

            $placedCount = $placedStudents->count();
            $placementRate = $eligibleCount > 0 ? round(($placedCount / $eligibleCount) * 100, 2) : 0.0;
            $unplacedCount = max(0, $eligibleCount - $placedCount);

            $primaryCtcs = [];
            $unspecifiedCount = 0;
            foreach ($placedStudents as $st) {
                $primary = $this->selectPrimaryOffer($st->offers);
                if ($primary) {
                    if ($primary->ctc !== null && (float)$primary->ctc > 0) {
                        $primaryCtcs[] = (float) $primary->ctc;
                    } else {
                        $unspecifiedCount++;
                    }
                }
            }

            $highestCtc = !empty($primaryCtcs) ? round(max($primaryCtcs), 2) : null;
            $averageCtc = $this->calculateAverage($primaryCtcs);
            $medianCtc = $this->calculateMedian($primaryCtcs);

            $result[] = [
                'graduation_year' => $year,
                'total_students' => $totalCount,
                'eligible_students' => $eligibleCount,
                'participating_students' => $participatingCount,
                'participation_rate' => $participationRate,
                'placed_students' => $placedCount,
                'placement_rate' => $placementRate,
                'unplaced_students' => $unplacedCount,
                'placed_students_with_unspecified_compensation' => $unspecifiedCount,
                'highest_ctc' => $highestCtc,
                'average_ctc' => $averageCtc,
                'median_ctc' => $medianCtc,
            ];
        }

        return [
            'currency' => 'INR',
            'unit' => 'LPA',
            'branch_filter' => $branch,
            'trends' => $result,
        ];
    }

    /**
     * 5. Drive Metrics Listing
     */
    public function getDriveMetrics(?int $graduationYear = null, ?string $status = null, int $perPage = 15, int $page = 1): array
    {
        $query = $this->modelQuery(PlacementDrive::class)
            ->with(['company', 'job', 'rounds'])
            ->orderBy('created_at', 'desc');

        if ($status !== null) {
            $query->where('status', $status);
        }

        if ($graduationYear !== null) {
            $query->whereHas('candidates.student', function ($sq) use ($graduationYear) {
                $sq->where('graduation_year', $graduationYear);
            });
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        $items = collect($paginated->items())->map(function ($drive) use ($graduationYear) {
            $candidatesQuery = $drive->candidates();
            if ($graduationYear !== null) {
                $candidatesQuery->whereHas('student', fn($sq) => $sq->where('graduation_year', $graduationYear));
            }

            $activeCandidatesCount = (clone $candidatesQuery)->where('status', '!=', 'WITHDRAWN')->count();
            $withdrawnCandidatesCount = (clone $candidatesQuery)->where('status', 'WITHDRAWN')->count();

            $offersQuery = $this->modelQuery(Offer::class)->where('placement_drive_id', $drive->id);
            if ($graduationYear !== null) {
                $offersQuery->whereHas('student', fn($sq) => $sq->where('graduation_year', $graduationYear));
            }

            $formallyIssuedCount = (clone $offersQuery)
                ->whereIn('status', self::FORMALLY_ISSUED_STATUSES)
                ->count();

            $verifiedOffers = (clone $offersQuery)
                ->where('verification_status', 'VERIFIED')
                ->whereIn('status', ['ACCEPTED', 'JOINED'])
                ->get();

            $verifiedOffersCount = $verifiedOffers->count();
            $ctcs = $verifiedOffers->whereNotNull('ctc')
                ->filter(fn($o) => (float)$o->ctc > 0)
                ->pluck('ctc')
                ->map(fn($v) => (float)$v)
                ->all();

            $highestCtc = !empty($ctcs) ? round(max($ctcs), 2) : null;
            $averageCtc = $this->calculateAverage($ctcs);
            $medianCtc = $this->calculateMedian($ctcs);

            return [
                'id' => $drive->id,
                'name' => $drive->name,
                'company_name' => $drive->company?->name ?? 'Unknown Company',
                'job_title' => $drive->job?->title ?? 'N/A',
                'status' => is_object($drive->status) ? $drive->status->value : $drive->status,
                'start_date' => $drive->start_date?->toISOString(),
                'end_date' => $drive->end_date?->toISOString(),
                'active_candidates_count' => $activeCandidatesCount,
                'withdrawn_candidates_count' => $withdrawnCandidatesCount,
                'total_rounds_count' => $drive->rounds->count(),
                'formally_issued_offers_count' => $formallyIssuedCount,
                'verified_placed_offers_count' => $verifiedOffersCount,
                'highest_ctc' => $highestCtc,
                'average_ctc' => $averageCtc,
                'median_ctc' => $medianCtc,
            ];
        });

        return [
            'currency' => 'INR',
            'unit' => 'LPA',
            'data' => $items->all(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
        ];
    }

    /**
     * 6. Detailed Drive Metrics
     */
    public function getDriveDetailMetrics(int $driveId): array
    {
        $drive = $this->modelQuery(PlacementDrive::class)
            ->with(['company', 'job', 'rounds' => fn($q) => $q->orderBy('round_number', 'asc'), 'venue'])
            ->findOrFail($driveId);

        $candidates = $this->modelQuery(DriveCandidate::class)->where('drive_id', $driveId)->get();
        $totalCandidates = $candidates->count();
        $activeCandidates = $candidates->where('status', '!=', 'WITHDRAWN')->count();
        $withdrawnCandidates = $candidates->where('status', 'WITHDRAWN')->count();
        $rejectedCandidates = $candidates->where('status', 'REJECTED')->count();
        $shortlistedCandidates = $candidates->where('status', 'SHORTLISTED')->count();
        $interviewingCandidates = $candidates->where('status', 'INTERVIEWING')->count();
        $offeredCandidates = $candidates->filter(function ($c) {
            $s = is_object($c->status) ? $c->status->value : $c->status;
            return in_array($s, ['OFFERED', 'OFFER_ACCEPTED', 'OFFER_REJECTED'], true);
        })->count();

        // Round progression breakdown
        $roundsBreakdown = $drive->rounds->map(function ($round) use ($candidates) {
            $appearedOrProgressed = $candidates->filter(function ($c) use ($round) {
                return ($c->current_round_number ?? 0) >= $round->round_number;
            })->count();

            return [
                'round_number' => $round->round_number,
                'name' => $round->name,
                'round_type' => $round->round_type,
                'status' => $round->status,
                'capacity' => $round->capacity,
                'candidates_appeared_or_progressed' => $appearedOrProgressed,
            ];
        });

        // Offers summary
        $offers = $this->modelQuery(Offer::class)->where('placement_drive_id', $driveId)->get();
        $formallyIssued = $offers->filter(function ($o) {
            $s = is_object($o->status) ? $o->status->value : $o->status;
            return in_array($s, self::FORMALLY_ISSUED_STATUSES, true);
        });

        $statusBreakdown = [
            'PENDING' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'PENDING')->count(),
            'ACCEPTED' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'ACCEPTED')->count(),
            'DECLINED' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'DECLINED')->count(),
            'REJECTED' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'REJECTED')->count(),
            'DEFERRED' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'DEFERRED')->count(),
            'JOINED' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'JOINED')->count(),
            'WITHDRAWN' => $offers->filter(fn($o) => (is_object($o->status) ? $o->status->value : $o->status) === 'WITHDRAWN')->count(),
        ];

        $verificationBreakdown = [
            'VERIFIED' => $offers->filter(fn($o) => (is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status) === 'VERIFIED')->count(),
            'PENDING_VERIFICATION' => $offers->filter(fn($o) => (is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status) === 'PENDING_VERIFICATION')->count(),
            'UNDER_REVIEW' => $offers->filter(fn($o) => (is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status) === 'UNDER_REVIEW')->count(),
            'NEEDS_ADDITIONAL_INFO' => $offers->filter(fn($o) => (is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status) === 'NEEDS_ADDITIONAL_INFO')->count(),
            'REJECTED' => $offers->filter(fn($o) => (is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status) === 'REJECTED')->count(),
        ];

        $verifiedPlacedOffers = $offers->filter(function ($o) {
            $v = is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status;
            $s = is_object($o->status) ? $o->status->value : $o->status;
            return $v === 'VERIFIED' && in_array($s, ['ACCEPTED', 'JOINED'], true);
        });

        $ctcs = $verifiedPlacedOffers->whereNotNull('ctc')
            ->filter(fn($o) => (float)$o->ctc > 0)
            ->pluck('ctc')
            ->map(fn($v) => (float)$v)
            ->all();

        return [
            'drive' => [
                'id' => $drive->id,
                'name' => $drive->name,
                'company_name' => $drive->company?->name ?? 'Unknown Company',
                'job_title' => $drive->job?->title ?? 'N/A',
                'status' => is_object($drive->status) ? $drive->status->value : $drive->status,
                'start_date' => $drive->start_date?->toISOString(),
                'end_date' => $drive->end_date?->toISOString(),
                'venue' => $drive->venue?->name ?? $drive->venue_name ?? 'N/A',
            ],
            'candidates_summary' => [
                'total_applications' => $totalCandidates,
                'active_candidates' => $activeCandidates,
                'withdrawn_candidates' => $withdrawnCandidates,
                'shortlisted_candidates' => $shortlistedCandidates,
                'interviewing_candidates' => $interviewingCandidates,
                'offered_candidates' => $offeredCandidates,
                'rejected_candidates' => $rejectedCandidates,
            ],
            'rounds_breakdown' => $roundsBreakdown->all(),
            'offers_summary' => [
                'total_offers' => $offers->count(),
                'formally_issued_count' => $formallyIssued->count(),
                'by_status' => $statusBreakdown,
                'by_verification_status' => $verificationBreakdown,
            ],
            'compensation' => [
                'currency' => 'INR',
                'unit' => 'LPA',
                'verified_placed_offers_count' => $verifiedPlacedOffers->count(),
                'highest_ctc' => !empty($ctcs) ? round(max($ctcs), 2) : null,
                'lowest_ctc' => !empty($ctcs) ? round(min($ctcs), 2) : null,
                'average_ctc' => $this->calculateAverage($ctcs),
                'median_ctc' => $this->calculateMedian($ctcs),
            ],
        ];
    }

    /**
     * 7. Interview Metrics & Tracking Limitations
     */
    public function getInterviewMetrics(?int $graduationYear = null, ?int $driveId = null): array
    {
        $scheduleQuery = $this->modelQuery(DriveSchedule::class);
        if ($driveId !== null) {
            $scheduleQuery->where('drive_id', $driveId);
        }
        if ($graduationYear !== null) {
            $scheduleQuery->whereHas('student', fn($sq) => $sq->where('graduation_year', $graduationYear));
        }
        $scheduledInterviewsCount = $scheduleQuery->count();

        // Candidates reaching interview stage
        $candidatesQuery = $this->modelQuery(DriveCandidate::class)->where('status', '!=', 'WITHDRAWN');
        if ($driveId !== null) {
            $candidatesQuery->where('drive_id', $driveId);
        }
        if ($graduationYear !== null) {
            $candidatesQuery->whereHas('student', fn($sq) => $sq->where('graduation_year', $graduationYear));
        }
        $reachedInterviewStageCount = (clone $candidatesQuery)
            ->where(function ($q) {
                $q->where('current_round_number', '>', 1)
                  ->orWhereIn('status', [
                      'SHORTLISTED',
                      'INTERVIEWING',
                      'OFFERED',
                      'OFFER_ACCEPTED',
                      'OFFER_REJECTED',
                      'JOINED'
                  ]);
            })
            ->distinct('student_id')
            ->count('student_id');

        // Completed round evaluations from drive_candidates.round_results JSON
        $candidatesWithResults = (clone $candidatesQuery)->whereNotNull('round_results')->get();
        $completedRoundEvaluationsCount = 0;
        foreach ($candidatesWithResults as $cand) {
            $results = is_array($cand->round_results) ? $cand->round_results : json_decode($cand->round_results, true);
            if (is_array($results)) {
                foreach ($results as $r) {
                    if (isset($r['result']) && in_array($r['result'], ['PASSED', 'FAILED'], true)) {
                        $completedRoundEvaluationsCount++;
                    }
                }
            }
        }

        // AI Mock Interview Sessions
        $aiSessionQuery = $this->modelQuery(AiInterviewSession::class)->where('status', 'COMPLETED');
        if ($graduationYear !== null) {
            $aiSessionQuery->whereHas('student', fn($sq) => $sq->where('graduation_year', $graduationYear));
        }
        if ($driveId !== null) {
            $aiSessionQuery->whereHas('aiInterview', fn($ai) => $ai->where('drive_id', $driveId));
        }

        $aiCompletedCount = (clone $aiSessionQuery)->count();
        $aiAverageScore = $aiCompletedCount > 0
            ? round((float)(clone $aiSessionQuery)->avg('total_score'), 2)
            : null;

        // Rounds breakdown by round_type
        $roundsQuery = $this->modelQuery(DriveRound::class);
        if ($driveId !== null) {
            $roundsQuery->where('drive_id', $driveId);
        }
        $roundsByType = (clone $roundsQuery)
            ->select('round_type', DB::raw('count(*) as count'))
            ->groupBy('round_type')
            ->pluck('count', 'round_type')
            ->all();

        return [
            'attendance_tracking' => 'UNAVAILABLE',
            'limitation_note' => 'Physical candidate interview attendance tracking is not persisted in the database schema; scheduled interviews and round results reflect scheduling and evaluations only.',
            'scheduled_interviews_count' => $scheduledInterviewsCount,
            'candidates_reached_interview_stage_count' => $reachedInterviewStageCount,
            'completed_round_evaluations_count' => $completedRoundEvaluationsCount,
            'ai_mock_interviews_completed_count' => $aiCompletedCount,
            'ai_mock_interviews_average_score' => $aiAverageScore,
            'drive_rounds_breakdown_by_type' => $roundsByType,
            'filters_applied' => [
                'graduation_year' => $graduationYear,
                'drive_id' => $driveId,
            ],
        ];
    }

    /**
     * 8. Compensation Analytics
     */
    public function getCompensationAnalytics(?int $graduationYear = null, ?string $branch = null): array
    {
        $eligibleQuery = $this->modelQuery(Student::class)
            ->where('backlogs_current', 0)
            ->where('cgpa', '>=', 6.0);
        if ($graduationYear !== null) {
            $eligibleQuery->where('graduation_year', $graduationYear);
        }
        if ($branch !== null) {
            $eligibleQuery->where('branch', $branch);
        }

        $placedStudents = (clone $eligibleQuery)
            ->whereHas('offers', function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            })
            ->with(['offers' => function ($q) {
                $q->where('verification_status', 'VERIFIED')
                  ->whereIn('status', ['ACCEPTED', 'JOINED']);
            }])
            ->get();

        // 1. Student-level primary compensation: select primary offer first, then evaluate CTC
        $primaryCtcs = [];
        $unspecifiedCompensationCount = 0;
        foreach ($placedStudents as $student) {
            $primary = $this->selectPrimaryOffer($student->offers);
            if ($primary) {
                if ($primary->ctc !== null && (float)$primary->ctc > 0) {
                    $primaryCtcs[] = (float) $primary->ctc;
                } else {
                    $unspecifiedCompensationCount++;
                }
            }
        }

        $studentHighest = !empty($primaryCtcs) ? round(max($primaryCtcs), 2) : null;
        $studentLowest = !empty($primaryCtcs) ? round(min($primaryCtcs), 2) : null;
        $studentAverage = $this->calculateAverage($primaryCtcs);
        $studentMedian = $this->calculateMedian($primaryCtcs);
        $studentBrackets = $this->computeCtcBrackets($primaryCtcs);

        // 2. Offer-level gross compensation
        $eligibleStudentIdsSub = (clone $eligibleQuery)->select('id');
        $allCohortOffers = $this->modelQuery(Offer::class)
            ->whereIn('student_id', $eligibleStudentIdsSub)
            ->get();

        $qualifyingOffers = $allCohortOffers->filter(function ($offer) {
            $v = is_object($offer->verification_status) ? $offer->verification_status->value : $offer->verification_status;
            $s = is_object($offer->status) ? $offer->status->value : $offer->status;
            return $v === 'VERIFIED' && in_array($s, ['ACCEPTED', 'JOINED'], true) && $offer->ctc !== null && (float)$offer->ctc > 0;
        });

        $offerCtcs = $qualifyingOffers->pluck('ctc')->map(fn($c) => (float)$c)->all();

        $offerHighest = !empty($offerCtcs) ? round(max($offerCtcs), 2) : null;
        $offerLowest = !empty($offerCtcs) ? round(min($offerCtcs), 2) : null;
        $offerAverage = $this->calculateAverage($offerCtcs);
        $offerMedian = $this->calculateMedian($offerCtcs);
        $offerBrackets = $this->computeCtcBrackets($offerCtcs);

        // Exclusions tracking
        $unverifiedExcluded = $allCohortOffers->filter(function ($o) {
            $v = is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status;
            return $v !== 'VERIFIED';
        })->count();

        $nonAcceptedJoinedExcluded = $allCohortOffers->filter(function ($o) {
            $v = is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status;
            $s = is_object($o->status) ? $o->status->value : $o->status;
            return $v === 'VERIFIED' && !in_array($s, ['ACCEPTED', 'JOINED'], true);
        })->count();

        $zeroOrNullCtcExcluded = $allCohortOffers->filter(function ($o) {
            $v = is_object($o->verification_status) ? $o->verification_status->value : $o->verification_status;
            $s = is_object($o->status) ? $o->status->value : $o->status;
            return $v === 'VERIFIED' && in_array($s, ['ACCEPTED', 'JOINED'], true) && ($o->ctc === null || (float)$o->ctc <= 0);
        })->count();

        return [
            'currency' => 'INR',
            'unit' => 'LPA',
            'student_level_primary' => [
                'placed_students_count' => $placedStudents->count(),
                'placed_students_with_valid_compensation' => count($primaryCtcs),
                'placed_students_with_unspecified_compensation' => $unspecifiedCompensationCount,
                'highest_ctc' => $studentHighest,
                'lowest_ctc' => $studentLowest,
                'average_ctc' => $studentAverage,
                'median_ctc' => $studentMedian,
                'brackets' => $studentBrackets,
            ],
            'offer_level_gross' => [
                'total_verified_offers' => count($offerCtcs),
                'highest_ctc' => $offerHighest,
                'lowest_ctc' => $offerLowest,
                'average_ctc' => $offerAverage,
                'median_ctc' => $offerMedian,
                'brackets' => $offerBrackets,
            ],
            'exclusions' => [
                'unverified_or_pending_offers_excluded_count' => $unverifiedExcluded,
                'non_accepted_or_joined_offers_excluded_count' => $nonAcceptedJoinedExcluded,
                'zero_or_null_ctc_offers_excluded_count' => $zeroOrNullCtcExcluded,
            ],
            'filters_applied' => [
                'graduation_year' => $graduationYear,
                'branch' => $branch,
            ],
        ];
    }

    /**
     * Deterministic tie-breaker for primary placement offer:
     * 1. JOINED before ACCEPTED
     * 2. Latest acceptance_date
     * 3. Highest ctc
     * 4. Lowest offer id
     */
    public function selectPrimaryOffer($offers): ?Offer
    {
        if (empty($offers) || (is_countable($offers) && count($offers) === 0)) {
            return null;
        }

        $collection = $offers instanceof Collection ? $offers : collect($offers);

        // Filter to only verified and accepted/joined
        $qualifying = $collection->filter(function ($offer) {
            $verifStatus = is_object($offer->verification_status) ? $offer->verification_status->value : $offer->verification_status;
            $status = is_object($offer->status) ? $offer->status->value : $offer->status;
            return $verifStatus === 'VERIFIED' && in_array($status, ['ACCEPTED', 'JOINED'], true);
        });

        if ($qualifying->isEmpty()) {
            return null;
        }

        return $qualifying->sort(function ($a, $b) {
            $statusA = is_object($a->status) ? $a->status->value : $a->status;
            $statusB = is_object($b->status) ? $b->status->value : $b->status;

            // 1. JOINED before ACCEPTED
            $statusRankA = ($statusA === 'JOINED') ? 1 : 0;
            $statusRankB = ($statusB === 'JOINED') ? 1 : 0;
            if ($statusRankA !== $statusRankB) {
                return $statusRankB <=> $statusRankA;
            }

            // 2. Latest acceptance_date
            $dateA = $a->acceptance_date ? Carbon::parse($a->acceptance_date)->timestamp : 0;
            $dateB = $b->acceptance_date ? Carbon::parse($b->acceptance_date)->timestamp : 0;
            if ($dateA !== $dateB) {
                return $dateB <=> $dateA;
            }

            // 3. Highest ctc
            $ctcA = (float) ($a->ctc ?? 0);
            $ctcB = (float) ($b->ctc ?? 0);
            if ($ctcA != $ctcB) {
                return $ctcB <=> $ctcA;
            }

            // 4. Lowest id
            return $a->id <=> $b->id;
        })->first();
    }

    /**
     * Decimal-safe average calculation using BCMath with scaled-integer fallback.
     */
    public function calculateAverage(array $values): ?float
    {
        $valid = array_values(array_filter($values, fn($v) => is_numeric($v) && (float)$v > 0));
        if (empty($valid)) {
            return null;
        }

        if (function_exists('bcadd') && function_exists('bcdiv')) {
            $sum = '0.0000';
            foreach ($valid as $v) {
                $sum = bcadd($sum, number_format((float)$v, 4, '.', ''), 4);
            }
            $avg = bcdiv($sum, (string) count($valid), 4);
            return round((float) $avg, 2);
        }

        // Scaled-integer calculation in hundredths of a thousandth (10^-4)
        $sumScaled = 0;
        foreach ($valid as $v) {
            $sumScaled += (int) round(((float)$v) * 10000);
        }
        return round(($sumScaled / count($valid)) / 10000, 2);
    }

    /**
     * Decimal-safe median calculation using BCMath with scaled-integer fallback.
     */
    public function calculateMedian(array $values): ?float
    {
        $valid = array_values(array_filter($values, fn($v) => is_numeric($v) && (float)$v > 0));
        if (empty($valid)) {
            return null;
        }

        usort($valid, fn($a, $b) => (float)$a <=> (float)$b);
        $count = count($valid);
        $middle = (int) floor($count / 2);

        if ($count % 2 === 1) {
            return round((float) $valid[$middle], 2);
        }

        // Even dataset: average of two middle values
        $v1 = (float) $valid[$middle - 1];
        $v2 = (float) $valid[$middle];

        if (function_exists('bcadd') && function_exists('bcdiv')) {
            $sum = bcadd(
                number_format($v1, 4, '.', ''),
                number_format($v2, 4, '.', ''),
                4
            );
            $avg = bcdiv($sum, '2.0000', 4);
            return round((float) $avg, 2);
        }

        $scaled1 = (int) round($v1 * 10000);
        $scaled2 = (int) round($v2 * 10000);
        return round((($scaled1 + $scaled2) / 20000), 2);
    }

    /**
     * Compute LPA compensation distribution brackets.
     */
    protected function computeCtcBrackets(array $ctcs): array
    {
        $brackets = [
            'below_5_lpa' => 0,
            '5_to_10_lpa' => 0,
            '10_to_20_lpa' => 0,
            'above_20_lpa' => 0,
        ];

        foreach ($ctcs as $ctc) {
            $val = (float) $ctc;
            if ($val < 5.0) {
                $brackets['below_5_lpa']++;
            } elseif ($val <= 10.0) {
                $brackets['5_to_10_lpa']++;
            } elseif ($val <= 20.0) {
                $brackets['10_to_20_lpa']++;
            } else {
                $brackets['above_20_lpa']++;
            }
        }

        return $brackets;
    }
}
