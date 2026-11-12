<?php
namespace App\Services;

use App\Models\Student;
use App\Models\Job;
use App\Models\SkillGap;
use App\Enums\GapSeverity;

class SkillGapService
{
    private const PROFICIENCY_LEVELS = [
        'BEGINNER' => 1,
        'INTERMEDIATE' => 2,
        'ADVANCED' => 3,
        'EXPERT' => 4,
    ];

    /**
     * In-depth domain-specific recommendations for skills across Cloud, FDE,
     * Data Science, Systems Engineering, AI Product Engineering, and Core Tech.
     */
    private const DETAILED_RECOMMENDATIONS = [
        'linux & operating systems' => [
            'CRITICAL' => "Critical Competency Gap: Linux & OS Internals is missing from your profile and is a foundational requirement for this role.\n• Key Concepts to Master: Linux CLI commands, Bash scripting, process lifecycle (systemd, ps, top, kill), user/group permissions (chmod, chown), file system hierarchy (/etc, /var, /proc), and network diagnostics (netstat, curl, iptables, ss).\n• Actionable Project: Set up a headless Linux server (Ubuntu/Debian), configure secure SSH key authentication, and write an automated Bash script for server health checks, log rotation, and automated cron backups.\n• Interview Readiness Benchmark: Be prepared to troubleshoot broken system services, inspect memory/CPU bottlenecks via CLI, and parse server logs with awk/grep/sed without a GUI.",
            'HIGH' => "High Gap in Linux & Operating Systems: Deepen practical system administration to reach intermediate/advanced production standards.\n• Key Concepts to Master: Shell scripting automation, daemon configuration, systemd unit files, storage mounts (fstab), and basic kernel parameters (sysctl).\n• Actionable Project: Build an automated server bootstrapping script using Bash that provisions dependencies, configures firewall rules (UFW), and deploys a background systemd daemon.\n• Interview Readiness Benchmark: Demonstrate proficiency in live terminal debugging and explain Linux process signals and file descriptor limits.",
            'MEDIUM' => "Moderate Gap in Linux & Operating Systems: Enhance operational fluency and kernel-level insights.\n• Key Concepts to Master: Advanced Bash idioms, POSIX signals, cgroups, namespaces, and performance profiling.\n• Actionable Project: Inspect container isolation mechanisms using Linux cgroups and namespaces manually without Docker.\n• Interview Readiness Benchmark: Explain memory paging, virtual memory vs RSS, and file system caching mechanisms."
        ],
        'computer networking' => [
            'CRITICAL' => "Critical Competency Gap: Computer Networking is absent from your profile and is mandatory for distributed cloud and infrastructure systems.\n• Key Concepts to Master: OSI & TCP/IP models, IPv4/IPv6 subnetting & CIDR notation, DNS record types & resolution flow, TCP 3-way handshake & connection termination, UDP vs TCP trade-offs, HTTP/HTTPS protocols, and SSL/TLS handshakes.\n• Actionable Project: Use Wireshark to capture and analyze an end-to-end HTTPS transaction, inspect DNS lookup packets, and configure a reverse proxy with Nginx routing across virtual hosts.\n• Interview Readiness Benchmark: Confidently explain 'What happens under the hood from typing a URL into the browser until the page renders', including ARP, DNS, TCP handshake, TLS negotiation, and HTTP pipelining.",
            'HIGH' => "High Gap in Computer Networking: Upgrade theoretical knowledge to hands-on network administration and cloud routing.\n• Key Concepts to Master: Routing tables, NAT gateways, VPC peering, firewall security groups, proxy vs reverse proxy, and CDN caching headers.\n• Actionable Project: Configure an Nginx reverse proxy with SSL termination, custom rate limiting, and HTTP health check routing.\n• Interview Readiness Benchmark: Be ready to debug packet loss, latency spikes, and DNS propagation failures using traceroute, mtr, and dig.",
            'MEDIUM' => "Moderate Gap in Computer Networking: Solidify modern cloud networking and protocol optimizations.\n• Key Concepts to Master: HTTP/2 vs HTTP/3 (QUIC), WebSocket full-duplex communication, MTU sizing, and network performance tuning.\n• Actionable Project: Implement a low-latency WebSocket service and analyze connection keep-alive overhead.\n• Interview Readiness Benchmark: Discuss load balancing algorithms (least connection, round robin, IP hash) and SSL session resumption."
        ],
        'cloud platforms (aws / azure / gcp)' => [
            'CRITICAL' => "Critical Competency Gap: Cloud Platforms experience is missing and represents a mandatory pillar for cloud engineering.\n• Key Concepts to Master: Cloud shared responsibility model, IAM access control & policies, Compute instances (EC2/Compute Engine), Object storage (S3/Cloud Storage), Virtual Private Clouds (VPC, subnets, route tables), and basic serverless functions (AWS Lambda/Cloud Functions).\n• Actionable Project: Architect and deploy a 3-tier web app on AWS or GCP: private subnet database, public subnet load balancer, and compute instances inside an auto-scaling group.\n• Interview Readiness Benchmark: Explain how to design for high availability across multiple availability zones and implement secure least-privilege IAM policies without using root/admin credentials.",
            'HIGH' => "High Gap in Cloud Platforms: Need production-level operational and architectural experience.\n• Key Concepts to Master: Multi-AZ architectures, RDS failover, VPC peering, CloudWatch alarms, and Infrastructure as Code (Terraform or CloudFormation).\n• Actionable Project: Write Terraform scripts to provision an entire cloud environment: VPC, security groups, RDS PostgreSQL database, and an ECS Fargate container.\n• Interview Readiness Benchmark: Discuss disaster recovery strategies (RTO/RPO), blue-green deployments, and cloud cost optimization tactics.",
            'MEDIUM' => "Moderate Gap in Cloud Platforms: Elevate infrastructure orchestration and cloud-native security.\n• Key Concepts to Master: Serverless event-driven pipelines, API Gateway configurations, container registries, and centralized logging.\n• Actionable Project: Build an event-driven media processing pipeline using S3 object triggers, Lambda, and SNS/SQS messaging.\n• Interview Readiness Benchmark: Explain cloud security hardening, KMS key management, and zero-trust VPC architecture."
        ],
        'cloud computing (aws / azure / gcp)' => [
            'CRITICAL' => "Critical Competency Gap: Cloud Computing is required for deploying, configuring, and maintaining client systems.\n• Key Concepts to Master: Core cloud services (Compute, Storage, Networking, IAM), container deployment services, and managed cloud databases.\n• Actionable Project: Deploy a containerized full-stack application on AWS ECS or GCP Cloud Run connected to a managed PostgreSQL database with environment secrets injection.\n• Interview Readiness Benchmark: Demonstrate how to deploy, debug, and monitor cloud resources securely using cloud CLIs and infrastructure consoles.",
            'HIGH' => "High Gap in Cloud Computing: Strengthen cloud architecture and automated deployments.\n• Key Concepts to Master: Cloud networking, load balancers, SSL certificates provisioning, and cloud cost management.\n• Actionable Project: Configure CI/CD automated deployment to a cloud container service using GitHub Actions.\n• Interview Readiness Benchmark: Walk through real-world deployment troubleshooting when a cloud service crashes or becomes unresponsive."
        ],
        'database management (sql / postgresql / mongodb)' => [
            'CRITICAL' => "Critical Competency Gap: Database Management is missing from your profile and is essential for data storage, querying, and schema design.\n• Key Concepts to Master: Relational schema design (1NF-3NF), primary & foreign keys, complex multi-table JOINs, GROUP BY aggregations, indexing strategies (B-Tree, GIN), ACID properties, and NoSQL document modeling in MongoDB.\n• Actionable Project: Design and seed a normalized relational database in PostgreSQL for an e-commerce platform; write complex analytical queries with window functions and measure query execution times using EXPLAIN ANALYZE.\n• Interview Readiness Benchmark: Demonstrate how to optimize slow-running SQL queries, design appropriate composite indexes, and choose between SQL vs NoSQL for specific workload characteristics.",
            'HIGH' => "High Gap in Database Management: Advance query optimization and database tuning skills.\n• Key Concepts to Master: Database transactions, row locking, connection pooling, indexing trade-offs, and MongoDB aggregation pipelines.\n• Actionable Project: Refactor slow database queries in an existing application using indexes and benchmark before/after latency under simulated concurrent load.\n• Interview Readiness Benchmark: Explain deadlock detection, query execution plans, and write vs read optimization trade-offs."
        ],
        'database management (sql & nosql)' => [
            'CRITICAL' => "Critical Competency Gap: Database Management (SQL & NoSQL) is required for integrating enterprise data sources.\n• Key Concepts to Master: SQL querying, relational data modeling, MongoDB/NoSQL document structures, data normalization vs denormalization, and ACID guarantees.\n• Actionable Project: Build a microservice with a dual database setup: PostgreSQL for transactional user accounts and MongoDB for flexible document/event storage.\n• Interview Readiness Benchmark: Defend database architecture choices and show competency in designing schemas that balance write throughput and read efficiency."
        ],
        'kubernetes' => [
            'CRITICAL' => "Critical Competency Gap: Kubernetes is missing from your verified profile and is the industry-standard orchestrator for containerized workloads.\n• Key Concepts to Master: Kubernetes architecture (Control Plane, Worker Nodes, kubelet, etcd), Pods, Deployments, ReplicaSets, Services (ClusterIP, NodePort, LoadBalancer), ConfigMaps, Secrets, Ingress controllers, and persistent volumes (PV/PVC).\n• Actionable Project: Set up a local multi-node Minikube or k3s cluster; write complete YAML manifests for a microservice application with zero-downtime rolling updates, resource requests/limits, and readiness/liveness probes.\n• Interview Readiness Benchmark: Troubleshoot broken Pods in CrashLoopBackOff, explain rolling update deployment strategies, and describe how Service discovery works internally via CoreDNS.",
            'HIGH' => "High Gap in Kubernetes: Elevate container orchestration capabilities to production standard.\n• Key Concepts to Master: Horizontal Pod Autoscaling (HPA), Helm package management, Ingress TLS termination, and Pod disruption budgets.\n• Actionable Project: Package a full-stack application into a reusable Helm chart and deploy it with autoscaling under load.\n• Interview Readiness Benchmark: Explain cluster networking (CNI), pod-to-pod communication, and service mesh fundamentals."
        ],
        'git & version control' => [
            'CRITICAL' => "Critical Competency Gap: Version Control with Git/GitHub is essential for collaborative engineering and CI/CD pipelines.\n• Key Concepts to Master: Git repository initialization, staging vs committing, branching strategies (GitFlow, trunk-based), merging vs rebasing, resolving merge conflicts, git stash, cherry-pick, and git bisect.\n• Actionable Project: Create a public GitHub repository demonstrating clean feature-branch workflows, squash merges, conventional commit messages, and a branch protection rule with automated linting.\n• Interview Readiness Benchmark: Confidently resolve complex git merge conflicts in the command line and explain git commit graph internals (blobs, trees, commit objects, HEAD pointer).",
            'HIGH' => "High Gap in Git & Version Control: Elevate version control discipline to enterprise collaborative standards.\n• Key Concepts to Master: Interactive rebase (git rebase -i), submodule management, signing commits with GPG, and writing GitHub Actions workflows.\n• Actionable Project: Author an end-to-end GitHub Actions workflow that executes automated test suites on pull requests and prevents merging on test failures.\n• Interview Readiness Benchmark: Demonstrate how to recover lost commits using git reflog and explain the difference between fast-forward and recursive merge strategies."
        ],
        'cloud security & iam' => [
            'CRITICAL' => "Critical Competency Gap: Cloud Security & IAM is missing and is a vital compliance and protection requirement for infrastructure roles.\n• Key Concepts to Master: Principle of least privilege, Cloud IAM roles, policies and service accounts, multi-factor authentication (MFA), secret management (AWS Secrets Manager/HashiCorp Vault), security groups vs NACLs, data encryption at rest (KMS) & in transit (TLS).\n• Actionable Project: Configure an automated secrets-rotation pipeline where an application dynamically fetches database credentials without hardcoding secrets in code or environment files.\n• Interview Readiness Benchmark: Conduct a security audit on an infrastructure template, identify open ports and over-permissioned IAM roles, and formulate remediation steps.",
            'HIGH' => "High Gap in Cloud Security & IAM: Strengthen cloud governance and defense-in-depth posture.\n• Key Concepts to Master: Zero-trust architecture, CloudTrail audit logging, vulnerability scanning in container registries, and DDoS mitigation with WAF.\n• Actionable Project: Implement automated vulnerability scanning on Docker images in a CI pipeline, blocking builds that contain CVEs with critical severity.\n• Interview Readiness Benchmark: Explain how to contain and remediate a compromised cloud instance or leaked API key incident."
        ],
        'problem solving & practical solutions' => [
            'CRITICAL' => "Critical Competency Gap: Practical Problem Solving is essential for translating messy, ambiguous real-world requirements into functional software.\n• Key Concepts to Master: Requirement decomposition, rapid prototyping, boundary condition handling, data structure selection for real-time constraints, and modular software design.\n• Actionable Project: Build an automated data ingestion and reconciliation tool that parses malformed CSV/JSON logs, cleans invalid entries, and generates a structured summary report.\n• Interview Readiness Benchmark: Demonstrate ability to handle ambiguous problem prompts, ask clarifying architectural questions, and iteratively construct a resilient working solution.",
            'HIGH' => "High Gap in Problem Solving: Elevate edge-case coverage and architectural trade-off evaluation.\n• Key Concepts to Master: Algorithmic time/space complexity analysis, designing for failure, defensive coding, and idempotency.\n• Actionable Project: Refactor a monolithic script into modular, decoupled micro-components with comprehensive error handling and logging.\n• Interview Readiness Benchmark: Walk through live technical troubleshooting, isolating root causes methodically under interviewer questioning."
        ],
        'ai & machine learning (llms & apis)' => [
            'CRITICAL' => "Critical Competency Gap: AI & LLM integration is missing and is required for forward-deployed and modern software workflows.\n• Key Concepts to Master: LLM APIs (OpenAI, Anthropic, Gemini), structured JSON output generation, function calling / tool use, system prompts & prompt engineering, embeddings, and token budget management.\n• Actionable Project: Build an intelligent document question-answering assistant that connects to an external LLM API, enforces strict JSON schema output, and integrates an external database lookup tool.\n• Interview Readiness Benchmark: Explain prompt injection risks, temperature vs top_p parameter trade-offs, and methods for mitigating LLM hallucinations in customer-facing applications.",
            'HIGH' => "High Gap in AI & LLM APIs: Advance from basic prompts to production tool-calling pipelines.\n• Key Concepts to Master: Streaming responses (SSE), semantic caching to reduce token costs, retry policies with exponential backoff, and vector similarity search.\n• Actionable Project: Implement an AI agent loop that interacts with a third-party API (e.g. weather, CRM, or financial data) to answer complex multi-step queries.\n• Interview Readiness Benchmark: Discuss token cost optimization, context window limits, and fallback strategies when AI models rate-limit or fail."
        ],
        'web development & apis' => [
            'CRITICAL' => "Critical Competency Gap: Web Development & APIs is absent from your profile and is required for building full-stack customer deliverables.\n• Key Concepts to Master: RESTful API design principles, HTTP request/response lifecycles, frontend component architecture, CORS policies, authentication (JWT/OAuth2), and asynchronous data fetching.\n• Actionable Project: Build a full-stack CRUD application with a modern React frontend and a FastAPI/Node.js backend, including token authentication, data validation, and error toast alerts.\n• Interview Readiness Benchmark: Be prepared to design clean RESTful endpoints for a complex domain model, explain HTTP status code semantics (201 vs 200, 401 vs 403, 422), and handle state management.",
            'HIGH' => "High Gap in Web Development & APIs: Elevate full-stack engineering to production robustness.\n• Key Concepts to Master: Server-side rendering (SSR), API rate limiting, middleware pipelines, WebSocket integration, and responsive CSS frameworks.\n• Actionable Project: Implement pagination, server-side filtering, and real-time event updates on a dashboard view.\n• Interview Readiness Benchmark: Explain frontend performance optimization (memoization, lazy loading, bundle splitting) and secure cookie storage."
        ],
        'communication & client management' => [
            'CRITICAL' => "Critical Competency Gap: Communication & Stakeholder Engagement is vital for client-facing and forward-deployed engineers.\n• Key Concepts to Master: Technical translation (explaining complex architectures in business terms), active listening, requirement elicitation, product demo delivery, and clear written documentation.\n• Actionable Project: Write a comprehensive Technical Design Document (TDD) and executive pitch deck detailing the architecture, trade-offs, and rollout roadmap of an engineering project.\n• Interview Readiness Benchmark: Successfully conduct an architectural walkthrough, defend technical design decisions respectfully, and handle scope pushback with business empathy.",
            'HIGH' => "High Gap in Client Communication: Polish technical narrative and stakeholder presentation skills.\n• Key Concepts to Master: Conflict resolution, managing customer expectations, writing crisp incident post-mortems, and sprint review demos.\n• Actionable Project: Record a 5-minute technical demo walking through a complex engineering deliverable targeted at both technical and non-technical stakeholders.\n• Interview Readiness Benchmark: Demonstrate poise during behavioural interview scenarios involving shifting client requirements or critical project delays."
        ],
        'adaptability & technical agility' => [
            'CRITICAL' => "Critical Competency Gap: Technical Agility is a key requirement for roles that regularly navigate unfamiliar tech stacks and changing customer codebases.\n• Key Concepts to Master: Rapid learning methodologies, reading unfamiliar open-source codebases, debugging third-party libraries, and polyglot programming fundamentals.\n• Actionable Project: Pick a programming language or framework you have never used before and build a functional CRUD microservice with unit tests in under 48 hours.\n• Interview Readiness Benchmark: Discuss specific instances where you successfully learned an unfamiliar technology under tight deadlines to unblock a project.",
            'HIGH' => "High Gap in Adaptability: Expand breadth across diverse paradigms (OOP, functional, declarative).\n• Key Concepts to Master: Cross-language debugging, paradigm mapping (e.g., Python asyncio vs Go goroutines), and continuous upskilling workflows.\n• Actionable Project: Migrate an existing small utility from Python to Go or TypeScript, comparing execution performance and error handling ergonomics.\n• Interview Readiness Benchmark: Showcase adaptability through concrete examples of handling unexpected scope changes or emergency production migrations."
        ],
        'probability & applied statistics' => [
            'CRITICAL' => "Critical Competency Gap: Probability & Statistics is the mathematical cornerstone of Data Science and machine learning.\n• Key Concepts to Master: Probability distributions (Gaussian, Binomial, Poisson), Central Limit Theorem, hypothesis testing (Z-test, t-test, ANOVA, Chi-Square), p-values, Type I/II errors, confidence intervals, Bayes' theorem, and A/B test sample size calculation.\n• Actionable Project: Design and conduct an end-to-end A/B testing simulation in Python: calculate sample sizes, simulate conversion distributions, perform Welch's t-test, and output confidence interval curves.\n• Interview Readiness Benchmark: Clearly explain p-values to a non-technical stakeholder and derive Bayesian probability updates for diagnostic testing problems.",
            'HIGH' => "High Gap in Probability & Statistics: Deepen statistical inference and experimental design capabilities.\n• Key Concepts to Master: Multiple testing corrections (Bonferroni), power analysis, bootstrapping methods, and non-parametric statistics.\n• Actionable Project: Perform statistical feature selection and correlation analysis on a real-world dataset, checking for multicollinearity with Variance Inflation Factor (VIF).\n• Interview Readiness Benchmark: Solve probability puzzles (e.g. Monty Hall, coin toss streaks) and derive expectation and variance for discrete and continuous distributions."
        ],
        'linear algebra & calculus' => [
            'CRITICAL' => "Critical Competency Gap: Linear Algebra & Calculus is required to understand algorithm optimization and high-dimensional representations in Data Science.\n• Key Concepts to Master: Vectors, matrices, matrix multiplication, determinants, eigenvalues & eigenvectors, Singular Value Decomposition (SVD), Principal Component Analysis (PCA), partial derivatives, gradient vectors, and gradient descent.\n• Actionable Project: Implement PCA from scratch using NumPy (covariance matrix calculation, eigendecomposition, projection onto principal components) and compare against scikit-learn.\n• Interview Readiness Benchmark: Explain the mathematical intuition behind gradient descent optimization, saddle points, and why matrix factorization enables dimensionality reduction.",
            'HIGH' => "High Gap in Linear Algebra & Calculus: Solidify optimization mathematics for neural networks.\n• Key Concepts to Master: Chain rule for multivariable calculus, Jacobian and Hessian matrices, stochastic gradient descent (SGD), and loss function convexity.\n• Actionable Project: Implement a simple 2-layer neural network with backpropagation from scratch using raw NumPy matrix operations.\n• Interview Readiness Benchmark: Derive backpropagation weight update equations step-by-step on a whiteboard."
        ],
        'data wrangling & feature engineering' => [
            'CRITICAL' => "Critical Competency Gap: Data Wrangling & Feature Engineering is missing and accounts for over 70% of day-to-day data science work.\n• Key Concepts to Master: Handling missing data (imputation techniques), outlier detection (IQR, Z-Score), categorical encoding (One-Hot, Target, Ordinal), feature scaling (MinMax, StandardScaler), log transformations, datetime feature extraction, and interaction terms.\n• Actionable Project: Take a messy real-world Kaggle dataset with missing/corrupted rows; build an automated scikit-learn Pipeline incorporating custom transformers for cleaning, scaling, and feature creation.\n• Interview Readiness Benchmark: Discuss how to prevent data leakage during preprocessing and feature engineering, especially when splitting train/test sets.",
            'HIGH' => "High Gap in Data Wrangling: Strengthen automated preprocessing pipelines and feature stores.\n• Key Concepts to Master: Feature importance analysis (SHAP, permutation importance), automated feature selection, and data validation frameworks (Great Expectations).\n• Actionable Project: Construct an end-to-end ETL script with Great Expectations assertions that validates data types and value distributions before modeling.\n• Interview Readiness Benchmark: Explain how to handle high-cardinality categorical variables and severe class imbalance (SMOTE, focal loss, class weights)."
        ],
        'deep learning (tensorflow / pytorch)' => [
            'CRITICAL' => "Critical Competency Gap: Deep Learning is required for modern computer vision, NLP, and deep tabular predictive models.\n• Key Concepts to Master: PyTorch/TensorFlow fundamentals, Tensors, Autograd, neural network modules (nn.Module), activation functions (ReLU, GELU, Softmax), optimizers (AdamW), regularization (Dropout, BatchNorm, LayerNorm), and transfer learning.\n• Actionable Project: Build and train a custom image classifier or sentiment classifier in PyTorch with transfer learning (ResNet or HuggingFace Transformer), implementing learning rate scheduling and early stopping.\n• Interview Readiness Benchmark: Explain vanishing/exploding gradients, internal covariate shift, and architectural differences between CNNs and Transformers.",
            'HIGH' => "High Gap in Deep Learning: Advance architecture tuning and training pipeline optimization.\n• Key Concepts to Master: Mixed-precision training (AMP), learning rate warmups, attention mechanisms, and model export (ONNX, TorchScript).\n• Actionable Project: Fine-tune a pre-trained HuggingFace BERT model on a domain-specific text classification task with evaluation metrics logging in TensorBoard.\n• Interview Readiness Benchmark: Explain self-attention computation complexity (O(N^2)) and discuss strategies for scaling transformer context windows."
        ],
        'data visualization & storytelling (tableau / power bi)' => [
            'CRITICAL' => "Critical Competency Gap: Data Visualization & Storytelling is essential for communicating data science insights to decision makers.\n• Key Concepts to Master: Exploratory data analysis (EDA) with Seaborn/Matplotlib, dashboard creation in Tableau or Power BI, data storytelling principles, color theory for accessibility, and chart selection (distributions, trends, correlations).\n• Actionable Project: Create an interactive Tableau Public or Power BI dashboard analyzing an open dataset with drill-down filters, KPI cards, and an executive narrative summary.\n• Interview Readiness Benchmark: Present a complex dataset finding to an interview panel, translating statistical correlations into concrete business recommendations.",
            'HIGH' => "High Gap in Data Visualization: Polish executive storytelling and interactive dashboard aesthetics.\n• Key Concepts to Master: Dynamic parameters, calculated fields, dashboard performance tuning, and executive KPI design.\n• Actionable Project: Build an interactive Streamlit or Plotly Dash web dashboard with responsive sliders and real-time model inference visualizations.\n• Interview Readiness Benchmark: Critique a poorly designed chart and explain how to redesign it to eliminate chart junk and maximize data-ink ratio."
        ],
        'big data frameworks (apache spark / hadoop)' => [
            'CRITICAL' => "Critical Competency Gap: Big Data Frameworks is required when analytical datasets exceed single-machine RAM.\n• Key Concepts to Master: Distributed computing principles, Apache Spark architecture (Driver, Executors, cluster managers), RDDs vs DataFrames, Spark SQL, transformations vs actions, lazy evaluation, and partitioning strategies.\n• Actionable Project: Write a PySpark data processing job that reads a multi-gigabyte dataset, performs aggregations and window operations, and saves partitioned Parquet files.\n• Interview Readiness Benchmark: Explain the difference between narrow and wide transformations (shuffling) in Spark and how to optimize data skew in joins.",
            'HIGH' => "High Gap in Big Data Frameworks: Master Spark performance optimization and streaming.\n• Key Concepts to Master: Spark execution plans (DAG, Physical Plan), broadcast joins, caching vs checkpointing, and Spark Structured Streaming.\n• Actionable Project: Optimize a slow PySpark job by replacing a shuffle-heavy merge with a broadcast join and tuning partition counts.\n• Interview Readiness Benchmark: Diagnose Spark out-of-memory (OOM) errors and describe how to allocate executor memory and cores effectively."
        ],
        'generative ai & modern ai tools' => [
            'CRITICAL' => "Critical Competency Gap: Modern Generative AI tools are essential for cutting-edge data science and AI applications.\n• Key Concepts to Master: Transformer foundation models, prompt engineering paradigms (Chain-of-Thought, Few-Shot), fine-tuning techniques (LoRA, QLoRA), tokenization, and LLM evaluation benchmarks.\n• Actionable Project: Fine-tune an open-source LLM (such as LLaMA-3 or Mistral) using LoRA on a custom domain dataset and evaluate perplexity and task accuracy.\n• Interview Readiness Benchmark: Explain the mechanics of Low-Rank Adaptation (LoRA) and compare fine-tuning vs Retrieval-Augmented Generation for specific business needs.",
            'HIGH' => "High Gap in Generative AI: Deepen practical implementation of modern generative workflows.\n• Key Concepts to Master: Embeddings models, semantic reranking, prompt caching, and hallucination evaluation frameworks.\n• Actionable Project: Build an automated synthetic data generation and data augmentation pipeline using an open-weights LLM.\n• Interview Readiness Benchmark: Discuss trade-offs between proprietary LLMs (GPT-4, Gemini) and self-hosted open-weights models."
        ],
        'business acumen & analytical curiosity' => [
            'CRITICAL' => "Critical Competency Gap: Business Acumen is required to align technical data solutions with organizational ROI and strategic goals.\n• Key Concepts to Master: Translating ambiguous business problems into quantifiable metrics (LTV, CAC, Churn, ARR), ROI estimation, data-driven hypothesis generation, and stakeholder management.\n• Actionable Project: Author an end-to-end Case Study Proposal: identify a business drop-off in a SaaS funnel, formulate 3 testable hypotheses, outline required data, and propose a predictive model with estimated financial upside.\n• Interview Readiness Benchmark: Walk through product sense and business case study questions during interviews, connecting model accuracy metrics directly to business dollars.",
            'HIGH' => "High Gap in Business Acumen: Enhance domain intuition and metric prioritization.\n• Key Concepts to Master: North Star metrics, cohort analysis, customer segmentation methodologies, and risk assessment.\n• Actionable Project: Perform a cohort retention analysis on a transaction dataset and prepare an executive summary with strategic product recommendations.\n• Interview Readiness Benchmark: Demonstrate the ability to prioritize projects based on technical feasibility vs business impact."
        ],
        'systems programming (c / c++)' => [
            'CRITICAL' => "Critical Competency Gap: Systems Programming in C/C++ is mandatory for low-level systems engineering and high-performance infrastructure.\n• Key Concepts to Master: Pointer arithmetic, dynamic memory allocation (malloc/free, new/delete), RAII, smart pointers (unique_ptr, shared_ptr), move semantics, cache locality, memory alignment, and multi-threaded synchronization (mutexes, atomics, condition variables).\n• Actionable Project: Write a multi-threaded memory-mapped LRU cache in modern C++ (C++17/20) with fine-grained mutex locking or lock-free atomics, verified under concurrent thread stress tests.\n• Interview Readiness Benchmark: Be prepared to write thread-safe data structures on a whiteboard, explain the C++ memory model and vtable dispatch, and debug memory corruption using Valgrind/AddressSanitizer.",
            'HIGH' => "High Gap in Systems Programming: Elevate low-level systems efficiency and concurrency primitives.\n• Key Concepts to Master: Modern C++ features (concepts, coroutines, templates), lock-free data structures, memory barriers, and SIMD vectorization.\n• Actionable Project: Build a high-performance network echo server using epoll in C/C++ capable of handling 10,000+ concurrent connections.\n• Interview Readiness Benchmark: Explain the difference between heap and stack allocation at the assembly level and discuss how false sharing impacts multi-core CPU cache lines."
        ],
        'distributed systems & high availability' => [
            'CRITICAL' => "Critical Competency Gap: Distributed Systems is a core pillar for Systems and Cloud Architecture.\n• Key Concepts to Master: CAP theorem, distributed consensus protocols (Raft, Paxos), leader election, heartbeat mechanisms, RPC frameworks (gRPC/Protocol Buffers), database sharding & replication, idempotency, and message queues (Kafka, RabbitMQ).\n• Actionable Project: Implement the Raft consensus algorithm or a simplified distributed key-value store with leader election and log replication using gRPC in C++, Go, or Python.\n• Interview Readiness Benchmark: Design a globally distributed, fault-tolerant system on a whiteboard, discussing network partition behavior, clock drift (vector clocks), and eventual consistency.",
            'HIGH' => "High Gap in Distributed Systems: Solidify failure detection and recovery in distributed clusters.\n• Key Concepts to Master: Two-Phase Commit (2PC), distributed tracing (OpenTelemetry), rate limiting algorithms (token bucket, leaky bucket), and circuit breakers.\n• Actionable Project: Build a distributed rate limiter using Redis and sliding window counters with high-throughput benchmark tests.\n• Interview Readiness Benchmark: Explain split-brain scenarios in distributed clusters and how quorum consensus prevents data corruption."
        ],
        'system performance & profiling (gdb, strace, perf)' => [
            'CRITICAL' => "Critical Competency Gap: Performance Profiling is required for diagnosing latency spikes, memory leaks, and CPU bottlenecks in production.\n• Key Concepts to Master: Linux debugging and profiling tools: gdb (breakpoints, stack traces, core dumps), strace (system call tracing), lsof, perf (CPU profiling, flame graphs), valgrind (memory leak detection), and top/htop/vmstat.\n• Actionable Project: Write a deliberately inefficient C++ or Python program (with cache misses and memory leaks); profile it using perf and valgrind, generate a FlameGraph, optimize the bottlenecks, and document the speedup.\n• Interview Readiness Benchmark: Given a crashing server process producing a core dump, inspect the backtrace in gdb, identify the segfaulting line, and explain the root cause.",
            'HIGH' => "High Gap in Performance Profiling: Master advanced Linux profiling and eBPF tracing.\n• Key Concepts to Master: eBPF tracing tools (bpftrace, bcc), memory fragmentation analysis, context switch overhead, and I/O wait diagnosis.\n• Actionable Project: Trace file read/write latencies on a running Linux server using bpftrace or strace to locate disk bottlenecks.\n• Interview Readiness Benchmark: Explain how to identify whether a process is CPU-bound, memory-bandwidth-bound, or I/O-bound using standard Linux utilities."
        ],
        'storage & file systems' => [
            'CRITICAL' => "Critical Competency Gap: Storage & File Systems knowledge is essential for systems engineering and high-throughput data processing.\n• Key Concepts to Master: File system structure (inodes, superblocks, directory entries), block devices vs file systems, page cache & dirty pages, synchronous vs asynchronous I/O (O_DIRECT, io_uring), and RAID storage topologies.\n• Actionable Project: Write a simple user-space file storage engine that manages data blocks, an inode table, and persistent disk serialization with crash recovery.\n• Interview Readiness Benchmark: Explain how the Linux Page Cache works, what happens during fsync(), and the trade-offs between buffered I/O and direct I/O.",
            'HIGH' => "High Gap in Storage & File Systems: Deepen modern high-performance I/O knowledge.\n• Key Concepts to Master: io_uring asynchronous I/O interface, NVMe storage architectures, and distributed storage systems (Ceph, MinIO).\n• Actionable Project: Benchmark sequential vs random disk I/O under varying queue depths using fio.\n• Interview Readiness Benchmark: Discuss log-structured merge-trees (LSM trees) vs B-Trees for write-heavy storage workloads."
        ],
        'infrastructure security & access control' => [
            'CRITICAL' => "Critical Competency Gap: Infrastructure Security is mandatory for protecting systems from privilege escalation and remote exploits.\n• Key Concepts to Master: Linux security models, PAM authentication, SELinux/AppArmor mandatory access controls, network iptables/nftables firewall rules, SSH hardening, and buffer overflow mitigations (ASLR, stack canaries).\n• Actionable Project: Harden a Linux server configuration: configure fail2ban, enforce strict iptables firewall policies, disable root SSH logins, and set up auditd event tracking.\n• Interview Readiness Benchmark: Describe how buffer overflow exploits work in memory, how modern compilers mitigate them, and how to verify file integrity with cryptographic hashes.",
            'HIGH' => "High Gap in Infrastructure Security: Advance enterprise security automation and threat modeling.\n• Key Concepts to Master: Zero-trust network architectures, TLS certificate lifecycle, hardware security modules (HSM), and vulnerability auditing.\n• Actionable Project: Implement automated TLS certificate renewal using certbot and configure mutual TLS (mTLS) authentication between two microservices.\n• Interview Readiness Benchmark: Walk through the containment and post-incident investigation steps for a suspected rootkit or privileged access compromise."
        ],
        'problem solving & systems architecture' => [
            'CRITICAL' => "Critical Competency Gap: Systems Architecture is required to design scalable, reliable, and maintainable large-scale software platforms.\n• Key Concepts to Master: System design trade-offs, scalability (vertical vs horizontal), load balancing, caching layers (CDN, Redis), database partitioning & replication, asynchronous message queues, and backpressure handling.\n• Actionable Project: Author an end-to-end System Architecture document for a large-scale service (e.g., URL shortener, YouTube video upload service, or ride-sharing dispatch) with capacity planning and failure analysis.\n• Interview Readiness Benchmark: Lead a 45-minute architectural interview session on a whiteboard, systematically covering requirements, high-level design, data models, scalability bottlenecks, and single-points-of-failure.",
            'HIGH' => "High Gap in Systems Architecture: Polish capacity estimation and fault tolerance design.\n• Key Concepts to Master: Microservices vs monolith trade-offs, service mesh architectures, event sourcing, and CQRS patterns.\n• Actionable Project: Design and benchmark a distributed task queue with worker pools, dead-letter queues, and automatic retry backoff.\n• Interview Readiness Benchmark: Accurately calculate bandwidth, storage, and server capacity estimates given RPS and payload sizing constraints."
        ],
        'generative ai & llms (prompt engineering & apis)' => [
            'CRITICAL' => "Critical Competency Gap: Generative AI & LLMs is the core competency required for an AI Product Engineer.\n• Key Concepts to Master: Large language model architectures, prompt engineering patterns (System-User-Assistant roles, Few-Shot prompting, Chain-of-Thought, ReAct), LLM API integration (OpenAI, Gemini, Anthropic), function calling / tool calling, structured JSON output enforcement, temperature/top_p tuning, and token counting.\n• Actionable Project: Build an AI-powered conversational application with structured JSON function calling that connects to live external APIs and includes token tracking and conversational session state.\n• Interview Readiness Benchmark: Demonstrate how to prevent prompt injection attacks, enforce deterministic JSON output schemas, and optimize token usage to reduce latency and API billing.",
            'HIGH' => "High Gap in Generative AI & LLMs: Advance to enterprise-grade AI integration.\n• Key Concepts to Master: Streaming token generation (Server-Sent Events), multi-model fallback cascades, semantic caching, and LLM rate limit handling.\n• Actionable Project: Implement an AI middleware gateway that intercepts requests, checks semantic cache in Redis, falls back across providers, and logs token costs.\n• Interview Readiness Benchmark: Explain the mathematical relationship between tokens and embeddings, and how to debug model hallucinations systematically."
        ],
        'rag & vector databases (pinecone, chroma)' => [
            'CRITICAL' => "Critical Competency Gap: Retrieval-Augmented Generation (RAG) & Vector Databases is absent from your profile and is essential for grounding AI products on private data.\n• Key Concepts to Master: RAG pipeline architecture, text chunking strategies (fixed size, recursive character, semantic chunking), embedding models (text-embedding-3, BGE, Cohere), vector similarity metrics (cosine, dot product, euclidean), vector databases (Chroma, Pinecone, Qdrant, Weaviate), HNSW indexing, and hybrid search (BM25 + Dense Vectors).\n• Actionable Project: Build an end-to-end production RAG application over a library of PDF documents: ingest and chunk documents, store embeddings in Chroma/Pinecone, retrieve relevant chunks with hybrid search, and pass context to an LLM with citation grounding.\n• Interview Readiness Benchmark: Explain the trade-offs of chunk sizes on retrieval precision vs context window limits, and describe how to solve the 'Lost in the Middle' phenomenon in LLM context windows.",
            'HIGH' => "High Gap in RAG & Vector Databases: Elevate retrieval accuracy and production RAG performance.\n• Key Concepts to Master: Contextual compression, cross-encoder reranking (Cohere Rerank), reciprocal rank fusion (RRF), and metadata filtering.\n• Actionable Project: Add a cross-encoder reranker stage to a RAG pipeline and measure retrieval precision improvements on a benchmark QA dataset.\n• Interview Readiness Benchmark: Discuss strategies for updating vector indexes in real-time when documents are edited or deleted without full re-indexing."
        ],
        'ai agent frameworks (langchain, llamaindex)' => [
            'CRITICAL' => "Critical Competency Gap: AI Agent Frameworks is missing and is required for autonomous, multi-step problem solving.\n• Key Concepts to Master: Agent architectures (ReAct, Plan-and-Solve), tool definition and execution, memory management (buffer, summary, vector memory), LangChain / LlamaIndex / LangGraph workflows, and cyclical agent state machines.\n• Actionable Project: Build an autonomous research agent using LangChain or LangGraph that takes a complex user prompt, breaks it down into sub-queries, executes web searches, reads results, and generates a cited synthesis report.\n• Interview Readiness Benchmark: Explain how to prevent infinite agent execution loops, handle tool execution errors gracefully, and maintain state persistence across multi-turn interactions.",
            'HIGH' => "High Gap in AI Agent Frameworks: Master multi-agent collaboration and human-in-the-loop workflows.\n• Key Concepts to Master: Multi-agent coordination (supervisor-worker patterns), human-in-the-loop approvals, deterministic state machines, and session checkpointing.\n• Actionable Project: Implement a multi-agent code generation and verification system where one agent writes code and a second agent runs tests and suggests fixes.\n• Interview Readiness Benchmark: Discuss when autonomous agents are appropriate versus when deterministic workflows with LLM steps should be preferred."
        ],
        'ai model evaluation & guardrails' => [
            'CRITICAL' => "Critical Competency Gap: AI Evaluation & Guardrails is essential for shipping reliable, safe AI products to production.\n• Key Concepts to Master: LLM evaluation frameworks (Ragas, TruLens, DeepEval), evaluation metrics (Faithfulness, Answer Relevance, Context Recall, Hallucination Score), safety guardrails (NeMo Guardrails, Llama Guard), PII redaction, and prompt injection defense.\n• Actionable Project: Create an automated CI/CD evaluation harness for an AI feature: run 50 test test-cases on every PR, calculate Faithfulness and Answer Relevance metrics, and fail the build if hallucination scores exceed 5%.\n• Interview Readiness Benchmark: Detail how you test and evaluate non-deterministic AI features before pushing to production, and demonstrate practical guardrail implementation.",
            'HIGH' => "High Gap in AI Evaluation & Guardrails: Solidify production monitoring and automated evals.\n• Key Concepts to Master: LLM-as-a-judge methodologies, tracing with LangSmith/Arize Phoenix, automated red-teaming, and feedback loop collection.\n• Actionable Project: Set up OpenTelemetry tracing and LangSmith monitoring on an LLM pipeline to trace latency, token costs, and user thumbs-up/down feedback.\n• Interview Readiness Benchmark: Explain how to build a reliable ground-truth golden dataset for evaluating enterprise AI assistants."
        ],
        'ai product acumen & ux design' => [
            'CRITICAL' => "Critical Competency Gap: AI Product Acumen & UX Design is needed to build intuitive, user-centric AI experiences that delight users and deliver measurable ROI.\n• Key Concepts to Master: Designing for non-deterministic interfaces, streaming UI feedback, optimistic updates, citation and attribution display, graceful fallback when models fail, user onboarding for AI, and gathering implicit feedback loops.\n• Actionable Project: Design and implement a full-stack AI chat interface with streaming markdown rendering, interactive citation popovers, copy/retry buttons, and feedback thumbs.\n• Interview Readiness Benchmark: Walk through UX solutions for latency (e.g. streaming, skeleton loaders, intermediate thought display) and explain how to set user expectations to avoid AI trust erosion.",
            'HIGH' => "High Gap in AI Product Acumen: Deepen product metric tracking and user engagement loops.\n• Key Concepts to Master: AI retention metrics, measuring task completion rates, designing corrective feedback mechanisms, and cost-per-active-user modeling.\n• Actionable Project: Write a Product Requirements Document (PRD) for an AI-powered enterprise feature, detailing user stories, UX wireframes, fallback states, and success metrics.\n• Interview Readiness Benchmark: Defend product decisions regarding when to use chat vs autocomplete vs embedded contextual AI widgets."
        ],
        'c++' => [
            'CRITICAL' => "Critical Competency Gap: C++ is missing from your profile and is required for systems, high-performance computing, and infrastructure engineering.\n• Key Concepts to Master: C++ object model, RAII, pointers & references, smart pointers (unique_ptr, shared_ptr), move semantics & rvalue references, STL containers & algorithms, memory layout, and compilation/linking model.\n• Actionable Project: Build a custom high-performance data structure (e.g., lock-free queue or ring buffer) in modern C++ with comprehensive unit tests and benchmark memory efficiency using Valgrind.\n• Interview Readiness Benchmark: Write thread-safe code without leaks, explain copy elision and move semantics, and demonstrate pointer manipulation on a whiteboard.",
            'HIGH' => "High Gap in C++: Deepen modern C++ (C++17/C++20) idioms and performance tuning.\n• Key Concepts to Master: Templates, concepts, constexpr, multithreading with std::thread and atomics, and cache-conscious memory layout.\n• Actionable Project: Implement a thread pool in C++ that accepts arbitrary callable tasks and returns futures with std::future.\n• Interview Readiness Benchmark: Discuss vtable implementation overhead, memory fragmentation, and cache line false sharing."
        ],
        'machine learning' => [
            'CRITICAL' => "Critical Competency Gap: Machine Learning is missing from your profile and is a foundational requirement for this position.\n• Key Concepts to Master: Supervised learning (Linear/Logistic Regression, Decision Trees, Random Forests, Gradient Boosting), unsupervised learning (K-Means, PCA), model evaluation (Confusion Matrix, Precision/Recall, ROC-AUC, F1-Score), cross-validation, and bias-variance tradeoff.\n• Actionable Project: Build an end-to-end predictive pipeline using Scikit-Learn: perform exploratory data analysis, handle missing features, scale variables, train multiple classifiers, and evaluate test set performance with ROC curves.\n• Interview Readiness Benchmark: Explain the mathematical intuition behind gradient boosting, how to diagnose overfitting vs underfitting, and how to choose appropriate evaluation metrics for imbalanced datasets.",
            'HIGH' => "High Gap in Machine Learning: Elevate model tuning, feature engineering, and validation rigour.\n• Key Concepts to Master: Hyperparameter optimization (GridSearchCV, Optuna), feature importance analysis (SHAP values), ensemble methods, and learning curves.\n• Actionable Project: Train an XGBoost model on tabular data, tune hyperparameters using Optuna, explain predictions using SHAP, and deploy as a REST API with FastAPI.\n• Interview Readiness Benchmark: Defend model selection decisions, explain regularization techniques (L1/L2 lasso and ridge), and diagnose data drift."
        ],
        'docker' => [
            'CRITICAL' => "Critical Competency Gap: Containerization with Docker is missing and is required for consistent deployment environments.\n• Key Concepts to Master: Docker architecture, Dockerfile instructions (FROM, RUN, COPY, CMD vs ENTRYPOINT), multi-stage builds, layer caching optimization, container networking, bind mounts vs volumes, and Docker Compose.\n• Actionable Project: Containerize a multi-tier application (frontend, backend, database) with an optimized multi-stage Dockerfile that minimizes image size and runs as a non-root user; orchestrate with Docker Compose.\n• Interview Readiness Benchmark: Explain how Docker layer caching works, how to prevent sensitive secrets from being committed into image layers, and how to debug container network connectivity.",
            'HIGH' => "High Gap in Docker: Enhance container security, image minimization, and orchestration.\n• Key Concepts to Master: Multi-stage builds for minimal distroless images, health checks, resource limits (CPU/memory), and container security scanning.\n• Actionable Project: Optimize an existing application Docker image from 1GB+ down to under 100MB using Alpine/distroless multi-stage builds and scan for vulnerabilities with Trivy.\n• Interview Readiness Benchmark: Discuss container lifecycle management, PID 1 zombie reaping, and graceful shutdown signal handling (SIGTERM)."
        ],
        'aws' => [
            'CRITICAL' => "Critical Competency Gap: AWS cloud experience is missing and is a vital requirement for infrastructure deployment.\n• Key Concepts to Master: Core AWS services: IAM (users, roles, policies), EC2 (instances, security groups, key pairs), S3 (buckets, ACLs, lifecycle rules), VPC (subnets, route tables, internet gateways), and RDS (managed databases).\n• Actionable Project: Deploy a secure web application on AWS: place database in a private subnet, compute instances in public subnets with an Application Load Balancer, and manage assets in an S3 bucket with restricted IAM permissions.\n• Interview Readiness Benchmark: Walk through AWS architecture security best practices, least privilege IAM policies, and cost management using AWS Budgets and Cost Explorer.",
            'HIGH' => "High Gap in AWS: Advance from foundational knowledge to production operational capability.\n• Key Concepts to Master: Auto Scaling groups, CloudWatch alarms, ECS/Fargate container deployments, and Route 53 DNS routing.\n• Actionable Project: Deploy a containerized microservice to AWS ECS Fargate with automated CloudWatch metric alarms and an Application Load Balancer.\n• Interview Readiness Benchmark: Explain disaster recovery strategies across multiple AWS Availability Zones and discuss VPC peering vs transit gateway."
        ],
        'python' => [
            'CRITICAL' => "Critical Competency Gap: Core Python proficiency is missing and is required for backend development, automation, and data pipelines.\n• Key Concepts to Master: Python data structures (lists, dictionaries, sets, tuples), OOP principles, list/dict comprehensions, generators, decorators, exception handling, and file/network I/O.\n• Actionable Project: Build a modular Python command-line utility with unit tests in pytest, comprehensive type annotations, and automated packaging.\n• Interview Readiness Benchmark: Demonstrate mastery of Python memory management, mutable vs immutable types, and write idiomatic, PEP 8 compliant code under interview conditions.",
            'HIGH' => "High Gap in Python: Advance to asynchronous programming and enterprise design patterns.\n• Key Concepts to Master: Asynchronous programming with asyncio, context managers, type hints with mypy, packaging, and performance profiling.\n• Actionable Project: Implement a high-concurrency web scraper or API client using aiohttp and asyncio with semaphore rate-limiting.\n• Interview Readiness Benchmark: Explain the Python Global Interpreter Lock (GIL), multi-threading vs multi-processing vs asyncio, and generator memory advantages."
        ],
        'sql' => [
            'CRITICAL' => "Critical Competency Gap: SQL is missing from your profile and is mandatory for database interaction and data analytics.\n• Key Concepts to Master: Relational algebra, SELECT filtering, multi-table INNER/LEFT/RIGHT JOINs, GROUP BY aggregations, HAVING clauses, subqueries, and table constraints.\n• Actionable Project: Design and seed a relational schema in SQLite or PostgreSQL and write 10 complex analytical queries answering realistic business questions.\n• Interview Readiness Benchmark: Write complex JOINs and aggregation queries on a whiteboard without syntax errors and explain the difference between WHERE and HAVING.",
            'HIGH' => "High Gap in SQL: Master advanced analytical SQL and performance optimization.\n• Key Concepts to Master: Window functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG), Common Table Expressions (CTEs), indexing, and query execution plans (EXPLAIN).\n• Actionable Project: Solve advanced SQL analytics challenges (e.g., month-over-month growth, rolling 7-day averages, retention cohorts) using window functions and CTEs.\n• Interview Readiness Benchmark: Optimize a slow-running SQL query with appropriate B-tree indexes and explain how EXPLAIN ANALYZE reveals sequential scans."
        ],
        'react' => [
            'CRITICAL' => "Critical Competency Gap: React frontend development is missing and is required for building modern web applications.\n• Key Concepts to Master: JSX syntax, component lifecycle, props vs state, React hooks (useState, useEffect, useMemo, useCallback), event handling, and conditional rendering.\n• Actionable Project: Build an interactive single-page application with responsive components, dynamic form validation, and external REST API data fetching.\n• Interview Readiness Benchmark: Explain virtual DOM diffing, component re-rendering triggers, and demonstrate clean custom hook creation.",
            'HIGH' => "High Gap in React: Elevate state management and component architecture to production standard.\n• Key Concepts to Master: Custom hooks, Context API, state management libraries (Zustand/Redux), Next.js App Router, and server components.\n• Actionable Project: Refactor a complex React app to use custom hooks and an optimized state store, eliminating unnecessary component re-renders.\n• Interview Readiness Benchmark: Discuss performance profiling using React DevTools, code splitting with React.lazy, and SSR vs CSR trade-offs."
        ],
        'java' => [
            'CRITICAL' => "Critical Competency Gap: Java is missing from your profile and is required for enterprise backend systems.\n• Key Concepts to Master: Java OOP fundamentals (inheritance, polymorphism, encapsulation, abstraction), Collections framework (List, Set, Map), exception handling, and Streams API.\n• Actionable Project: Build a RESTful web service using Spring Boot with JPA/Hibernate database persistence and unit tests with JUnit and Mockito.\n• Interview Readiness Benchmark: Explain JVM memory layout (Heap vs Stack), Garbage Collection mechanisms, and differences between equals() and ==.",
            'HIGH' => "High Gap in Java: Advance enterprise backend patterns and multi-threading.\n• Key Concepts to Master: Multithreading (ExecutorService, synchronized, volatile), Spring Boot auto-configuration, dependency injection, and microservices architecture.\n• Actionable Project: Implement a thread-safe producer-consumer queue in Java using BlockingQueue and ExecutorService.\n• Interview Readiness Benchmark: Discuss JVM tuning flags, concurrent collections (ConcurrentHashMap), and Spring security filters."
        ],
        'communication' => [
            'CRITICAL' => "Critical Competency Gap: Professional Communication is vital for technical team collaboration and stakeholder alignment.\n• Key Concepts to Master: Clear technical writing, presenting technical designs, active listening, asking clarifying questions, and collaborative code reviews.\n• Actionable Project: Write a comprehensive README and architectural design overview for one of your projects, including setup steps, architectural diagrams, and trade-off rationales.\n• Interview Readiness Benchmark: Deliver structured behavioral responses using the STAR method (Situation, Task, Action, Result) during interview rounds.",
            'HIGH' => "High Gap in Communication: Refine executive communication and technical presentation skills.\n• Key Concepts to Master: Presenting technical proposals to cross-functional teams, handling constructive feedback during code reviews, and meeting facilitation.\n• Actionable Project: Conduct a mock technical presentation or recorded walk-through explaining an engineering feature to a non-technical audience.\n• Interview Readiness Benchmark: Demonstrate active listening and empathy when answering behavioral conflict and teamwork interview questions."
        ],
    ];

