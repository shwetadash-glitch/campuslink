import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from src.models.all_models import (
    Student, StudentSkill, Job, JobRequirement, Skill, SkillGap
)
from src.models.enums import ProficiencyLevel, GapSeverity
from src.services.readiness import calculate_readiness

PROFICIENCY_NUMERIC: Dict[ProficiencyLevel, int] = {
    ProficiencyLevel.BEGINNER: 1,
    ProficiencyLevel.INTERMEDIATE: 2,
    ProficiencyLevel.ADVANCED: 3,
    ProficiencyLevel.EXPERT: 4,
}

NUMERIC_TO_PROFICIENCY: Dict[int, ProficiencyLevel] = {
    1: ProficiencyLevel.BEGINNER,
    2: ProficiencyLevel.INTERMEDIATE,
    3: ProficiencyLevel.ADVANCED,
    4: ProficiencyLevel.EXPERT,
}

# Domain-grounded syllabus recommendations
SKILL_RECOMMENDATION_TEMPLATES: Dict[str, Dict[str, str]] = {
    "linux & operating systems": {
        "CRITICAL": "Critical Competency Gap: Linux & OS Internals is missing from your profile and is a foundational requirement for this role.\n• Key Concepts to Master: Linux CLI commands, Bash scripting, process lifecycle (systemd, ps, top, kill), user/group permissions (chmod, chown), file system hierarchy (/etc, /var, /proc), and network diagnostics (netstat, curl, iptables, ss).\n• Actionable Project: Set up a headless Linux server (Ubuntu/Debian), configure secure SSH key authentication, and write an automated Bash script for server health checks, log rotation, and automated cron backups.\n• Interview Readiness Benchmark: Be prepared to troubleshoot broken system services, inspect memory/CPU bottlenecks via CLI, and parse server logs with awk/grep/sed without a GUI.",
        "HIGH": "High Gap in Linux & Operating Systems: Deepen practical system administration to reach intermediate/advanced production standards.\n• Key Concepts to Master: Shell scripting automation, daemon configuration, systemd unit files, storage mounts (fstab), and basic kernel parameters (sysctl).\n• Actionable Project: Build an automated server bootstrapping script using Bash that provisions dependencies, configures firewall rules (UFW), and deploys a background systemd daemon.\n• Interview Readiness Benchmark: Demonstrate proficiency in live terminal debugging and explain Linux process signals and file descriptor limits.",
        "MEDIUM": "Moderate Gap in Linux & Operating Systems: Enhance operational fluency and kernel-level insights.\n• Key Concepts to Master: Advanced Bash idioms, POSIX signals, cgroups, namespaces, and performance profiling.\n• Actionable Project: Inspect container isolation mechanisms using Linux cgroups and namespaces manually without Docker.\n• Interview Readiness Benchmark: Explain memory paging, virtual memory vs RSS, and file system caching mechanisms."
    },
    "computer networking": {
        "CRITICAL": "Critical Competency Gap: Computer Networking is absent from your profile and is mandatory for distributed cloud and infrastructure systems.\n• Key Concepts to Master: OSI & TCP/IP models, IPv4/IPv6 subnetting & CIDR notation, DNS record types & resolution flow, TCP 3-way handshake & connection termination, UDP vs TCP trade-offs, HTTP/HTTPS protocols, and SSL/TLS handshakes.\n• Actionable Project: Use Wireshark to capture and analyze an end-to-end HTTPS transaction, inspect DNS lookup packets, and configure a reverse proxy with Nginx routing across virtual hosts.\n• Interview Readiness Benchmark: Confidently explain 'What happens under the hood from typing a URL into the browser until the page renders', including ARP, DNS, TCP handshake, TLS negotiation, and HTTP pipelining.",
        "HIGH": "High Gap in Computer Networking: Upgrade theoretical knowledge to hands-on network administration and cloud routing.\n• Key Concepts to Master: Routing tables, NAT gateways, VPC peering, firewall security groups, proxy vs reverse proxy, and CDN caching headers.\n• Actionable Project: Configure an Nginx reverse proxy with SSL termination, custom rate limiting, and HTTP health check routing.\n• Interview Readiness Benchmark: Be ready to debug packet loss, latency spikes, and DNS propagation failures using traceroute, mtr, and dig.",
        "MEDIUM": "Moderate Gap in Computer Networking: Solidify modern cloud networking and protocol optimizations.\n• Key Concepts to Master: HTTP/2 vs HTTP/3 (QUIC), WebSocket full-duplex communication, MTU sizing, and network performance tuning.\n• Actionable Project: Implement a low-latency WebSocket service and analyze connection keep-alive overhead.\n• Interview Readiness Benchmark: Discuss load balancing algorithms (least connection, round robin, IP hash) and SSL session resumption."
    },
    "cloud platforms (aws / azure / gcp)": {
        "CRITICAL": "Critical Competency Gap: Cloud Platforms experience is missing and represents a mandatory pillar for cloud engineering.\n• Key Concepts to Master: Cloud shared responsibility model, IAM access control & policies, Compute instances (EC2/Compute Engine), Object storage (S3/Cloud Storage), Virtual Private Clouds (VPC, subnets, route tables), and basic serverless functions (AWS Lambda/Cloud Functions).\n• Actionable Project: Architect and deploy a 3-tier web app on AWS or GCP: private subnet database, public subnet load balancer, and compute instances inside an auto-scaling group.\n• Interview Readiness Benchmark: Explain how to design for high availability across multiple availability zones and implement secure least-privilege IAM policies without using root/admin credentials.",
        "HIGH": "High Gap in Cloud Platforms: Need production-level operational and architectural experience.\n• Key Concepts to Master: Multi-AZ architectures, RDS failover, VPC peering, CloudWatch alarms, and Infrastructure as Code (Terraform or CloudFormation).\n• Actionable Project: Write Terraform scripts to provision an entire cloud environment: VPC, security groups, RDS PostgreSQL database, and an ECS Fargate container.\n• Interview Readiness Benchmark: Discuss disaster recovery strategies (RTO/RPO), blue-green deployments, and cloud cost optimization tactics.",
        "MEDIUM": "Moderate Gap in Cloud Platforms: Elevate infrastructure orchestration and cloud-native security.\n• Key Concepts to Master: Serverless event-driven pipelines, API Gateway configurations, container registries, and centralized logging.\n• Actionable Project: Build an event-driven media processing pipeline using S3 object triggers, Lambda, and SNS/SQS messaging.\n• Interview Readiness Benchmark: Explain cloud security hardening, KMS key management, and zero-trust VPC architecture."
    },
    "cloud computing (aws / azure / gcp)": {
        "CRITICAL": "Critical Competency Gap: Cloud Computing is required for deploying, configuring, and maintaining client systems.\n• Key Concepts to Master: Core cloud services (Compute, Storage, Networking, IAM), container deployment services, and managed cloud databases.\n• Actionable Project: Deploy a containerized full-stack application on AWS ECS or GCP Cloud Run connected to a managed PostgreSQL database with environment secrets injection.\n• Interview Readiness Benchmark: Demonstrate how to deploy, debug, and monitor cloud resources securely using cloud CLIs and infrastructure consoles.",
        "HIGH": "High Gap in Cloud Computing: Strengthen cloud architecture and automated deployments.\n• Key Concepts to Master: Cloud networking, load balancers, SSL certificates provisioning, and cloud cost management.\n• Actionable Project: Configure CI/CD automated deployment to a cloud container service using GitHub Actions.\n• Interview Readiness Benchmark: Walk through real-world deployment troubleshooting when a cloud service crashes or becomes unresponsive."
    },
    "database management (sql / postgresql / mongodb)": {
        "CRITICAL": "Critical Competency Gap: Database Management is missing from your profile and is essential for data storage, querying, and schema design.\n• Key Concepts to Master: Relational schema design (1NF-3NF), primary & foreign keys, complex multi-table JOINs, GROUP BY aggregations, indexing strategies (B-Tree, GIN), ACID properties, and NoSQL document modeling in MongoDB.\n• Actionable Project: Design and seed a normalized relational database in PostgreSQL for an e-commerce platform; write complex analytical queries with window functions and measure query execution times using EXPLAIN ANALYZE.\n• Interview Readiness Benchmark: Demonstrate how to optimize slow-running SQL queries, design appropriate composite indexes, and choose between SQL vs NoSQL for specific workload characteristics.",
        "HIGH": "High Gap in Database Management: Advance query optimization and database tuning skills.\n• Key Concepts to Master: Database transactions, row locking, connection pooling, indexing trade-offs, and MongoDB aggregation pipelines.\n• Actionable Project: Refactor slow database queries in an existing application using indexes and benchmark before/after latency under simulated concurrent load.\n• Interview Readiness Benchmark: Explain deadlock detection, query execution plans, and write vs read optimization trade-offs."
    },
    "database management (sql & nosql)": {
        "CRITICAL": "Critical Competency Gap: Database Management (SQL & NoSQL) is required for integrating enterprise data sources.\n• Key Concepts to Master: SQL querying, relational data modeling, MongoDB/NoSQL document structures, data normalization vs denormalization, and ACID guarantees.\n• Actionable Project: Build a microservice with a dual database setup: PostgreSQL for transactional user accounts and MongoDB for flexible document/event storage.\n• Interview Readiness Benchmark: Defend database architecture choices and show competency in designing schemas that balance write throughput and read efficiency."
    },
    "kubernetes": {
        "CRITICAL": "Critical Competency Gap: Kubernetes is missing from your verified profile and is the industry-standard orchestrator for containerized workloads.\n• Key Concepts to Master: Kubernetes architecture (Control Plane, Worker Nodes, kubelet, etcd), Pods, Deployments, ReplicaSets, Services (ClusterIP, NodePort, LoadBalancer), ConfigMaps, Secrets, Ingress controllers, and persistent volumes (PV/PVC).\n• Actionable Project: Set up a local multi-node Minikube or k3s cluster; write complete YAML manifests for a microservice application with zero-downtime rolling updates, resource requests/limits, and readiness/liveness probes.\n• Interview Readiness Benchmark: Troubleshoot broken Pods in CrashLoopBackOff, explain rolling update deployment strategies, and describe how Service discovery works internally via CoreDNS.",
        "HIGH": "High Gap in Kubernetes: Elevate container orchestration capabilities to production standard.\n• Key Concepts to Master: Horizontal Pod Autoscaling (HPA), Helm package management, Ingress TLS termination, and Pod disruption budgets.\n• Actionable Project: Package a full-stack application into a reusable Helm chart and deploy it with autoscaling under load.\n• Interview Readiness Benchmark: Explain cluster networking (CNI), pod-to-pod communication, and service mesh fundamentals."
    },
    "git & version control": {
        "CRITICAL": "Critical Competency Gap: Version Control with Git/GitHub is essential for collaborative engineering and CI/CD pipelines.\n• Key Concepts to Master: Git repository initialization, staging vs committing, branching strategies (GitFlow, trunk-based), merging vs rebasing, resolving merge conflicts, git stash, cherry-pick, and git bisect.\n• Actionable Project: Create a public GitHub repository demonstrating clean feature-branch workflows, squash merges, conventional commit messages, and a branch protection rule with automated linting.\n• Interview Readiness Benchmark: Confidently resolve complex git merge conflicts in the command line and explain git commit graph internals (blobs, trees, commit objects, HEAD pointer).",
        "HIGH": "High Gap in Git & Version Control: Elevate version control discipline to enterprise collaborative standards.\n• Key Concepts to Master: Interactive rebase (git rebase -i), submodule management, signing commits with GPG, and writing GitHub Actions workflows.\n• Actionable Project: Author an end-to-end GitHub Actions workflow that executes automated test suites on pull requests and prevents merging on test failures.\n• Interview Readiness Benchmark: Demonstrate how to recover lost commits using git reflog and explain the difference between fast-forward and recursive merge strategies."
    },
    "cloud security & iam": {
        "CRITICAL": "Critical Competency Gap: Cloud Security & IAM is missing and is a vital compliance and protection requirement for infrastructure roles.\n• Key Concepts to Master: Principle of least privilege, Cloud IAM roles, policies and service accounts, multi-factor authentication (MFA), secret management (AWS Secrets Manager/HashiCorp Vault), security groups vs NACLs, data encryption at rest (KMS) & in transit (TLS).\n• Actionable Project: Configure an automated secrets-rotation pipeline where an application dynamically fetches database credentials without hardcoding secrets in code or environment files.\n• Interview Readiness Benchmark: Conduct a security audit on an infrastructure template, identify open ports and over-permissioned IAM roles, and formulate remediation steps.",
        "HIGH": "High Gap in Cloud Security & IAM: Strengthen cloud governance and defense-in-depth posture.\n• Key Concepts to Master: Zero-trust architecture, CloudTrail audit logging, vulnerability scanning in container registries, and DDoS mitigation with WAF.\n• Actionable Project: Implement automated vulnerability scanning on Docker images in a CI pipeline, blocking builds that contain CVEs with critical severity.\n• Interview Readiness Benchmark: Explain how to contain and remediate a compromised cloud instance or leaked API key incident."
    },
    "docker": {
        "CRITICAL": "Critical Competency Gap: Containerization with Docker is missing and is required for consistent deployment environments.\n• Key Concepts to Master: Docker architecture, Dockerfile instructions (FROM, RUN, COPY, CMD vs ENTRYPOINT), multi-stage builds, layer caching optimization, container networking, bind mounts vs volumes, and Docker Compose.\n• Actionable Project: Containerize a multi-tier application (frontend, backend, database) with an optimized multi-stage Dockerfile that minimizes image size and runs as a non-root user; orchestrate with Docker Compose.\n• Interview Readiness Benchmark: Explain how Docker layer caching works, how to prevent sensitive secrets from being committed into image layers, and how to debug container network connectivity.",
        "HIGH": "High Gap in Docker: Enhance container security, image minimization, and orchestration.\n• Key Concepts to Master: Multi-stage builds for minimal distroless images, health checks, resource limits (CPU/memory), and container security scanning.\n• Actionable Project: Optimize an existing application Docker image from 1GB+ down to under 100MB using Alpine/distroless multi-stage builds and scan for vulnerabilities with Trivy.\n• Interview Readiness Benchmark: Discuss container lifecycle management, PID 1 zombie reaping, and graceful shutdown signal handling (SIGTERM)."
    },
    "aws": {
        "CRITICAL": "Critical Competency Gap: AWS cloud experience is missing and is a vital requirement for infrastructure deployment.\n• Key Concepts to Master: Core AWS services: IAM (users, roles, policies), EC2 (instances, security groups, key pairs), S3 (buckets, ACLs, lifecycle rules), VPC (subnets, route tables, internet gateways), and RDS (managed databases).\n• Actionable Project: Deploy a secure web application on AWS: place database in a private subnet, compute instances in public subnets with an Application Load Balancer, and manage assets in an S3 bucket with restricted IAM permissions.\n• Interview Readiness Benchmark: Walk through AWS architecture security best practices, least privilege IAM policies, and cost management using AWS Budgets and Cost Explorer.",
        "HIGH": "High Gap in AWS: Advance from foundational knowledge to production operational capability.\n• Key Concepts to Master: Auto Scaling groups, CloudWatch alarms, ECS/Fargate container deployments, and Route 53 DNS routing.\n• Actionable Project: Deploy a containerized microservice to AWS ECS Fargate with automated CloudWatch metric alarms and an Application Load Balancer.\n• Interview Readiness Benchmark: Explain disaster recovery strategies across multiple AWS Availability Zones and discuss VPC peering vs transit gateway."
    },
    "python": {
        "CRITICAL": "Critical Competency Gap: Core Python proficiency is missing and is required for backend development, automation, and data pipelines.\n• Key Concepts to Master: Python data structures (lists, dictionaries, sets, tuples), OOP principles, list/dict comprehensions, generators, decorators, exception handling, and file/network I/O.\n• Actionable Project: Build a modular Python command-line utility with unit tests in pytest, comprehensive type annotations, and automated packaging.\n• Interview Readiness Benchmark: Demonstrate mastery of Python memory management, mutable vs immutable types, and write idiomatic, PEP 8 compliant code under interview conditions.",
        "HIGH": "High Gap in Python: Advance to asynchronous programming and enterprise design patterns.\n• Key Concepts to Master: Asynchronous programming with asyncio, context managers, type hints with mypy, packaging, and performance profiling.\n• Actionable Project: Implement a high-concurrency web scraper or API client using aiohttp and asyncio with semaphore rate-limiting.\n• Interview Readiness Benchmark: Explain the Python Global Interpreter Lock (GIL), multi-threading vs multi-processing vs asyncio, and generator memory advantages."
    },
    "sql": {
        "CRITICAL": "Critical Competency Gap: SQL is missing from your profile and is mandatory for database interaction and data analytics.\n• Key Concepts to Master: Relational algebra, SELECT filtering, multi-table INNER/LEFT/RIGHT JOINs, GROUP BY aggregations, HAVING clauses, subqueries, and table constraints.\n• Actionable Project: Design and seed a relational schema in SQLite or PostgreSQL and write 10 complex analytical queries answering realistic business questions.\n• Interview Readiness Benchmark: Write complex JOINs and aggregation queries on a whiteboard without syntax errors and explain the difference between WHERE and HAVING.",
        "HIGH": "High Gap in SQL: Master advanced analytical SQL and performance optimization.\n• Key Concepts to Master: Window functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG), Common Table Expressions (CTEs), indexing, and query execution plans (EXPLAIN).\n• Actionable Project: Solve advanced SQL analytics challenges (e.g., month-over-month growth, rolling 7-day averages, retention cohorts) using window functions and CTEs.\n• Interview Readiness Benchmark: Optimize a slow-running SQL query with appropriate B-tree indexes and explain how EXPLAIN ANALYZE reveals sequential scans."
    },
    "c++": {
        "CRITICAL": "Critical Competency Gap: C++ is missing from your profile and is required for systems, high-performance computing, and infrastructure engineering.\n• Key Concepts to Master: C++ object model, RAII, pointers & references, smart pointers (unique_ptr, shared_ptr), move semantics & rvalue references, STL containers & algorithms, memory layout, and compilation/linking model.\n• Actionable Project: Build a custom high-performance data structure (e.g., lock-free queue or ring buffer) in modern C++ with comprehensive unit tests and benchmark memory efficiency using Valgrind.\n• Interview Readiness Benchmark: Write thread-safe code without leaks, explain copy elision and move semantics, and demonstrate pointer manipulation on a whiteboard.",
        "HIGH": "High Gap in C++: Deepen modern C++ (C++17/C++20) idioms and performance tuning.\n• Key Concepts to Master: Templates, concepts, constexpr, multithreading with std::thread and atomics, and cache-conscious memory layout.\n• Actionable Project: Implement a thread pool in C++ that accepts arbitrary callable tasks and returns futures with std::future.\n• Interview Readiness Benchmark: Discuss vtable implementation overhead, memory fragmentation, and cache line false sharing."
    },
    "machine learning": {
        "CRITICAL": "Critical Competency Gap: Machine Learning is missing from your profile and is a foundational requirement for this position.\n• Key Concepts to Master: Supervised learning (Linear/Logistic Regression, Decision Trees, Random Forests, Gradient Boosting), unsupervised learning (K-Means, PCA), model evaluation (Confusion Matrix, Precision/Recall, ROC-AUC, F1-Score), cross-validation, and bias-variance tradeoff.\n• Actionable Project: Build an end-to-end predictive pipeline using Scikit-Learn: perform exploratory data analysis, handle missing features, scale variables, train multiple classifiers, and evaluate test set performance with ROC curves.\n• Interview Readiness Benchmark: Explain the mathematical intuition behind gradient boosting, how to diagnose overfitting vs underfitting, and how to choose appropriate evaluation metrics for imbalanced datasets.",
        "HIGH": "High Gap in Machine Learning: Elevate model tuning, feature engineering, and validation rigour.\n• Key Concepts to Master: Hyperparameter optimization (GridSearchCV, Optuna), feature importance analysis (SHAP values), ensemble methods, and learning curves.\n• Actionable Project: Train an XGBoost model on tabular data, tune hyperparameters using Optuna, explain predictions using SHAP, and deploy as a REST API with FastAPI.\n• Interview Readiness Benchmark: Defend model selection decisions, explain regularization techniques (L1/L2 lasso and ridge), and diagnose data drift."
    }
}

