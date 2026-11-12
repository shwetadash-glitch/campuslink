# CAMPUSLINK Algorithms and Scoring Models

## 1. Multi-Dimensional Global Student Readiness Engine

The Readiness Engine calculates a deterministic composite score ($0.0 \text{ to } 100.0$) representing a student's holistic baseline employability. Unlike arbitrary heuristic scores, this composite aggregates seven distinct objective dimensions.

### 1.1 Mathematical Formulation

$$\text{Readiness}(S) = \sum_{k=1}^{7} w_k \cdot D_k(S)$$

Subject to:
$$\sum_{k=1}^{7} w_k = 1.0, \quad 0 \le D_k(S) \le 100 \quad \forall k$$

### 1.2 Dimension Weights and Sub-Score Definitions

| Dimension ($D_k$) | Weight ($w_k$) | Evaluation Criteria | Formula / Normalization |
| :--- | :---: | :--- | :--- |
| **1. Academic Performance** | $0.20$ | Cumulative GPA, backlog deductions | $D_1 = \max\left(0, \frac{\text{CGPA}}{10} \times 100 - 15 \cdot B_{\text{curr}} - 5 \cdot B_{\text{hist}}\right)$ |
| **2. Technical Skill Depth** | $0.25$ | Skill count, proficiency levels ($1\text{--}4$), verified skills | $D_2 = \min\left(100, \sum_{i=1}^{n} \frac{\text{level}_i}{4} \times 20 \times (1.25 \text{ if verified else } 1.0)\right)$ |
| **3. Project Portfolio** | $0.15$ | Verified projects, tech stack breadth, live demo links | $D_3 = \min\left(100, N_{\text{projects}} \times 25 + N_{\text{live\_demo}} \times 10\right)$ |
| **4. Industry Certifications** | $0.10$ | Credentialed certifications, validity windows | $D_4 = \min\left(100, N_{\text{verified\_certs}} \times 30\right)$ |
| **5. Technical Assessments** | $0.15$ | Proctored coding challenges, platform test percentiles | $D_5 = \text{mean}(\text{Assessment Scores})$ |
| **6. Communication Coach** | $0.08$ | AI Email & Audio speech clarity evaluations | $D_6 = \text{mean}(\text{Communication Session Scores})$ |
| **7. Mock Technical Interview** | $0.07$ | AI Technical Interviewer score, question mastery | $D_7 = \text{mean}(\text{AI Interview Overall Scores})$ |

---

## 2. Deterministic Hard Eligibility Constraint Satisfaction

Before any semantic or fit scoring occurs, candidates are evaluated by a strict constraint gatekeeper to ensure regulatory compliance and recruiter threshold adherence.

### 2.1 Constraint Logic

```
ALGORITHM CheckHardEligibility(Candidate C, Job J):
    FailedCriteria = []

    // 1. CGPA Cutoff
    IF J.min_cgpa IS NOT NULL AND C.cgpa < J.min_cgpa THEN
        FailedCriteria.APPEND("CGPA " + C.cgpa + " is below minimum cutoff " + J.min_cgpa)

    // 2. Active Backlogs Limit
    IF J.max_backlogs IS NOT NULL AND C.backlogs_current > J.max_backlogs THEN
        FailedCriteria.APPEND("Active backlogs (" + C.backlogs_current + ") exceed maximum limit of " + J.max_backlogs)

    // 3. Historical Backlogs Limit
    IF J.max_history_backlogs IS NOT NULL AND C.backlogs_history > J.max_history_backlogs THEN
        FailedCriteria.APPEND("Historical backlogs (" + C.backlogs_history + ") exceed maximum limit of " + J.max_history_backlogs)

    // 4. Branch Normalization and Whitelist Matching
    CandidateCanonicalBranch = BranchNormalizationService.Normalize(C.branch)
    AllowedCanonicals = MAP(BranchNormalizationService.Normalize, J.allowed_branches)
    
    IF AllowedCanonicals IS NOT EMPTY AND CandidateCanonicalBranch NOT IN AllowedCanonicals THEN
        FailedCriteria.APPEND("Branch " + C.branch + " is not among allowed branches: " + JOIN(J.allowed_branches))

    // 5. Graduation Year Matching
    IF J.graduation_year IS NOT NULL AND C.graduation_year != J.graduation_year THEN
        FailedCriteria.APPEND("Graduation year " + C.graduation_year + " does not match required batch " + J.graduation_year)

    RETURN {
        is_eligible: (LENGTH(FailedCriteria) == 0),
        failed_criteria: FailedCriteria
    }
```

### 2.2 Branch Normalization Dictionary

The normalization engine resolves irregular strings to standard academic departments:
* `{"cse", "computer science", "cs", "computer science and engineering", "b.tech cse"} -> "CSE"`
* `{"it", "information technology", "b.tech it"} -> "IT"`
* `{"ece", "electronics", "electronics and communication"} -> "ECE"`
* `{"eee", "electrical", "electrical engineering"} -> "EEE"`
* `{"mech", "mechanical", "mechanical engineering"} -> "MECH"`
* `{"civil", "civil engineering"} -> "CIVIL"`
* `{"aiml", "artificial intelligence", "ai & ml"} -> "AIML"`
* `{"ds", "data science", "ai & ds"} -> "DS"`

