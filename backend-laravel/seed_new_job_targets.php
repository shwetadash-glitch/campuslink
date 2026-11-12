<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Job;
use App\Models\Skill;
use App\Models\JobRequirement;
use App\Models\Company;
use App\Enums\JobStatus;
use App\Enums\ProficiencyLevel;

echo "Seeding new Job Targets and Required Skills...\n";

// 1. Ensure skills exist
$skillsData = [
    // Cloud Engineer skills
    'Linux & Operating Systems' => 'Technical',
    'Computer Networking' => 'Technical',
    'Cloud Platforms (AWS / Azure / GCP)' => 'Technical',
    'Database Management (SQL / PostgreSQL / MongoDB)' => 'Technical',
    'Kubernetes' => 'Technical',
    'Git & Version Control' => 'Technical',
    'Cloud Security & IAM' => 'Technical',

    // Forward Deployed Engineer skills
    'Problem Solving & Practical Solutions' => 'Technical',
    'AI & Machine Learning (LLMs & APIs)' => 'Technical',
    'Web Development & APIs' => 'Technical',
    'Database Management (SQL & NoSQL)' => 'Technical',
    'Cloud Computing (AWS / Azure / GCP)' => 'Technical',
    'Communication & Client Management' => 'Soft Skill',
    'Adaptability & Technical Agility' => 'Soft Skill',

    // Data Scientist skills
    'Python & Scientific Computing' => 'Technical',
    'Probability & Applied Statistics' => 'Technical',
    'Linear Algebra & Calculus' => 'Technical',
    'Data Wrangling & Feature Engineering' => 'Technical',
    'Deep Learning (TensorFlow / PyTorch)' => 'Technical',
    'Data Visualization & Storytelling (Tableau / Power BI)' => 'Technical',
    'Big Data Frameworks (Apache Spark / Hadoop)' => 'Technical',
    'Generative AI & Modern AI Tools' => 'Technical',
    'Business Acumen & Analytical Curiosity' => 'Domain Knowledge',

    // Systems Engineer skills
    'Systems Programming (C / C++)' => 'Technical',
    'Distributed Systems & High Availability' => 'Technical',
    'System Performance & Profiling (gdb, strace, perf)' => 'Technical',
    'Storage & File Systems' => 'Technical',
    'Infrastructure Security & Access Control' => 'Technical',
    'Problem Solving & Systems Architecture' => 'Technical',

    // AI Product Engineer skills
    'Python & Backend Engineering' => 'Technical',
    'Generative AI & LLMs (Prompt Engineering & APIs)' => 'Technical',
    'RAG & Vector Databases (Pinecone, Chroma)' => 'Technical',
    'AI Agent Frameworks (LangChain, LlamaIndex)' => 'Technical',
    'Full-Stack Web Development (React / Next.js)' => 'Technical',
    'AI Model Evaluation & Guardrails' => 'Technical',
    'AI Product Acumen & UX Design' => 'Domain Knowledge',
];

$skillModels = [];
foreach ($skillsData as $name => $category) {
    $s = Skill::firstOrCreate(['name' => $name], ['category' => $category]);
    $skillModels[$name] = $s;
}

// Map existing foundational skills
$existingSkillNames = ['Python', 'SQL', 'Docker', 'AWS', 'Communication', 'C++', 'Machine Learning', 'React', 'Java'];
foreach ($existingSkillNames as $esn) {
    $s = Skill::where('name', $esn)->first();
    if ($s) {
        $skillModels[$esn] = $s;
    }
}

// Companies
$msft = Company::where('name', 'Microsoft')->first() ?? Company::first();
$google = Company::where('name', 'Google')->first() ?? Company::first();
$gs = Company::where('name', 'Goldman Sachs')->first() ?? Company::first();
$innovate = Company::where('name', 'Innovate Ltd')->first() ?? Company::first();
$techcorp = Company::where('name', 'TechCorp Updated')->first() ?? Company::first();

// Helper to create or update job with requirements
function createJobWithRequirements($title, $companyId, $description, $requirements) {
    $job = Job::firstOrNew(['title' => $title]);
    $job->company_id = $companyId;
    $job->description = $description;
    $job->employment_type = 'FULL_TIME';
    $job->location = 'Bangalore / Remote';
    $job->status = JobStatus::PUBLISHED;
    $job->eligibility_config = [
        'min_cgpa' => 6.5,
        'max_active_backlogs' => 0,
        'allowed_branches' => [
            'Computer Science', 'CSE', 'Information Technology', 'IT',
            'Artificial Intelligence and Data Science', 'AI & Data Science', 'AIML', 'Data Science', 'DS'
        ]
    ];
    $job->save();

    // Sync requirements
    JobRequirement::where('job_id', $job->id)->delete();
    foreach ($requirements as $req) {
        JobRequirement::create([
            'job_id' => $job->id,
            'skill_id' => $req['skill_id'],
            'required_proficiency' => $req['required_proficiency'],
            'is_mandatory' => $req['is_mandatory'],
            'weight' => $req['weight'] ?? 1.0,
        ]);
    }

    echo "Created/Updated Job: {$job->title} (ID: {$job->id}) with " . count($requirements) . " requirements.\n";
    return $job;
}

