<?php

namespace App\Services\Resume;

use App\Models\Resume;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use ZipArchive;

class ResumeDocxExportService
{
    /**
     * Export resume to a native Microsoft Word (.docx) document.
     * Enforces that student has approved the resume before export.
     */
    public function exportDocx(Resume $resume, bool $enforceApproval = true): string
    {
        if ($enforceApproval && !$resume->isApproved()) {
            throw new \InvalidArgumentException("Student approval is required before exporting the final resume DOCX.");
        }

        $template = strtolower($resume->template ?: 'modern');
        $content = $resume->content ?: [];
        $personal = $content['personal_info'] ?? [];

        // Accent hex colors
        $accentColor = '1E3A8A'; // Navy Blue default
        $fontName = 'Arial';

        if ($template === 'classic') {
            $accentColor = '111827'; // Dark charcoal
            $fontName = 'Times New Roman';
        } elseif ($template === 'technical') {
            $accentColor = '0F766E'; // Teal / Slate
            $fontName = 'Consolas';
        }

        $xmlBody = '';

        // 1. Candidate Name (Title)
        $fullName = $personal['full_name'] ?? 'Candidate Name';
        $align = ($template === 'classic') ? 'center' : 'left';
        
        $xmlBody .= $this->createParagraph(
            htmlspecialchars($fullName, ENT_XML1, 'UTF-8'),
            ['bold' => true, 'size' => 36, 'color' => $accentColor, 'font' => $fontName],
            ['align' => $align, 'spaceAfter' => 60]
        );

        // Contact info line
        $contactItems = array_filter([
            $personal['email'] ?? null,
            $personal['phone'] ?? null,
            $personal['location'] ?? null,
            !empty($personal['branch']) ? "{$personal['branch']} (Class of " . ($personal['graduation_year'] ?? '') . ")" : null,
        ]);
        if (!empty($contactItems)) {
            $xmlBody .= $this->createParagraph(
                htmlspecialchars(implode('  |  ', $contactItems), ENT_XML1, 'UTF-8'),
                ['bold' => false, 'size' => 18, 'color' => '4B5563', 'font' => $fontName],
                ['align' => $align, 'spaceAfter' => 40]
            );
        }

        // Web Links line
        $linkItems = array_filter([
            !empty($personal['linkedin_url']) ? "LinkedIn: " . $personal['linkedin_url'] : null,
            !empty($personal['github_url']) ? "GitHub: " . $personal['github_url'] : null,
            !empty($personal['portfolio_url']) ? "Portfolio: " . $personal['portfolio_url'] : null,
        ]);
        if (!empty($linkItems)) {
            $xmlBody .= $this->createParagraph(
                htmlspecialchars(implode('  |  ', $linkItems), ENT_XML1, 'UTF-8'),
                ['bold' => false, 'size' => 17, 'color' => '2563EB', 'font' => $fontName],
                ['align' => $align, 'spaceAfter' => 120]
            );
        }

        // Horizontal line separator
        $xmlBody .= $this->createDivider();

        // 2. Sections
        $sectionOrder = $content['section_order'] ?? ['summary', 'work_experience', 'skills', 'projects', 'education', 'certifications', 'achievements'];
        $sectionVisibility = $content['section_visibility'] ?? [];

        foreach ($sectionOrder as $sectionKey) {
            if (isset($sectionVisibility[$sectionKey]) && !$sectionVisibility[$sectionKey]) {
                continue;
            }

            switch ($sectionKey) {
                case 'summary':
                    if (!empty($content['summary'])) {
                        $xmlBody .= $this->createSectionHeading("PROFESSIONAL SUMMARY", $accentColor, $fontName);
                        $xmlBody .= $this->createParagraph(
                            htmlspecialchars($content['summary'], ENT_XML1, 'UTF-8'),
                            ['size' => 20, 'color' => '1F2937', 'font' => $fontName],
                            ['align' => 'both', 'spaceAfter' => 120]
                        );
                    }
                    break;

                case 'work_experience':
                case 'experience':
                    $experiences = $content['work_experience'] ?? ($content['experience'] ?? []);
                    if (!empty($experiences)) {
                        $xmlBody .= $this->createSectionHeading("WORK EXPERIENCE & INTERNSHIPS", $accentColor, $fontName);
                        foreach ($experiences as $exp) {
                            $role = $exp['job_title'] ?? ($exp['title'] ?? 'Software Engineer');
                            $company = $exp['company'] ?? 'Company';
                            $loc = !empty($exp['location']) ? " | {$exp['location']}" : '';
                            $dates = (!empty($exp['start_date']) || !empty($exp['end_date']))
                                ? " (" . ($exp['start_date'] ?: 'Start') . " – " . (!empty($exp['is_current']) ? 'Present' : ($exp['end_date'] ?: 'Present')) . ")"
                                : '';

                            $xmlBody .= $this->createSubHeading("{$role} — {$company}{$loc}{$dates}", $fontName);
                            if (!empty($exp['technologies'])) {
                                $xmlBody .= $this->createParagraph(
                                    "Technologies: " . htmlspecialchars($exp['technologies'], ENT_XML1, 'UTF-8'),
                                    ['italic' => true, 'size' => 18, 'color' => '4B5563', 'font' => $fontName],
                                    ['spaceAfter' => 40]
                                );
                            }

                            $bullets = !empty($exp['highlights']) ? $exp['highlights'] : (!empty($exp['description']) ? explode("\n", $exp['description']) : []);
                            foreach ($bullets as $b) {
                                if (trim($b)) {
                                    $xmlBody .= $this->createBulletPoint(htmlspecialchars(trim($b), ENT_XML1, 'UTF-8'), $fontName);
                                }
                            }
                            $xmlBody .= '<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>';
                        }
                    }
                    break;

                case 'skills':
                    if (!empty($content['skills'])) {
                        $xmlBody .= $this->createSectionHeading("TECHNICAL & DOMAIN SKILLS", $accentColor, $fontName);
                        $groupedSkills = collect($content['skills'])->groupBy('category');
                        foreach ($groupedSkills as $category => $items) {
                            $catName = htmlspecialchars($category ?: 'Core Technologies', ENT_XML1, 'UTF-8');
                            $skillsList = htmlspecialchars($items->pluck('name')->implode(', '), ENT_XML1, 'UTF-8');

                            $xmlBody .= '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>'
                                . '<w:r><w:rPr><w:b/><w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/><w:sz w:val="20"/><w:color w:val="111827"/></w:rPr><w:t>' . $catName . ': </w:t></w:r>'
                                . '<w:r><w:rPr><w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/><w:sz w:val="20"/><w:color w:val="374151"/></w:rPr><w:t>' . $skillsList . '</w:t></w:r>'
                                . '</w:p>';
                        }
                        $xmlBody .= '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
                    }
                    break;

                case 'projects':
                    if (!empty($content['projects'])) {
                        $xmlBody .= $this->createSectionHeading("TECHNICAL PROJECTS & ENGINEERING SYSTEMS", $accentColor, $fontName);
                        foreach ($content['projects'] as $proj) {
                            $title = $proj['title'] ?? 'Project';
                            $tech = !empty($proj['technologies']) ? " [{$proj['technologies']}]" : '';
                            $url = !empty($proj['project_url']) ? " ({$proj['project_url']})" : '';

                            $xmlBody .= $this->createSubHeading("{$title}{$tech}{$url}", $fontName);

                            $bullets = !empty($proj['highlights']) ? $proj['highlights'] : (!empty($proj['description']) ? explode("\n", $proj['description']) : []);
                            foreach ($bullets as $b) {
                                if (trim($b)) {
                                    $xmlBody .= $this->createBulletPoint(htmlspecialchars(trim($b), ENT_XML1, 'UTF-8'), $fontName);
                                }
                            }
                            $xmlBody .= '<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>';
                        }
                    }
                    break;

                case 'education':
                    if (!empty($content['academic_history'])) {
                        $xmlBody .= $this->createSectionHeading("EDUCATION & ACADEMIC CREDENTIALS", $accentColor, $fontName);
                        foreach ($content['academic_history'] as $edu) {
                            $deg = $edu['qualification'] ?? 'Degree';
                            $inst = $edu['institution'] ?? 'University';
                            $score = !empty($edu['score_value']) ? " ({$edu['score_type']}: {$edu['score_value']})" : '';
                            $years = (!empty($edu['start_year']) && !empty($edu['end_year'])) ? " | {$edu['start_year']} – {$edu['end_year']}" : '';

                            $xmlBody .= $this->createSubHeading("{$deg} — {$inst}{$score}{$years}", $fontName);
                            if (!empty($edu['specialization'])) {
                                $xmlBody .= $this->createParagraph(
                                    "Specialization: " . htmlspecialchars($edu['specialization'], ENT_XML1, 'UTF-8'),
                                    ['italic' => true, 'size' => 18, 'color' => '4B5563', 'font' => $fontName],
                                    ['spaceAfter' => 40]
                                );
                            }
                        }
                        $xmlBody .= '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
                    }
                    break;

                case 'certifications':
                    if (!empty($content['certifications'])) {
                        $xmlBody .= $this->createSectionHeading("CERTIFICATIONS & ACCREDITATIONS", $accentColor, $fontName);
                        foreach ($content['certifications'] as $cert) {
                            $name = $cert['name'] ?? 'Certification';
                            $org = !empty($cert['issuing_org']) ? " — {$cert['issuing_org']}" : '';
                            $date = !empty($cert['issue_date']) ? " (Issued: {$cert['issue_date']})" : '';
                            $ver = !empty($cert['is_verified']) ? " [Verified]" : "";

                            $xmlBody .= $this->createBulletPoint(htmlspecialchars("{$name}{$org}{$date}{$ver}", ENT_XML1, 'UTF-8'), $fontName);
                        }
                        $xmlBody .= '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
                    }
                    break;

                case 'achievements':
                    $achievements = $content['achievements'] ?? [];
                    if (!empty($achievements)) {
                        $xmlBody .= $this->createSectionHeading("HONORS & KEY ACHIEVEMENTS", $accentColor, $fontName);
                        foreach ($achievements as $ach) {
                            $title = is_array($ach) ? ($ach['title'] ?? '') : (string) $ach;
                            $issuer = is_array($ach) && !empty($ach['issuer']) ? " — {$ach['issuer']}" : '';
                            $date = is_array($ach) && !empty($ach['date']) ? " ({$ach['date']})" : '';
                            $desc = is_array($ach) && !empty($ach['description']) ? ": {$ach['description']}" : '';

                            $xmlBody .= $this->createBulletPoint(htmlspecialchars("{$title}{$issuer}{$date}{$desc}", ENT_XML1, 'UTF-8'), $fontName);
                        }
                        $xmlBody .= '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
                    }
                    break;
            }
        }

        // Package into standard DOCX ZIP archive
        $docxPath = $this->packageDocx($xmlBody);

        $filename = "resumes/resume_{$resume->id}.docx";
        Storage::disk('local')->put($filename, file_get_contents($docxPath));
        @unlink($docxPath);

        return $filename;
    }

