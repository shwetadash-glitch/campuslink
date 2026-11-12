<?php

namespace App\Services;

class BranchNormalizationService
{
    private const ALIAS_MAP = [
        // Information Technology
        'it' => 'IT',
        'information technology' => 'IT',
        'infotech' => 'IT',
        'info tech' => 'IT',
        'information tech' => 'IT',
        'b tech it' => 'IT',
        'btech it' => 'IT',

        // Computer Science & Engineering
        'cs' => 'CSE',
        'cse' => 'CSE',
        'computer science' => 'CSE',
        'computer science and engineering' => 'CSE',
        'computer science & engineering' => 'CSE',
        'computer science engineering' => 'CSE',
        'b tech cse' => 'CSE',
        'btech cse' => 'CSE',
        'computer science and engg' => 'CSE',

        // Electronics & Communication
        'ece' => 'ECE',
        'etc' => 'ECE',
        'electronics and communication' => 'ECE',
        'electronics and communication engineering' => 'ECE',
        'electronics & communication engineering' => 'ECE',
        'electronics and telecommunication' => 'ECE',
        'electronics & telecommunication' => 'ECE',
        'electronics and telecom' => 'ECE',
        'b tech ece' => 'ECE',
        'btech ece' => 'ECE',

        // Electrical & Electronics
        'eee' => 'EEE',
        'ee' => 'EEE',
        'electrical' => 'EEE',
        'electrical engineering' => 'EEE',
        'electrical and electronics engineering' => 'EEE',
        'electrical & electronics' => 'EEE',
        'electrical & electronics engineering' => 'EEE',
        'b tech eee' => 'EEE',
        'btech eee' => 'EEE',

        // Mechanical Engineering
        'me' => 'MECH',
        'mech' => 'MECH',
        'mechanical' => 'MECH',
        'mechanical engineering' => 'MECH',
        'b tech mechanical' => 'MECH',
        'btech mechanical' => 'MECH',

        // Civil Engineering
        'ce' => 'CIVIL',
        'civil' => 'CIVIL',
        'civil engineering' => 'CIVIL',
        'b tech civil' => 'CIVIL',
        'btech civil' => 'CIVIL',

        // Artificial Intelligence & Machine Learning
        'aiml' => 'AIML',
        'ai ml' => 'AIML',
        'ai/ml' => 'AIML',
        'artificial intelligence and machine learning' => 'AIML',
        'artificial intelligence & machine learning' => 'AIML',
        'b tech aiml' => 'AIML',
        'btech aiml' => 'AIML',

        // Data Science
        'ds' => 'DS',
        'data science' => 'DS',
        'cse data science' => 'DS',
        'big data' => 'DS',
        'artificial intelligence and data science' => 'DS',
        'ai and data science' => 'DS',
        'b tech data science' => 'DS',
        'btech data science' => 'DS',

        // Chemical Engineering
        'chem' => 'CHEM',
        'chemical' => 'CHEM',
        'chemical engineering' => 'CHEM',
        'b tech chemical' => 'CHEM',
        'btech chemical' => 'CHEM',

        // Biotechnology
        'bt' => 'BIOTECH',
        'biotech' => 'BIOTECH',
        'biotechnology' => 'BIOTECH',
        'b tech biotechnology' => 'BIOTECH',
        'btech biotechnology' => 'BIOTECH',
    ];

    /**
     * Canonical Branch Taxonomy Normalization
     */
    public static function normalize(?string $branch): string
    {
        if (!$branch) {
            return '';
        }

        $cleaned = strtolower(trim($branch));
        $cleaned = preg_replace('/^(b\.?tech|b\.?e\.?|department of)\s+/i', '', $cleaned);
        $cleaned = preg_replace('/[&]/', ' and ', $cleaned);
        $cleaned = preg_replace('/[\.\-\/]/', ' ', $cleaned);
        $cleaned = preg_replace('/\s+/', ' ', trim($cleaned));

        return self::ALIAS_MAP[$cleaned] ?? strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $cleaned));
    }

    /**
     * Check if a candidate's branch is acceptable against an allowed branch list.
     */
    public static function isBranchAllowed(?string $studentBranch, array $allowedBranches): bool
    {
        if (empty($allowedBranches)) {
            return true;
        }

        foreach ($allowedBranches as $allowed) {
            if (strtoupper(trim((string)$allowed)) === 'ALL') {
                return true;
            }
        }

        $studentCanonical = self::normalize($studentBranch);
        if ($studentCanonical === '') {
            return false;
        }

        $allowedCanonicals = array_map([self::class, 'normalize'], $allowedBranches);
        if (in_array($studentCanonical, $allowedCanonicals, true)) {
            return true;
        }

        foreach ($allowedBranches as $allowed) {
            if (strcasecmp(trim((string)$studentBranch), trim((string)$allowed)) === 0) {
                return true;
            }
        }

        return false;
    }
}