---

## 3. Recruiter Radar Fit Scoring Model

For eligible candidates, the system generates a 5-axis Radar Fit Score ($0.0 \text{ to } 100.0\%$) reflecting alignment with the specific hiring requirements of a job.

### 3.1 Composite Fit Formula

$$\text{FitScore} = 0.40 \cdot S_{\text{domain}} + 0.30 \cdot S_{\text{tech\_depth}} + 0.15 \cdot S_{\text{evidence}} + 0.15 \cdot S_{\text{baseline}}$$

Where:
- $S_{\text{domain}}$: Ratio of mandatory required skills matched by the candidate.
  $$S_{\text{domain}} = \frac{\sum_{i \in \text{Mandatory}} \mathbb{I}(\text{hasSkill}(C, i))}{|\text{Mandatory}|} \times 100$$
- $S_{\text{tech\_depth}}$: Normalized proficiency alignment.
  $$S_{\text{tech\_depth}} = \frac{1}{|J.\text{skills}|} \sum_{k \in J.\text{skills}} \min\left(1.0, \frac{\text{Proficiency}_{\text{candidate}}(k)}{\text{Proficiency}_{\text{required}}(k)}\right) \times 100$$
- $S_{\text{evidence}}$: Proportion of matched skills backed by verified assessments or projects.
- $S_{\text{baseline}}$: Global readiness score from Engine 1.

---

## 4. Conflict-Aware Interval Overlap Scheduling Algorithm

The drive scheduler checks proposed interview and assessment slots against resource commitments and institutional constraints.

### 4.1 Interval Intersection Check

Given proposed slot $I_{\text{prop}} = [s_p, e_p]$ and existing event $I_k = [s_k, e_k]$:

$$\text{Collides}(I_{\text{prop}}, I_k) \iff \max(s_p, s_k) < \min(e_p, e_k)$$

### 4.2 Multi-Constraint Detection Hierarchy

1. **Hard Academic Blackout Collision** ($\text{Severity} = \text{CRITICAL}$):
   $$\exists E \in \text{InstitutionalEvents} \text{ s.t. } E.\text{is\_hard\_blackout} \land \text{Collides}(I_{\text{prop}}, E) \land (\text{Branch} \in E.\text{branches})$$
2. **Physical Venue Collision** ($\text{Severity} = \text{CRITICAL}$):
   $$\exists R \in \text{DriveRounds} \text{ s.t. } R.\text{venue} = \text{Venue}_{\text{prop}} \land \text{Collides}(I_{\text{prop}}, R) \land \neg \text{isVirtual}(R.\text{venue})$$
3. **Candidate Double-Booking** ($\text{Severity} = \text{HIGH}$):
   $$\exists S \in \text{DriveSchedules} \text{ s.t. } S.\text{student\_id} \in \text{Candidates}_{\text{prop}} \land \text{Collides}(I_{\text{prop}}, S)$$
4. **Recruiter Interviewer Double-Booking** ($\text{Severity} = \text{HIGH}$):
   $$\exists S \in \text{DriveSchedules} \text{ s.t. } S.\text{interviewer\_ref} = \text{Interviewer}_{\text{prop}} \land \text{Collides}(I_{\text{prop}}, S)$$

### 4.3 Alternative Slot Recommendation Heuristic

When collisions occur, the engine searches sequentially for the nearest clean alternative:
1. **Same-Day Afternoon Window**: $I_{\text{alt}} = [\text{Date}(s_p) + 14:00, \text{Date}(s_p) + 14:00 + \Delta t]$.
2. **Next Business Day Morning Window**: $I_{\text{alt}} = [\text{NextBusinessDay}(s_p) + 10:00, \text{NextBusinessDay}(s_p) + 10:00 + \Delta t]$.
3. **Subsequent Day Afternoon Window**: $I_{\text{alt}} = [\text{DayAfterNext}(s_p) + 14:00, \text{DayAfterNext}(s_p) + 14:00 + \Delta t]$.
4. **Virtual Delivery Mode**: Same time slot with $\text{Venue} = \text{"Virtual (HackerRank / Secure Sandbox)"}$, clearing physical auditorium and lab collisions.

---

## 5. Explainable AI Ranking Justification Synthesis

To ensure transparent recruiter decision-making without black-box opacity:
1. **Deterministic Template Generator**:
   Produces verified, audit-proof justifications:
   $$\text{Justification} = \text{"Rank \#" } + \text{Rank} + \text{": Demonstrates " } + \text{FitScore} + \text{"\% alignment with " } + \text{Company} + \text{" requirements, meeting " } + M_{\text{met}} + \text{"/" } + M_{\text{total}} + \text{" mandatory benchmarks."}$$
2. **Local LLM Refinement (Ollama / LLaMA 3.2)**:
   Batches candidates in chunks of 10 with strict JSON schema constraints. The LLM contextualizes qualitative portfolio strengths while maintaining the mathematically calculated rank and score.