    public function analyzeSkillGaps(Student $student, Job $job)
    {
        $student->load('skills.skill');
        $job->load(['requirements.skill', 'company']);

        $studentSkills = $student->skills->keyBy('skill_id');
        
        $matched_skills = [];
        $partial_skills = [];
        $missing_skills = [];
        $gap_records = [];

        $total_mandatory_weight = 0;
        $earned_mandatory_weight = 0;
        $total_preferred_weight = 0;
        $earned_preferred_weight = 0;

        foreach ($job->requirements as $req) {
            $reqLevel = self::PROFICIENCY_LEVELS[$req->required_proficiency->value];
            $studentSkill = $studentSkills->get($req->skill_id);
            $studentLevel = $studentSkill ? self::PROFICIENCY_LEVELS[$studentSkill->proficiency_level->value] : 0;
            
            $weight = $req->weight ?? 1.0;

            if ($req->is_mandatory) {
                $total_mandatory_weight += $weight;
            } else {
                $total_preferred_weight += $weight;
            }

            $diff = $reqLevel - $studentLevel;
            $severity = GapSeverity::NONE;
            $status = 'MATCHED';

            if ($diff > 0) {
                if ($studentLevel === 0) {
                    $severity = $req->is_mandatory ? GapSeverity::CRITICAL : GapSeverity::HIGH;
                    $status = 'MISSING';
                } else {
                    $severity = $diff >= 2 ? GapSeverity::HIGH : GapSeverity::MEDIUM;
                    $status = 'PARTIAL';
                }
            }

            $skillName = $req->skill ? $req->skill->name : "Skill #{$req->skill_id}";
            $studentProf = $studentSkill ? $studentSkill->proficiency_level->value : null;

            $recommendation = $this->generateDetailedRecommendation(
                $skillName,
                $req->required_proficiency->value,
                $severity,
                $status,
                $studentProf
            );

            $item = [
                'skill_id' => $req->skill_id,
                'skill_name' => $skillName,
                'required_proficiency' => $req->required_proficiency->value,
                'student_proficiency' => $studentProf,
                'severity' => $severity->value,
                'is_mandatory' => $req->is_mandatory,
                'recommendation' => $recommendation
            ];

            if ($status === 'MATCHED') {
                $matched_skills[] = $item;
                $earned = $weight;
            } elseif ($status === 'PARTIAL') {
                $partial_skills[] = $item;
                $earned = $weight * ($studentLevel / $reqLevel);
            } else {
                $missing_skills[] = $item;
                $earned = 0;
            }

            if ($req->is_mandatory) {
                $earned_mandatory_weight += $earned;
            } else {
                $earned_preferred_weight += $earned;
            }

            if ($severity !== GapSeverity::NONE) {
                $gap_records[] = [
                    'skill_id' => $req->skill_id,
                    'skill_name' => $skillName,
                    'required_level' => $reqLevel,
                    'current_level' => $studentLevel > 0 ? $studentLevel : null,
                    'required_proficiency' => $req->required_proficiency->value,
                    'student_proficiency' => $studentProf,
                    'gap_severity' => $severity->value,
                    'is_mandatory' => $req->is_mandatory,
                    'status' => $status,
                    'recommendation' => $recommendation
                ];
            }
        }

        $mandatory_score = $total_mandatory_weight > 0 ? ($earned_mandatory_weight / $total_mandatory_weight * 100.0) : 100.0;
        $preferred_score = $total_preferred_weight > 0 ? ($earned_preferred_weight / $total_preferred_weight * 100.0) : 100.0;
        
        $readinessService = app(\App\Services\ReadinessScoringService::class);
        $global = $readinessService->calculateReadiness($student);
        $global_score = $global['overall_score'];

        $job_readiness_score = round(($mandatory_score * 0.60) + ($preferred_score * 0.20) + ($global_score * 0.20), 1);

        // Persist gaps
        SkillGap::where('student_id', $student->id)->where('job_id', $job->id)->delete();
        foreach ($gap_records as $g) {
            SkillGap::create([
                'student_id' => $student->id,
                'job_id' => $job->id,
                'skill_id' => $g['skill_id'],
                'gap_severity' => $g['gap_severity'],
                'current_level' => $g['current_level'],
                'required_level' => $g['required_level'],
                'is_mandatory' => $g['is_mandatory'],
                'recommendation' => $g['recommendation'],
            ]);
        }

        return [
            'job_id' => $job->id,
            'job_title' => $job->title,
            'company_id' => $job->company_id,
            'company_name' => $job->company ? $job->company->name : null,
            'job_readiness_score' => $job_readiness_score,
            'global_readiness_score' => $global_score,
            'mandatory_skills_score' => round($mandatory_score, 1),
            'preferred_skills_score' => round($preferred_score, 1),
            'total_requirements' => count($job->requirements),
            'matched_count' => count($matched_skills),
            'partial_count' => count($partial_skills),
            'missing_count' => count($missing_skills),
            'matched_skills' => $matched_skills,
            'partial_skills' => $partial_skills,
            'missing_skills' => $missing_skills,
            'gaps' => $gap_records,
            'analysis_version' => 'v2.0',
            'analyzed_at' => now()->toIso8601String()
        ];
    }