def generate_recommendation(skill_name: str, required_prof: ProficiencyLevel, severity: GapSeverity) -> str:
    if severity == GapSeverity.NONE:
        return f"Proficiency Verified: Your competency satisfies the {required_prof.value} requirement. Maintain active hands-on practice."
        
    normalized_key = skill_name.lower().strip()
    if normalized_key in SKILL_RECOMMENDATION_TEMPLATES:
        template = SKILL_RECOMMENDATION_TEMPLATES[normalized_key]
        if severity.value in template:
            return template[severity.value]
        for k in ["CRITICAL", "HIGH", "MEDIUM"]:
            if k in template:
                return template[k]

    for key, template in SKILL_RECOMMENDATION_TEMPLATES.items():
        if key in normalized_key or normalized_key in key:
            if severity.value in template:
                return template[severity.value]
            for k in ["CRITICAL", "HIGH", "MEDIUM"]:
                if k in template:
                    return template[k]
            
    # Generic structured fallback - never a single line review
    target_prof_str = required_prof.value.capitalize()
    urgency = "Mandatory Core Competency Gap" if severity in [GapSeverity.CRITICAL, GapSeverity.HIGH] else "Targeted Skill Elevation"
    return (
        f"{urgency}: {skill_name} is required at {target_prof_str} proficiency for this position.\n"
        f"• Key Concepts to Master: Deepen foundational understanding of {skill_name} architecture, syntax idioms, and standard tooling.\n"
        f"• Actionable Project: Develop a documented, hands-on portfolio implementation integrating {skill_name} with automated tests.\n"
        f"• Interview Readiness Benchmark: Be prepared to walk through architectural decisions, debugging methodologies, and edge case handling."
    )

