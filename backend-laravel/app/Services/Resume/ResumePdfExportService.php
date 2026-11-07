<?php

namespace App\Services\Resume;

use App\Models\Resume;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ResumePdfExportService
{
    /**
     * Render and save a PDF resume document based on the selected template and sections.
     * Enforces that student has approved the resume before final export.
     */
    public function exportPdf(Resume $resume, bool $enforceApproval = true): string
    {
        if ($enforceApproval && !$resume->isApproved()) {
            throw new \InvalidArgumentException("Student approval is required before exporting the final resume PDF.");
        }

        $template = strtolower($resume->template ?: 'modern');
        $content = $resume->content ?: [];

        // Choose typography and accent colors based on template
        $fontFamily = 'Helvetica';
        $accentColor = [0.12, 0.35, 0.65]; // Navy / blue

        if ($template === 'classic') {
            $fontFamily = 'Times';
            $accentColor = [0.15, 0.15, 0.15]; // Traditional black/charcoal
        } elseif ($template === 'technical') {
            $fontFamily = 'Courier';
            $accentColor = [0.10, 0.40, 0.45]; // Teal / slate
        }

        $builder = new PdfDocumentBuilder($fontFamily);
        $personal = $content['personal_info'] ?? [];

        // 1. Header (Personal Information)
        $fullName = $personal['full_name'] ?? 'Candidate Name';
        $builder->addText($fullName, 18.0, true, $accentColor);

        // Contact Line
        $contactItems = array_filter([
            $personal['email'] ?? null,
            $personal['phone'] ?? null,
            $personal['branch'] ? "{$personal['branch']} (Class of " . ($personal['graduation_year'] ?? '') . ")" : null,
            $personal['location'] ?? null,
        ]);
        $builder->addText(implode('  |  ', $contactItems), 8.5, false, [0.4, 0.4, 0.4]);

        // Links Line
        $linkItems = array_filter([
            !empty($personal['linkedin_url']) ? "LinkedIn: " . $personal['linkedin_url'] : null,
            !empty($personal['github_url']) ? "GitHub: " . $personal['github_url'] : null,
            !empty($personal['portfolio_url']) ? "Portfolio: " . $personal['portfolio_url'] : null,
        ]);
        if (!empty($linkItems)) {
            $builder->addText(implode('  |  ', $linkItems), 8.0, false, [0.35, 0.35, 0.65]);
        }

        $builder->setCurrentY($builder->getCurrentY() - 4.0);
        $ruleY = $builder->getCurrentY();
        $builder->drawLine($builder->getMargin(), $ruleY, $builder->getPageWidth() - $builder->getMargin(), $ruleY, [0.75, 0.75, 0.75], 1.0);
        $builder->setCurrentY($builder->getCurrentY() - 6.0);

        // 2. Sections in configured order & visibility
        $sectionOrder = $content['section_order'] ?? ['summary', 'skills', 'projects', 'education', 'certifications'];
        $sectionVisibility = $content['section_visibility'] ?? [];

        foreach ($sectionOrder as $sectionKey) {
            if (isset($sectionVisibility[$sectionKey]) && !$sectionVisibility[$sectionKey]) {
                continue; // Suppressed section
            }

            switch ($sectionKey) {
                case 'summary':
                    if (!empty($content['summary'])) {
                        $builder->addSectionHeading("Professional Summary", $accentColor);
                        $summaryLines = explode("\n", wordwrap($content['summary'], 95));
                        foreach ($summaryLines as $sLine) {
                            $builder->addText(trim($sLine), 9.0, false, [0.2, 0.2, 0.2]);
                        }
                    }
                    break;

                case 'skills':
                    if (!empty($content['skills'])) {
                        $builder->addSectionHeading("Technical & Domain Skills", $accentColor);
                        $groupedSkills = collect($content['skills'])->groupBy('category');

                        foreach ($groupedSkills as $category => $items) {
                            $categoryName = $category ?: 'Core Technologies';
                            $skillsList = $items->pluck('name')->implode(', ');
                            $builder->addText("{$categoryName}:", 9.0, true, [0.15, 0.15, 0.15], null, false);
                            $builder->addText(" {$skillsList}", 9.0, false, [0.25, 0.25, 0.25], $builder->getMargin() + 110);
                        }
                    }
                    break;

                case 'projects':
                    if (!empty($content['projects'])) {
                        $builder->addSectionHeading("Technical Projects & Systems", $accentColor);
                        foreach ($content['projects'] as $proj) {
                            $title = $proj['title'] ?? 'Project';
                            $tech = !empty($proj['technologies']) ? " [{$proj['technologies']}]" : '';
                            $builder->addText("{$title}{$tech}", 9.5, true, [0.15, 0.15, 0.15]);

                            if (!empty($proj['highlights'])) {
                                foreach ($proj['highlights'] as $hl) {
                                    $builder->addBulletPoint($hl, 8.5);
                                }
                            } elseif (!empty($proj['description'])) {
                                $lines = explode("\n", $proj['description']);
                                foreach ($lines as $line) {
                                    $builder->addBulletPoint(trim($line), 8.5);
                                }
                            }
                            $builder->setCurrentY($builder->getCurrentY() - 3.0);
                        }
                    }
                    break;

                case 'education':
                    if (!empty($content['academic_history'])) {
                        $builder->addSectionHeading("Education & Academic Credentials", $accentColor);
                        foreach ($content['academic_history'] as $edu) {
                            $deg = $edu['qualification'] ?? 'Degree';
                            $inst = $edu['institution'] ?? 'University';
                            $score = !empty($edu['score_value']) ? " ({$edu['score_type']}: {$edu['score_value']})" : '';
                            $years = (!empty($edu['start_year']) && !empty($edu['end_year'])) ? " | {$edu['start_year']} - {$edu['end_year']}" : '';

                            $builder->addText("{$deg} — {$inst}{$score}{$years}", 9.0, true, [0.15, 0.15, 0.15]);
                            if (!empty($edu['specialization'])) {
                                $builder->addText("Specialization: {$edu['specialization']}", 8.5, false, [0.35, 0.35, 0.35]);
                            }
                        }
                    }
                    break;

                case 'certifications':
                    if (!empty($content['certifications'])) {
                        $builder->addSectionHeading("Certifications & Verified Credentials", $accentColor);
                        foreach ($content['certifications'] as $cert) {
                            $name = $cert['name'] ?? 'Certification';
                            $org = !empty($cert['issuing_org']) ? " — {$cert['issuing_org']}" : '';
                            $date = !empty($cert['issue_date']) ? " (Issued: {$cert['issue_date']})" : '';
                            $verified = !empty($cert['is_verified']) ? " [Verified]" : "";

                            $builder->addText("{$name}{$org}{$date}{$verified}", 9.0, false, [0.2, 0.2, 0.2]);
                        }
                    }
                    break;
            }
        }

        // Render binary PDF stream
        $pdfData = $builder->output();

        // Delete previous PDF file if exists to prevent stale storage artifacts
        if ($resume->pdf_path && Storage::disk('local')->exists($resume->pdf_path)) {
            Storage::disk('local')->delete($resume->pdf_path);
        }

        // Save PDF securely in storage disk
        $filename = "resumes/resume_{$resume->id}_" . time() . ".pdf";
        Storage::disk('local')->put($filename, $pdfData);

        // Update resume model with generated path and timestamp
        $resume->update([
            'pdf_path' => $filename,
            'pdf_generated_at' => Carbon::now(),
        ]);

        return $filename;
    }
}