    private function createParagraph(string $text, array $fontStyle = [], array $pStyle = []): string
    {
        $boldXml = !empty($fontStyle['bold']) ? '<w:b/>' : '';
        $italicXml = !empty($fontStyle['italic']) ? '<w:i/>' : '';
        $sizeXml = !empty($fontStyle['size']) ? '<w:sz w:val="' . $fontStyle['size'] . '"/>' : '<w:sz w:val="20"/>';
        $colorXml = !empty($fontStyle['color']) ? '<w:color w:val="' . $fontStyle['color'] . '"/>' : '<w:color w:val="1F2937"/>';
        $fontName = $fontStyle['font'] ?? 'Arial';
        $fontXml = '<w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/>';

        $alignXml = !empty($pStyle['align']) ? '<w:jc w:val="' . $pStyle['align'] . '"/>' : '';
        $spaceAfter = !empty($pStyle['spaceAfter']) ? '<w:spacing w:after="' . $pStyle['spaceAfter'] . '"/>' : '<w:spacing w:after="60"/>';

        return '<w:p>'
            . '<w:pPr>' . $alignXml . $spaceAfter . '</w:pPr>'
            . '<w:r>'
            . '<w:rPr>' . $fontXml . $boldXml . $italicXml . $sizeXml . $colorXml . '</w:rPr>'
            . '<w:t>' . $text . '</w:t>'
            . '</w:r>'
            . '</w:p>';
    }