def analyze_skill_gaps(
    db: Session,
    student_id: int,
    job_id: int,
    persist: bool = True
) -> Dict[str, Any]:
    """
    Deterministically computes skill gap analysis for a student against a target job.
    Categorizes skills into MATCHED, PARTIAL, MISSING with severity and tailored recommendations.
    Also calculates job-specific readiness score (0-100%).
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError(f"Student with ID {student_id} not found.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job with ID {job_id} not found.")

    # Student skills map: skill_id -> StudentSkill
    student_skills_map: Dict[int, StudentSkill] = {
        ss.skill_id: ss for ss in (student.skills or [])
    }

    requirements = job.requirements or []
    
    matched_skills = []
    partial_skills = []
    missing_skills = []
    gap_records = []

    total_mandatory_weight = 0.0
    earned_mandatory_weight = 0.0
    total_preferred_weight = 0.0
    earned_preferred_weight = 0.0

    for req in requirements:
        skill = req.skill
        skill_name = skill.name if skill else f"Skill #{req.skill_id}"
        req_numeric = PROFICIENCY_NUMERIC[req.required_proficiency]
        weight = req.weight if req.weight and req.weight > 0 else 1.0

        if req.is_mandatory:
            total_mandatory_weight += weight
        else:
            total_preferred_weight += weight

        if req.skill_id in student_skills_map:
            ss = student_skills_map[req.skill_id]
            student_numeric = PROFICIENCY_NUMERIC[ss.proficiency_level]
            diff = req_numeric - student_numeric

            if diff <= 0:
                # MATCHED
                severity = GapSeverity.NONE
                status = "MATCHED"
                earned = weight
                recommendation = generate_recommendation(skill_name, req.required_proficiency, severity)
                matched_skills.append({
                    "skill_id": req.skill_id,
                    "skill_name": skill_name,
                    "required_proficiency": req.required_proficiency.value,
                    "student_proficiency": ss.proficiency_level.value,
                    "severity": severity.value,
                    "is_mandatory": req.is_mandatory,
                    "recommendation": recommendation
                })
            else:
                # PARTIAL MATCH
                status = "PARTIAL"
                earned = weight * (student_numeric / req_numeric)
                if diff == 1:
                    severity = GapSeverity.LOW if not req.is_mandatory else GapSeverity.MEDIUM
                elif diff == 2:
                    severity = GapSeverity.MEDIUM if not req.is_mandatory else GapSeverity.HIGH
                else:
                    severity = GapSeverity.HIGH if not req.is_mandatory else GapSeverity.CRITICAL
                    
                recommendation = generate_recommendation(skill_name, req.required_proficiency, severity)
                partial_skills.append({
                    "skill_id": req.skill_id,
                    "skill_name": skill_name,
                    "required_proficiency": req.required_proficiency.value,
                    "student_proficiency": ss.proficiency_level.value,
                    "severity": severity.value,
                    "is_mandatory": req.is_mandatory,
                    "recommendation": recommendation
                })
        else:
            # MISSING
            status = "MISSING"
            earned = 0.0
            student_numeric = 0
            if req.is_mandatory:
                if req_numeric >= 3:
                    severity = GapSeverity.CRITICAL
                elif req_numeric == 2:
                    severity = GapSeverity.HIGH
                else:
                    severity = GapSeverity.MEDIUM
            else:
                if req_numeric >= 3:
                    severity = GapSeverity.HIGH
                elif req_numeric == 2:
                    severity = GapSeverity.MEDIUM
                else:
                    severity = GapSeverity.LOW

            recommendation = generate_recommendation(skill_name, req.required_proficiency, severity)
            missing_skills.append({
                "skill_id": req.skill_id,
                "skill_name": skill_name,
                "required_proficiency": req.required_proficiency.value,
                "student_proficiency": None,
                "severity": severity.value,
                "is_mandatory": req.is_mandatory,
                "recommendation": recommendation
            })

        if req.is_mandatory:
            earned_mandatory_weight += earned
        else:
            earned_preferred_weight += earned

        gap_records.append({
            "skill_id": req.skill_id,
            "skill_name": skill_name,
            "required_level": req_numeric,
            "current_level": student_numeric if student_numeric > 0 else None,
            "required_proficiency": req.required_proficiency.value,
            "student_proficiency": NUMERIC_TO_PROFICIENCY[student_numeric].value if student_numeric > 0 else None,
            "gap_severity": severity.value,
            "is_mandatory": req.is_mandatory,
            "status": status,
            "recommendation": recommendation
        })

    # Calculate Job Readiness Score (0 - 100%)
    mandatory_score = (
        (earned_mandatory_weight / total_mandatory_weight * 100.0)
        if total_mandatory_weight > 0 else 100.0
    )
    preferred_score = (
        (earned_preferred_weight / total_preferred_weight * 100.0)
        if total_preferred_weight > 0 else 100.0
    )

    # Get student's global readiness score
    global_readiness_data = calculate_readiness(db, student_id, persist=False)
    global_score = global_readiness_data["overall_score"]

    job_readiness_score = round(
        (mandatory_score * 0.60) + (preferred_score * 0.20) + (global_score * 0.20),
        1
    )

    # Persist in skill_gaps if requested
    if persist and requirements:
        # Delete existing gaps for (student_id, job_id)
        db.query(SkillGap).filter(
            SkillGap.student_id == student_id,
            SkillGap.job_id == job_id
        ).delete()

        for g in gap_records:
            gap_entity = SkillGap(
                student_id=student_id,
                job_id=job_id,
                skill_id=g["skill_id"],
                gap_severity=g["gap_severity"],
                current_level=g["current_level"],
                required_level=g["required_level"],
                is_mandatory=g["is_mandatory"],
                analysis_version="v1.0",
                recommendation=g["recommendation"]
            )
            db.add(gap_entity)
        db.commit()

    return {
        "job_id": job.id,
        "job_title": job.title,
        "company_id": job.company_id,
        "company_name": job.company.name if job.company else None,
        "job_readiness_score": job_readiness_score,
        "global_readiness_score": global_score,
        "mandatory_skills_score": round(mandatory_score, 1),
        "preferred_skills_score": round(preferred_score, 1),
        "total_requirements": len(requirements),
        "matched_count": len(matched_skills),
        "partial_count": len(partial_skills),
        "missing_count": len(missing_skills),
        "matched_skills": matched_skills,
        "partial_skills": partial_skills,
        "missing_skills": missing_skills,
        "gaps": gap_records,
        "analysis_version": "v1.0",
        "analyzed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