    /**
     * Generates a multi-dimensional, actionable recommendation tailored to the specific skill and gap.
     * Never returns a simple one-line review.
     */
    public function generateDetailedRecommendation(string $skillName, string $reqProf, GapSeverity $severity, string $status = 'MISSING', ?string $studentProf = null): string
    {
        if ($severity === GapSeverity::NONE || $status === 'MATCHED') {
            return "Proficiency Verified: Your competency satisfies the {$reqProf} requirement for this position. Maintain continuous hands-on practice and explore high-scale production patterns.";
        }

        $normalizedKey = strtolower(trim($skillName));

        // 1. Direct template match
        if (isset(self::DETAILED_RECOMMENDATIONS[$normalizedKey])) {
            $templates = self::DETAILED_RECOMMENDATIONS[$normalizedKey];
            if (isset($templates[$severity->value])) {
                return $templates[$severity->value];
            }
            // Fallback to highest available severity template in this skill
            foreach (['CRITICAL', 'HIGH', 'MEDIUM'] as $k) {
                if (isset($templates[$k])) {
                    return $templates[$k];
                }
            }
        }

        // 2. Partial substring matching for flexible skill variations (e.g. "Linux" matching "Linux & Operating Systems")
        foreach (self::DETAILED_RECOMMENDATIONS as $key => $templates) {
            if (str_contains($normalizedKey, $key) || str_contains($key, $normalizedKey)) {
                if (isset($templates[$severity->value])) {
                    return $templates[$severity->value];
                }
                foreach (['CRITICAL', 'HIGH', 'MEDIUM'] as $k) {
                    if (isset($templates[$k])) {
                        return $templates[$k];
                    }
                }
            }
        }

        // 3. Intelligent structured multi-dimensional generator for any newly added or custom skills
        if ($status === 'MISSING') {
            $urgencyLabel = $severity === GapSeverity::CRITICAL ? 'Mandatory Core Competency Missing' : 'High Priority Skill Gap';
            return "{$urgencyLabel}: {$skillName} is not present in your profile and is required at {$reqProf} level.\n" .
                   "• Key Concepts to Master: Study the foundational architecture, standard libraries, syntax paradigms, and industry idioms governing {$skillName}.\n" .
                   "• Actionable Project: Build an end-to-end practical project incorporating {$skillName} with modular design, unit testing, and complete documentation in your portfolio.\n" .
                   "• Interview Readiness Benchmark: Be prepared to explain core design trade-offs, troubleshoot realistic edge cases, and demonstrate hands-on fluency in technical evaluations.";
        } else {
            // PARTIAL MATCH
            $currentStr = $studentProf ?: 'Current level';
            return "Proficiency Elevation Required: Your current level in {$skillName} ({$currentStr}) must advance to {$reqProf}.\n" .
                   "• Upskilling Focus: Move past introductory syntax into advanced design patterns, edge case handling, performance profiling, and production resilience in {$skillName}.\n" .
                   "• Actionable Project: Refactor or extend an existing implementation to incorporate production-grade {$skillName} best practices and automated testing.\n" .
                   "• Interview Readiness Benchmark: Demonstrate deeper domain mastery, discussing architectural limitations, memory/latency trade-offs, and scaling considerations.";
        }
    }
}