// 1. Cloud Engineer
createJobWithRequirements(
    'Cloud Engineer',
    $msft->id,
    'Responsible for architecting, deploying, and maintaining resilient cloud infrastructure across multi-cloud environments, Linux systems, container platforms, and security boundaries.',
    [
        ['skill_id' => $skillModels['Python']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.0],
        ['skill_id' => $skillModels['Linux & Operating Systems']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['Computer Networking']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['Cloud Platforms (AWS / Azure / GCP)']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['Database Management (SQL / PostgreSQL / MongoDB)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.2],
        ['skill_id' => $skillModels['Docker']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.2],
        ['skill_id' => $skillModels['Kubernetes']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['Git & Version Control']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.0],
        ['skill_id' => $skillModels['Cloud Security & IAM']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
    ]
);

// 2. Forward Deployed Engineer
createJobWithRequirements(
    'Forward Deployed Engineer',
    $innovate->id,
    'Deploys client-facing engineering solutions, translating high-ambiguity enterprise problems into robust software architectures, LLM integrations, and cloud services.',
    [
        ['skill_id' => $skillModels['Python']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.8],
        ['skill_id' => $skillModels['Problem Solving & Practical Solutions']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.6],
        ['skill_id' => $skillModels['AI & Machine Learning (LLMs & APIs)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['Web Development & APIs']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['Database Management (SQL & NoSQL)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.3],
        ['skill_id' => $skillModels['Cloud Computing (AWS / Azure / GCP)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.3],
        ['skill_id' => $skillModels['Communication']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.6],
        ['skill_id' => $skillModels['Adaptability & Technical Agility']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.4],
    ]
);

// 3. Data Scientist
createJobWithRequirements(
    'Data Scientist',
    $gs->id,
    'Applies statistical rigor, machine learning algorithms, deep learning, and big data pipelines to derive high-impact predictive insights and solve complex business problems.',
    [
        ['skill_id' => $skillModels['Python']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['SQL']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['Git & Version Control']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.0],
        ['skill_id' => $skillModels['Probability & Applied Statistics']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.8],
        ['skill_id' => $skillModels['Linear Algebra & Calculus']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.2],
        ['skill_id' => $skillModels['Data Wrangling & Feature Engineering']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.6],
        ['skill_id' => $skillModels['Machine Learning']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['Deep Learning (TensorFlow / PyTorch)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.2],
        ['skill_id' => $skillModels['Data Visualization & Storytelling (Tableau / Power BI)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.3],
        ['skill_id' => $skillModels['Generative AI & Modern AI Tools']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.2],
        ['skill_id' => $skillModels['Big Data Frameworks (Apache Spark / Hadoop)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.2],
        ['skill_id' => $skillModels['Business Acumen & Analytical Curiosity']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.4],
    ]
);

// 4. Systems Engineer
createJobWithRequirements(
    'Systems Engineer',
    $google->id,
    'Focuses on low-level system performance, Linux kernel internals, distributed systems architecture, memory safety, and high-throughput networking infrastructure.',
    [
        ['skill_id' => $skillModels['Linux & Operating Systems']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['C++']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['Computer Networking']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.8],
        ['skill_id' => $skillModels['Distributed Systems & High Availability']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['System Performance & Profiling (gdb, strace, perf)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['Storage & File Systems']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.2],
        ['skill_id' => $skillModels['Infrastructure Security & Access Control']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['Problem Solving & Systems Architecture']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.6],
    ]
);

// 5. AI Product Engineer
createJobWithRequirements(
    'AI Product Engineer',
    $google->id,
    'Bridges state-of-the-art Generative AI models and production web software, building RAG systems, AI agents, evaluation harnesses, and intuitive user experiences.',
    [
        ['skill_id' => $skillModels['Python']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.8],
        ['skill_id' => $skillModels['Generative AI & LLMs (Prompt Engineering & APIs)']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 2.0],
        ['skill_id' => $skillModels['RAG & Vector Databases (Pinecone, Chroma)']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.8],
        ['skill_id' => $skillModels['AI Agent Frameworks (LangChain, LlamaIndex)']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.5],
        ['skill_id' => $skillModels['React']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['AI Model Evaluation & Guardrails']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => true, 'weight' => 1.4],
        ['skill_id' => $skillModels['Docker']->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE, 'is_mandatory' => false, 'weight' => 1.2],
        ['skill_id' => $skillModels['AI Product Acumen & UX Design']->id, 'required_proficiency' => ProficiencyLevel::ADVANCED, 'is_mandatory' => true, 'weight' => 1.5],
    ]
);

echo "All 5 Job Targets seeded successfully!\n";
