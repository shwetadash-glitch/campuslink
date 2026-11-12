import re
from sqlalchemy.orm import Session
from src.models.all_models import Student, Job
from typing import Dict, Any, List, Tuple

BRANCH_ALIAS_MAP = {
    # Information Technology
    'it': 'IT',
    'information technology': 'IT',
    'infotech': 'IT',
    'info tech': 'IT',
    'information tech': 'IT',
    'b tech it': 'IT',
    'btech it': 'IT',

    # Computer Science
    'cs': 'CSE',
    'cse': 'CSE',
    'computer science': 'CSE',
    'computer science and engineering': 'CSE',
    'computer science & engineering': 'CSE',
    'computer science engineering': 'CSE',
    'b tech cse': 'CSE',
    'btech cse': 'CSE',

    # Electronics & Communication
    'ece': 'ECE',
    'etc': 'ECE',
    'electronics and communication': 'ECE',
    'electronics and communication engineering': 'ECE',
    'electronics & communication engineering': 'ECE',
    'electronics and telecommunication': 'ECE',
    'electronics & telecommunication': 'ECE',
    'electronics and telecom': 'ECE',
    'b tech ece': 'ECE',
    'btech ece': 'ECE',

    # Electrical & Electronics
    'eee': 'EEE',
    'ee': 'EEE',
    'electrical': 'EEE',
    'electrical engineering': 'EEE',
    'electrical and electronics engineering': 'EEE',
    'electrical & electronics': 'EEE',
    'b tech eee': 'EEE',
    'btech eee': 'EEE',

    # Mechanical
    'me': 'MECH',
    'mech': 'MECH',
    'mechanical': 'MECH',
    'mechanical engineering': 'MECH',
    'b tech mechanical': 'MECH',
    'btech mechanical': 'MECH',

    # Civil
    'ce': 'CIVIL',
    'civil': 'CIVIL',
    'civil engineering': 'CIVIL',
    'b tech civil': 'CIVIL',
    'btech civil': 'CIVIL',

    # AI / ML & Data Science
    'aiml': 'AIML',
    'ai ml': 'AIML',
    'ai/ml': 'AIML',
    'artificial intelligence and machine learning': 'AIML',
    'artificial intelligence & machine learning': 'AIML',
    'ds': 'DS',
    'data science': 'DS',
    'cse data science': 'DS',
    'big data': 'DS',
    'artificial intelligence and data science': 'DS',

    # Chemical
    'chem': 'CHEM',
    'chemical': 'CHEM',
    'chemical engineering': 'CHEM',

    # Biotechnology
    'bt': 'BIOTECH',
    'biotech': 'BIOTECH',
    'biotechnology': 'BIOTECH',
}

def normalize_branch(branch: str | None) -> str:
    if not branch:
        return ''
    cleaned = branch.strip().lower()
    cleaned = re.sub(r'^(b\.?tech|b\.?e\.?|department of)\s+', '', cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace('&', ' and ')
    cleaned = re.sub(r'[\.\-\/]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return BRANCH_ALIAS_MAP.get(cleaned, re.sub(r'[^a-zA-Z0-9]', '', cleaned).upper())

def is_branch_allowed(student_branch: str | None, allowed_branches: list) -> bool:
    if not allowed_branches:
        return True
    for allowed in allowed_branches:
        if str(allowed).strip().upper() == 'ALL':
            return True
    student_canonical = normalize_branch(student_branch)
    if not student_canonical:
        return False
    allowed_canonicals = [normalize_branch(str(b)) for b in allowed_branches]
    if student_canonical in allowed_canonicals:
        return True
    for allowed in allowed_branches:
        if str(student_branch).strip().lower() == str(allowed).strip().lower():
            return True
    return False

def check_hard_eligibility(db: Session, student_id: int, job_id: int) -> Tuple[bool, List[str], List[str]]:
    """
    Evaluates deterministic hard eligibility rules for a student against a job.
    Returns: (is_eligible, reasons, failed_rules)
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    job = db.query(Job).filter(Job.id == job_id).first()

    if not student or not job:
        return False, ["Student or Job not found."], ["not_found"]

    eligibility_config = job.eligibility_config or {}
    
    is_eligible = True
    reasons = []
    failed_rules = []

    # Check CGPA - strict unrounded comparison
    min_cgpa = eligibility_config.get("min_cgpa")
    if min_cgpa is not None:
        if student.cgpa is None:
            is_eligible = False
            reasons.append(f"Student CGPA is missing (Minimum required: {min_cgpa}).")
            failed_rules.append("cgpa_missing")
        elif float(student.cgpa) < float(min_cgpa):
            is_eligible = False
            reasons.append(f"CGPA {student.cgpa} is below the required minimum of {min_cgpa}.")
            failed_rules.append("cgpa_below_minimum")

    # Check allowed branches with canonical normalization
    allowed_branches = eligibility_config.get("allowed_branches")
    if allowed_branches:
        branches_list = allowed_branches if isinstance(allowed_branches, list) else [allowed_branches]
        if not student.branch:
            is_eligible = False
            reasons.append("Student branch is missing.")
            failed_rules.append("branch_missing")
        elif not is_branch_allowed(student.branch, branches_list):
            is_eligible = False
            reasons.append(f"Branch '{student.branch}' is not eligible. Allowed: {', '.join(branches_list)}.")
            failed_rules.append("branch_not_allowed")

    # Check backlogs
    max_backlogs = eligibility_config.get("max_backlogs")
    if max_backlogs is not None:
        student_backlogs = 0
        if student.profile_metadata and "active_backlogs" in student.profile_metadata:
            student_backlogs = student.profile_metadata.get("active_backlogs", 0)
        
        if student_backlogs > max_backlogs:
            is_eligible = False
            reasons.append(f"Active backlogs ({student_backlogs}) exceed maximum allowed ({max_backlogs}).")
            failed_rules.append("backlogs_exceeded")

    # Check graduation year
    req_grad_year = eligibility_config.get("graduation_year")
    if req_grad_year is not None:
        if student.graduation_year != req_grad_year:
            is_eligible = False
            reasons.append(f"Graduation year {student.graduation_year} does not match required {req_grad_year}.")
            failed_rules.append("graduation_year_mismatch")

    if is_eligible:
        reasons.append("Student meets all hard eligibility criteria.")

    return is_eligible, reasons, failed_rules