    private function createSectionHeading(string $title, string $accentColor = '1E3A8A', string $fontName = 'Arial'): string
    {
        return '<w:p>'
            . '<w:pPr>'
            . '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="' . $accentColor . '"/></w:pBdr>'
            . '<w:spacing w:before="180" w:after="80"/>'
            . '</w:pPr>'
            . '<w:r>'
            . '<w:rPr>'
            . '<w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/>'
            . '<w:b/>'
            . '<w:sz w:val="22"/>'
            . '<w:color w:val="' . $accentColor . '"/>'
            . '</w:rPr>'
            . '<w:t>' . htmlspecialchars($title, ENT_XML1, 'UTF-8') . '</w:t>'
            . '</w:r>'
            . '</w:p>';
    }

    private function createSubHeading(string $text, string $fontName = 'Arial'): string
    {
        return '<w:p>'
            . '<w:pPr><w:spacing w:before="60" w:after="20"/></w:pPr>'
            . '<w:r>'
            . '<w:rPr>'
            . '<w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/>'
            . '<w:b/>'
            . '<w:sz w:val="20"/>'
            . '<w:color w:val="111827"/>'
            . '</w:rPr>'
            . '<w:t>' . htmlspecialchars($text, ENT_XML1, 'UTF-8') . '</w:t>'
            . '</w:r>'
            . '</w:p>';
    }

