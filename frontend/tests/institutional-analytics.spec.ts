import { test, expect } from "@playwright/test";

test.describe("Milestone 8 Stage 4/5: Institutional Placement Analytics Telemetry", () => {
  test("1. Unauthenticated request is redirected to /login by ProtectedRoute", async ({ page }) => {
    await page.goto("/dashboard/tpo/analytics");
    // Verify client-side auth guard redirects to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("2. Authenticated Placement Officer dashboard layout and tab navigation", async ({ page }) => {
    // 1. Mock Auth session
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "synthetic_tpo_test_token");
      localStorage.setItem("token", "synthetic_tpo_test_token");
    });

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 101,
            email: "tpo_audit@campuslink.edu",
            role: "PLACEMENT_OFFICER",
            is_active: true,
          },
        }),
      });
    });

    // 2. Mock Analytics APIs
    await page.route("**/api/v1/tpo/analytics/overview*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            cohort: {
              total_students: 500,
              eligible_students: 400,
              ineligible_students: 100,
              ineligibility_breakdown: { backlog_ineligible: 50, cgpa_ineligible: 30, both_ineligible: 20 },
            },
            participation: {
              participating_students: 350,
              participation_rate: 87.5,
              gross_applications: 1200,
              formally_issued_offers: 450,
            },
            placement: {
              placed_students: 320,
              placement_rate: 80.0,
              unplaced_students: 80,
              unplaced_rate: 20.0,
            },
            placements_outside_baseline_eligibility: {
              total_count: 15,
              special_clearance_association: "UNAVAILABLE",
              special_clearance_limitation_note: "Individual student placement eligibility exception records are not persisted in the database schema; emergency_clearances tracks institutional event scheduling conflict overrides only.",
              note: "Reported separately; not included in eligible cohort placement rate numerator or denominator.",
            },
            compensation: {
              currency: "INR",
              unit: "LPA",
              student_level_primary: {
                placed_students_count: 320,
                placed_students_evaluated: 310,
                placed_students_with_unspecified_compensation: 10,
                highest_ctc: 45.0,
                lowest_ctc: 4.5,
                average_ctc: 12.5,
                median_ctc: 10.0,
              },
              offer_level_gross: {
                verified_offers_evaluated: 400,
                highest_ctc: 45.0,
                lowest_ctc: 4.0,
                average_ctc: 11.8,
                median_ctc: 9.5,
              },
            },
            filters_applied: { graduation_year: null, branch: null },
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/funnel*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            stages: [
              { stage: "total_cohort", label: "Total Enrolled Cohort", count: 500, conversion_rate: 100.0 },
              { stage: "eligible_cohort", label: "Baseline Eligible Cohort", count: 400, conversion_rate: 80.0 },
              { stage: "participating", label: "Active Participation", count: 350, conversion_rate: 87.5 },
              { stage: "interview_stage", label: "Reached Interview / Assessment Stage", count: 300, conversion_rate: 85.7 },
              { stage: "offered", label: "Received Formal Offer(s)", count: 250, conversion_rate: 83.3 },
              { stage: "verified_placed", label: "Verified Institutional Placement", count: 220, conversion_rate: 88.0, overall_placement_rate: 55.0 },
            ],
            filters_applied: { graduation_year: null, branch: null },
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/branch-comparison*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            currency: "INR",
            unit: "LPA",
            graduation_year_filter: null,
            branches: [
              {
                branch: "Computer Science and Engineering",
                total_students: 200,
                eligible_students: 180,
                participating_students: 175,
                participation_rate: 97.2,
                placed_students: 160,
                placement_rate: 88.9,
                unplaced_students: 20,
                placed_students_with_unspecified_compensation: 5,
                highest_ctc: 45.0,
                average_ctc: 15.2,
                median_ctc: 12.0,
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/trends*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            currency: "INR",
            unit: "LPA",
            branch_filter: null,
            trends: [
              {
                graduation_year: 2026,
                total_students: 500,
                eligible_students: 400,
                participating_students: 350,
                participation_rate: 87.5,
                placed_students: 320,
                placement_rate: 80.0,
                unplaced_students: 80,
                placed_students_with_unspecified_compensation: 10,
                highest_ctc: 45.0,
                average_ctc: 12.5,
                median_ctc: 10.0,
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/drives*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            currency: "INR",
            unit: "LPA",
            data: [
              {
                id: 1,
                name: "Alpha Tech Campus Drive",
                company_name: "Alpha Technologies",
                job_title: "Full Stack Engineer",
                status: "COMPLETED",
                start_date: "2026-10-01T09:00:00Z",
                end_date: "2026-10-02T18:00:00Z",
                active_candidates_count: 85,
                withdrawn_candidates_count: 5,
                total_rounds_count: 3,
                formally_issued_offers_count: 20,
                verified_placed_offers_count: 18,
                highest_ctc: 24.0,
                average_ctc: 16.5,
                median_ctc: 15.0,
              },
            ],
            pagination: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/interviews*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            attendance_tracking: "UNAVAILABLE",
            limitation_note: "Physical candidate interview attendance tracking is not persisted in the database schema; scheduled interviews and round results reflect scheduling and evaluations only.",
            scheduled_interviews_count: 450,
            candidates_reached_interview_stage_count: 280,
            completed_round_evaluations_count: 380,
            ai_mock_interviews_completed_count: 125,
            ai_mock_interviews_average_score: 82.5,
            drive_rounds_breakdown_by_type: {
              ONLINE_ASSESSMENT: 12,
              TECHNICAL_INTERVIEW: 15,
              HR_INTERVIEW: 8,
            },
            filters_applied: { graduation_year: null, drive_id: null },
          },
        }),
      });
    });

    await page.route("**/api/v1/tpo/analytics/compensation*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            currency: "INR",
            unit: "LPA",
            student_level_primary: {
              placed_students_count: 320,
              placed_students_with_valid_compensation: 310,
              placed_students_with_unspecified_compensation: 10,
              highest_ctc: 45.0,
              lowest_ctc: 4.5,
              average_ctc: 12.5,
              median_ctc: 10.0,
              brackets: { below_5_lpa: 15, "5_to_10_lpa": 140, "10_to_20_lpa": 120, above_20_lpa: 35 },
            },
            offer_level_gross: {
              total_verified_offers: 400,
              highest_ctc: 45.0,
              lowest_ctc: 4.0,
              average_ctc: 11.8,
              median_ctc: 9.5,
              brackets: { below_5_lpa: 25, "5_to_10_lpa": 180, "10_to_20_lpa": 150, above_20_lpa: 45 },
            },
            exclusions: {
              unverified_or_pending_offers_excluded_count: 45,
              non_accepted_or_joined_offers_excluded_count: 20,
              zero_or_null_ctc_offers_excluded_count: 10,
            },
            filters_applied: { graduation_year: null, branch: null },
          },
        }),
      });
    });

    // Navigate to page
    await page.goto("/dashboard/tpo/analytics");

    // Header Assertion
    await expect(page.locator("h1")).toContainText(/Institutional Placement Analytics/i);

    // KPI Cards Assertion
    await expect(page.getByText("Total Cohort", { exact: true })).toBeVisible();
    await expect(page.getByText("Eligible Cohort", { exact: true })).toBeVisible();
    await expect(page.getByText("Verified Placed", { exact: true })).toBeVisible();
    await expect(page.getByText(/Verified Placements Outside Baseline Eligibility/i)).toBeVisible();

    // Verify Tab Switching to Compensation
    const compTab = page.getByRole("button", { name: /Verified Compensation/i });
    await compTab.click();
    await expect(page.getByText("Auditable Telemetry Exclusions")).toBeVisible();
    await expect(page.getByText("Unverified / Pending")).toBeVisible();

    // Verify Tab Switching to Operations (Interviews & Drives)
    const opsTab = page.getByRole("button", { name: /Interviews & Drives/i });
    await opsTab.click();
    await expect(page.getByText(/Physical Candidate Interview Attendance Tracking:/i)).toBeVisible();
    await expect(page.getByText("UNAVAILABLE")).toBeVisible();
    await expect(page.getByText("Alpha Tech Campus Drive")).toBeVisible();
  });
});
