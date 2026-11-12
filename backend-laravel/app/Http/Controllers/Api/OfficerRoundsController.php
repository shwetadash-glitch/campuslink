<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PlacementDrive;
use App\Services\DriveRoundsService;

class OfficerRoundsController extends Controller
{
    protected DriveRoundsService $roundsService;

    public function __construct(DriveRoundsService $roundsService)
    {
        $this->roundsService = $roundsService;
    }

    /**
     * Get complete multi-round pipeline for a placement drive.
     */
    public function getPipeline(Request $request, $driveId)
    {
        $drive = PlacementDrive::with(['company', 'job.company', 'job.requirements.skill'])->find($driveId);
        if (!$drive) {
            return response()->json(['error' => 'Drive not found'], 404);
        }

        try {
            $pipeline = $this->roundsService->getDrivePipeline($drive);
            return response()->json($pipeline);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Advance qualified candidates to the next round.
     */
    public function advanceCandidates(Request $request, $driveId)
    {
        $drive = PlacementDrive::findOrFail($driveId);

        $validated = $request->validate([
            'from_round' => 'required|integer|min:1|max:3',
            'to_round' => 'required|integer|min:2|max:4',
            'candidate_ids' => 'nullable|array',
            'candidate_ids.*' => 'integer|exists:drive_candidates,id',
        ]);

        $result = $this->roundsService->advanceCandidates(
            $drive,
            $validated['from_round'],
            $validated['to_round'],
            $validated['candidate_ids'] ?? null
        );

        return response()->json($result);
    }

    /**
     * Explicit TPO Action: Dispatch technical assessment to shortlisted candidates.
     */
    public function dispatchQuiz(Request $request, $driveId)
    {
        $drive = PlacementDrive::findOrFail($driveId);

        $validated = $request->validate([
            'candidate_ids' => 'nullable|array',
            'candidate_ids.*' => 'integer|exists:drive_candidates,id',
        ]);

        $result = $this->roundsService->dispatchQuiz($drive, $validated['candidate_ids'] ?? null);

        return response()->json($result);
    }

    /**
     * Record technical quiz evaluation for a candidate.
     */
    public function submitQuiz(Request $request, $driveId)
    {
        $drive = PlacementDrive::findOrFail($driveId);

        $validated = $request->validate([
            'candidate_id' => 'required|integer|exists:drive_candidates,id',
            'score' => 'required|numeric|min:0|max:100',
            'skill_breakdown' => 'nullable|array',
            'correct_answers' => 'nullable|integer',
            'notes' => 'nullable|string|max:500',
        ]);

        $cand = $this->roundsService->recordCandidateQuiz($drive, $validated['candidate_id'], $validated);

        return response()->json([
            'success' => true,
            'message' => 'Technical quiz score successfully recorded.',
            'candidate_id' => $cand->id,
            'round_results' => $cand->round_results,
        ]);
    }

    /**
     * Record Group Discussion (GD) evaluation for a candidate.
     */
    public function submitGd(Request $request, $driveId)
    {
        $drive = PlacementDrive::findOrFail($driveId);

        $validated = $request->validate([
            'candidate_id' => 'required|integer|exists:drive_candidates,id',
            'technical_depth' => 'required|integer|min:0|max:25',
            'communication' => 'required|integer|min:0|max:25',
            'critical_thinking' => 'required|integer|min:0|max:25',
            'leadership' => 'required|integer|min:0|max:25',
            'topic' => 'nullable|string|max:255',
            'decision' => 'required|string|in:SELECTED,WAITLISTED,NOT_RECOMMENDED',
            'remarks' => 'nullable|string|max:500',
        ]);

        $cand = $this->roundsService->recordCandidateGd($drive, $validated['candidate_id'], $validated);

        return response()->json([
            'success' => true,
            'message' => 'Group Discussion evaluation recorded.',
            'candidate_id' => $cand->id,
            'round_results' => $cand->round_results,
        ]);
    }

    /**
     * Export complete multi-round shortlist to CSV/Excel.
     */
    public function exportCsv(Request $request, $driveId)
    {
        $drive = PlacementDrive::with(['company', 'job.company', 'job.requirements.skill'])->findOrFail($driveId);

        $csv = $this->roundsService->generateCsvExport($drive);
        $filename = "Placement_Drive_{$driveId}_" . str_replace(' ', '_', $drive->name) . "_Rounds_Report.csv";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }
}