    private function createBulletPoint(string $text, string $fontName = 'Arial'): string
    {
        return '<w:p>'
            . '<w:pPr>'
            . '<w:ind w:left="360" w:hanging="240"/>'
            . '<w:spacing w:after="40"/>'
            . '</w:pPr>'
            . '<w:r>'
            . '<w:rPr><w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/><w:sz w:val="19"/><w:color w:val="1E3A8A"/></w:rPr>'
            . '<w:t>• </w:t>'
            . '</w:r>'
            . '<w:r>'
            . '<w:rPr>'
            . '<w:rFonts w:ascii="' . $fontName . '" w:hAnsi="' . $fontName . '"/>'
            . '<w:sz w:val="19"/>'
            . '<w:color w:val="374151"/>'
            . '</w:rPr>'
            . '<w:t>' . $text . '</w:t>'
            . '</w:r>'
            . '</w:p>';
    }

    private function createDivider(): string
    {
        return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D1D5DB"/></w:pBdr><w:spacing w:after="100"/></w:pPr></w:p>';
    }

    private function packageDocx(string $xmlBody): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
        $zip = new ZipArchive();
        $zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // 1. [Content_Types].xml
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            . '</Types>';
        $zip->addFromString('[Content_Types].xml', $contentTypes);

        // 2. _rels/.rels
        $rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            . '</Relationships>';
        $zip->addFromString('_rels/.rels', $rootRels);

        // 3. word/document.xml
        $documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:body>'
            . $xmlBody
            . '<w:sectPr>'
            . '<w:pgSz w:w="11906" w:h="16838"/>' // A4 in dxa
            . '<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>'
            . '</w:sectPr>'
            . '</w:body>'
            . '</w:document>';
        $zip->addFromString('word/document.xml', $documentXml);

        $zip->close();
        return $tempFile;
    }
}
