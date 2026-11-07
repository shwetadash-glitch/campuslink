<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Analytics\InstitutionalAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InstitutionalAnalyticsController extends Controller
{
    public function __construct(
        protected InstitutionalAnalyticsService $analyticsService
    ) {}

    /**
     * Ensure actor has officer or admin privileges.
     */
    protected function authorizeAccess(Request $request): ?JsonResponse
    {
        $role = $request->user()?->role?->value ?? (string) $request->user()?->role;
        if (!in_array($role, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Institutional analytics is restricted to Placement Officers and Super Admins.',
            ], 403);
        }
        return null;
    }

    /**
     * 1. Institutional Placement Overview
     */
    public function overview(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
            'branch' => 'nullable|string|max:100',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;
        $branch = $validated['branch'] ?? null;

        $data = $this->analyticsService->getOverview($year, $branch);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 2. Placement Funnel
     */
    public function funnel(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
            'branch' => 'nullable|string|max:100',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;
        $branch = $validated['branch'] ?? null;

        $data = $this->analyticsService->getPlacementFunnel($year, $branch);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 3. Branch Comparison
     */
    public function branchComparison(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;

        $data = $this->analyticsService->getBranchComparison($year);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 4. Academic Year Trends
     */
    public function trends(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'branch' => 'nullable|string|max:100',
        ]);

        $branch = $validated['branch'] ?? null;

        $data = $this->analyticsService->getAcademicYearTrends($branch);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 5. Drive Metrics Listing
     */
    public function drives(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
            'status' => 'nullable|string|max:50',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;
        $status = $validated['status'] ?? null;
        $perPage = isset($validated['per_page']) ? (int) $validated['per_page'] : 15;
        $page = isset($validated['page']) ? (int) $validated['page'] : 1;

        $data = $this->analyticsService->getDriveMetrics($year, $status, $perPage, $page);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 6. Detailed Drive Metrics
     */
    public function driveDetail(Request $request, int $id): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $data = $this->analyticsService->getDriveDetailMetrics($id);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 7. Interview Metrics & Tracking Limitations
     */
    public function interviews(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
            'drive_id' => 'nullable|integer|exists:placement_drives,id',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;
        $driveId = isset($validated['drive_id']) ? (int) $validated['drive_id'] : null;

        $data = $this->analyticsService->getInterviewMetrics($year, $driveId);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * 8. Compensation Analytics
     */
    public function compensation(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeAccess($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'graduation_year' => 'nullable|integer|min:2000|max:2100',
            'branch' => 'nullable|string|max:100',
        ]);

        $year = isset($validated['graduation_year']) ? (int) $validated['graduation_year'] : null;
        $branch = $validated['branch'] ?? null;

        $data = $this->analyticsService->getCompensationAnalytics($year, $branch);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }
}
