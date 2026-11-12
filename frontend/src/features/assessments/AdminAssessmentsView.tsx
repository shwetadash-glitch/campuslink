"use client";

import React, { useState, useEffect } from "react";
import {
  assessmentsApi,
  OfficerAssessmentItem,
} from "@/services/assessmentsApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface QuestionDraft {
  title: string;
  question_text: string;
  type: "MCQ" | "DESCRIPTIVE" | "PROGRAMMING" | "APTITUDE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category: string;
  options: Array<{ id: string; text: string }>;
  correct_answer: string;
  marks: number;
  negative_marks: number;
  explanation: string;
}

// -------------------------------------------------------------
// Pre-Calibrated Standard Placement Test Templates
// -------------------------------------------------------------
const TEMPLATE_45MIN_20Q: QuestionDraft[] = [
  {
    title: "Balanced BST Search Complexity",
    question_text: "What is the worst-case time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black Tree)?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Data Structures",
    options: [
      { id: "A", text: "O(1)" },
      { id: "B", text: "O(log n)" },
      { id: "C", text: "O(n)" },
      { id: "D", text: "O(n log n)" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "A balanced BST guarantees tree height is bounded by O(log n), making search, insertion, and deletion O(log n).",
  },
  {
    title: "Queue Full Condition in Circular Queue",
    question_text: "In a Circular Queue of size N using array representation with front and rear pointers, what is the standard condition indicating the queue is full?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Data Structures",
    options: [
      { id: "A", text: "rear == N - 1" },
      { id: "B", text: "(rear + 1) % N == front" },
      { id: "C", text: "front == rear" },
      { id: "D", text: "(front + 1) % N == rear" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "(rear + 1) % N == front indicates that moving rear one position forward would collide with front.",
  },
  {
    title: "QuickSort Worst-Case Scenario",
    question_text: "Under which circumstance does standard QuickSort with first element as pivot exhibit its worst-case time complexity of O(n^2)?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Algorithms",
    options: [
      { id: "A", text: "When input array is uniformly randomized" },
      { id: "B", text: "When input array is already sorted or reverse sorted" },
      { id: "C", text: "When all elements are negative" },
      { id: "D", text: "When array size is an exact power of 2" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "Selecting the first element as pivot on an already sorted array produces partitions of size 0 and n-1 at each step, yielding O(n^2).",
  },
  {
    title: "Dynamic Programming Prerequisite",
    question_text: "Which two primary properties must an optimization problem possess to be effectively solvable using Dynamic Programming?",
    type: "MCQ",
    difficulty: "HARD",
    category: "Algorithms",
    options: [
      { id: "A", text: "Optimal Substructure and Overlapping Subproblems" },
      { id: "B", text: "Greedy Choice Property and Independence" },
      { id: "C", text: "Linear Time Bound and Complete Graph" },
      { id: "D", text: "NP-Completeness and Branch-and-Bound" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "Dynamic Programming requires Optimal Substructure and Overlapping Subproblems.",
  },
  {
    title: "Dijkstra Algorithm Limitation",
    question_text: "Why does Dijkstra’s shortest path algorithm fail on graphs containing negative edge weights?",
    type: "MCQ",
    difficulty: "HARD",
    category: "Algorithms",
    options: [
      { id: "A", text: "It creates an infinite loop in the priority queue" },
      { id: "B", text: "It greedily assumes that adding an edge can never decrease the total path cost of an already finalized node" },
      { id: "C", text: "It only works on directed acyclic graphs (DAGs)" },
      { id: "D", text: "It requires all vertices to have even degree" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "Dijkstra relies on the greedy assumption that non-negative edges guarantee tentative distances never shrink once closed.",
  },
  {
    title: "SQL DELETE vs TRUNCATE",
    question_text: "What is the key functional and operational difference between the SQL commands DELETE and TRUNCATE?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "DBMS",
    options: [
      { id: "A", text: "DELETE is DDL while TRUNCATE is DML" },
      { id: "B", text: "TRUNCATE removes the entire table schema while DELETE only removes data" },
      { id: "C", text: "TRUNCATE deallocates data pages and bypasses row-level triggers, whereas DELETE logs each row deletion and fires triggers" },
      { id: "D", text: "There is no difference; they are exact aliases" },
    ],
    correct_answer: "C",
    marks: 5,
    negative_marks: 1,
    explanation: "TRUNCATE is a fast DDL command deallocating extents without row triggers; DELETE is a logged DML operation.",
  },
  {
    title: "B+ Tree Range Query Efficiency",
    question_text: "Why are B+ Trees preferred over standard B Trees for indexing relational databases that perform frequent range queries?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "DBMS",
    options: [
      { id: "A", text: "Leaf nodes in a B+ Tree are linked sequentially in a linked list" },
      { id: "B", text: "B+ Trees have no non-leaf nodes" },
      { id: "C", text: "B+ Trees store data records exclusively in the root" },
      { id: "D", text: "B+ Trees do not require disk page reading" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "All keys and pointers reside in leaves linked sequentially, allowing range scans without traversing internal nodes.",
  },
  {
    title: "ACID Properties in RDBMS",
    question_text: "Which ACID property guarantees that intermediate, uncommitted changes made by one database transaction are hidden from all concurrent transactions?",
    type: "MCQ",
    difficulty: "EASY",
    category: "DBMS",
    options: [
      { id: "A", text: "Atomicity" },
      { id: "B", text: "Consistency" },
      { id: "C", text: "Isolation" },
      { id: "D", text: "Durability" },
    ],
    correct_answer: "C",
    marks: 5,
    negative_marks: 1,
    explanation: "Isolation ensures concurrent transaction executions leave the database in the same state as serial execution.",
  },
  {
    title: "Process vs Thread Resource Sharing",
    question_text: "Which resource is uniquely allocated to each individual Thread rather than shared among all threads in a Process?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Operating Systems",
    options: [
      { id: "A", text: "Virtual Address Space and Heap Memory" },
      { id: "B", text: "Open File Descriptors" },
      { id: "C", text: "Call Stack and CPU Program Counter (PC)" },
      { id: "D", text: "Global static variables" },
    ],
    correct_answer: "C",
    marks: 5,
    negative_marks: 1,
    explanation: "Threads share address space, heap, and file handles, but maintain independent Stacks and Program Counters.",
  },
  {
    title: "Deadlock Necessary Conditions",
    question_text: "Which of the following is NOT one of the four Coffman conditions necessary for a system Deadlock to occur?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Operating Systems",
    options: [
      { id: "A", text: "Mutual Exclusion" },
      { id: "B", text: "Preemption of resources by kernel" },
      { id: "C", text: "Hold and Wait" },
      { id: "D", text: "Circular Wait" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "The condition is 'No Preemption' (resources cannot be forcibly reclaimed), not preemption.",
  },
  {
    title: "Virtual Memory Page Fault",
    question_text: "When does an Operating System trigger a Page Fault interrupt?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Operating Systems",
    options: [
      { id: "A", text: "When a CPU instruction references a memory page not currently resident in physical RAM" },
      { id: "B", text: "When the hard disk drive encounters a bad sector" },
      { id: "C", text: "When an infinite recursive loop overflows the call stack" },
      { id: "D", text: "When two threads attempt to write to the same cache line" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "A page fault occurs when referenced virtual memory has its valid bit 0 in the page table, requiring disk swap in.",
  },
  {
    title: "TCP vs UDP Transport Protocols",
    question_text: "Which characteristic correctly distinguishes TCP from UDP at the Transport Layer?",
    type: "MCQ",
    difficulty: "EASY",
    category: "Computer Networks",
    options: [
      { id: "A", text: "UDP guarantees in-order segment delivery using sequence numbers" },
      { id: "B", text: "TCP is connection-oriented with flow and congestion control; UDP is connectionless and low-latency" },
      { id: "C", text: "TCP has a smaller header size than UDP (8 bytes vs 20 bytes)" },
      { id: "D", text: "UDP uses a three-way handshake before transmitting payload data" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "TCP provides reliable, ordered stream delivery via handshakes. UDP is connectionless without flow or retransmission overhead.",
  },
  {
    title: "HTTP 401 vs HTTP 403 Status Codes",
    question_text: "What is the precise semantic distinction between HTTP response status codes 401 and 403?",
    type: "MCQ",
    difficulty: "EASY",
    category: "Computer Networks",
    options: [
      { id: "A", text: "401 means Bad Request, while 403 means Internal Server Error" },
      { id: "B", text: "401 indicates Unauthenticated (credentials required); 403 indicates Forbidden (lacking authorized permissions)" },
      { id: "C", text: "401 is used for GET requests, 403 is used for POST requests" },
      { id: "D", text: "401 is experimental; 403 is permanent" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "401 means credentials are unverified/missing. 403 means client identity is known but access is forbidden by policy.",
  },
  {
    title: "DNS Resolution Protocol & Port",
    question_text: "What transport layer protocol and default port number are primarily utilized for standard Domain Name System (DNS) query resolution?",
    type: "MCQ",
    difficulty: "EASY",
    category: "Computer Networks",
    options: [
      { id: "A", text: "UDP Port 53" },
      { id: "B", text: "TCP Port 80" },
      { id: "C", text: "UDP Port 443" },
      { id: "D", text: "TCP Port 25" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "Standard DNS lookups operate over UDP port 53 for low latency.",
  },
  {
    title: "CORS Preflight Requests",
    question_text: "In Cross-Origin Resource Sharing (CORS), what HTTP method does the web browser automatically send as a Preflight request to negotiate permissions?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Web Architecture",
    options: [
      { id: "A", text: "HEAD" },
      { id: "B", text: "OPTIONS" },
      { id: "C", text: "GET" },
      { id: "D", text: "TRACE" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "Browsers issue an HTTP OPTIONS preflight request before complex cross-origin requests.",
  },
  {
    title: "JWT Token Structure",
    question_text: "A JSON Web Token (JWT) is composed of three Base64Url-encoded parts separated by periods. What are these three components in exact sequence?",
    type: "MCQ",
    difficulty: "EASY",
    category: "Web Architecture",
    options: [
      { id: "A", text: "Header, Payload, Signature" },
      { id: "B", text: "Payload, EncryptionKey, Digest" },
      { id: "C", text: "Certificate, Claims, Checksum" },
      { id: "D", text: "Algorithm, Credentials, Hash" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "JWT anatomy consists of Header (algorithm & token type), Payload (claims), and cryptographic Signature.",
  },
  {
    title: "REST API Method Idempotency",
    question_text: "Which of the following HTTP methods is defined as IDEMPOTENT according to the HTTP/1.1 specification (RFC 7231)?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Web Architecture",
    options: [
      { id: "A", text: "POST" },
      { id: "B", text: "PUT" },
      { id: "C", text: "PATCH (when appending values)" },
      { id: "D", text: "CONNECT" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "PUT is idempotent: multiple identical requests produce the same end server state as a single request.",
  },
  {
    title: "SOLID Principles - Open/Closed Principle",
    question_text: "What is the core directive of the Open/Closed Principle (the 'O' in SOLID software design)?",
    type: "MCQ",
    difficulty: "EASY",
    category: "Software Engineering",
    options: [
      { id: "A", text: "Software entities should be open for extension, but closed for modification" },
      { id: "B", text: "Databases should remain open to read replicas but closed to write operations" },
      { id: "C", text: "Classes must have open public fields and closed private methods" },
      { id: "D", text: "Every module must be open-source with closed dependencies" },
    ],
    correct_answer: "A",
    marks: 5,
    negative_marks: 1,
    explanation: "Entities should be extendable with new functionality without editing existing tested code.",
  },
  {
    title: "JavaScript Event Loop Priority",
    question_text: "In the Node.js / Browser JavaScript concurrency model, in what order are execution queues processed after the current Call Stack clears?",
    type: "MCQ",
    difficulty: "HARD",
    category: "Full-Stack Architecture",
    options: [
      { id: "A", text: "Macrotask Queue (setTimeout/setInterval) before Microtask Queue (Promises)" },
      { id: "B", text: "Microtask Queue (Promises) is completely emptied before processing the next Macrotask" },
      { id: "C", text: "Both queues are executed in round-robin alternating order" },
      { id: "D", text: "Tasks are executed according to their memory allocation size" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "Microtasks (resolved Promise callbacks) are drained completely before the next macrotask executes.",
  },
  {
    title: "Race Condition Prevention via Mutex",
    question_text: "How does a Mutual Exclusion (Mutex) lock protect shared data in a multi-threaded application?",
    type: "MCQ",
    difficulty: "MEDIUM",
    category: "Full-Stack Architecture",
    options: [
      { id: "A", text: "It duplicates the database on every thread launch" },
      { id: "B", text: "It permits only one thread to enter a critical section at any given time, blocking others until released" },
      { id: "C", text: "It converts asynchronous network requests into UDP packets" },
      { id: "D", text: "It automatically speeds up CPU clock cycles" },
    ],
    correct_answer: "B",
    marks: 5,
    negative_marks: 1,
    explanation: "A mutex serializes critical section access, ensuring only one thread mutates shared state at a time.",
  },
];

const TEMPLATE_30MIN_15Q: QuestionDraft[] = TEMPLATE_45MIN_20Q.slice(0, 15);
const TEMPLATE_20MIN_10Q: QuestionDraft[] = TEMPLATE_45MIN_20Q.slice(0, 10);

export const AdminAssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<OfficerAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    assessment_type: "TECHNICAL",
    duration_minutes: 45,
    total_marks: 100,
    pass_percentage: 60,
    max_attempts: 1,
    is_randomized: true,
    negative_marking_rate: 0.2,
    instructions: "Answer all questions. Strict time limit is enforced. Ensure stable connectivity.",
  });

  // Inline Questions Builder State
  const [questions, setQuestions] = useState<QuestionDraft[]>(TEMPLATE_45MIN_20Q);

  // Preview / Details Modal State
  const [selectedAssessment, setSelectedAssessment] = useState<OfficerAssessmentItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentsApi.getOfficerAssessments({ all: true });
      setAssessments(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load assessments from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleOpenCreateModal = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
    setFormData({
      title: "Core CS & Engineering Placement Assessment 2026",
      code: `CS-ASSESS-${timestamp}`,
      description: "Standard institutional technical placement examination calibrated at 20 questions for 45 minutes.",
      assessment_type: "TECHNICAL",
      duration_minutes: 45,
      total_marks: 100,
      pass_percentage: 60,
      max_attempts: 1,
      is_randomized: true,
      negative_marking_rate: 0.2,
      instructions: "Duration: 45 Minutes. Total Questions: 20 MCQs (5 Marks each). Total Marks: 100. Passing Criteria: 60%.",
    });
    setQuestions(TEMPLATE_45MIN_20Q);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const loadTemplate = (type: "45MIN_20Q" | "30MIN_15Q" | "20MIN_10Q") => {
    const timestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
    if (type === "45MIN_20Q") {
      setFormData((prev) => ({
        ...prev,
        title: "Full-Stack & Algorithms Technical Assessment 2026",
        code: `TECH-45M-${timestamp}`,
        duration_minutes: 45,
        total_marks: 100,
        pass_percentage: 60,
      }));
      setQuestions(TEMPLATE_45MIN_20Q);
    } else if (type === "30MIN_15Q") {
      setFormData((prev) => ({
        ...prev,
        title: "Core Computer Science Placement Test (30 Mins)",
        code: `CS-30M-${timestamp}`,
        duration_minutes: 30,
        total_marks: 75,
        pass_percentage: 60,
      }));
      setQuestions(TEMPLATE_30MIN_15Q);
    } else if (type === "20MIN_10Q") {
      setFormData((prev) => ({
        ...prev,
        title: "Rapid Technical Screening Evaluation (20 Mins)",
        code: `RAPID-20M-${timestamp}`,
        duration_minutes: 20,
        total_marks: 50,
        pass_percentage: 60,
      }));
      setQuestions(TEMPLATE_20MIN_10Q);
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        title: `Question ${prev.length + 1}`,
        question_text: "",
        type: "MCQ",
        difficulty: "MEDIUM",
        category: formData.assessment_type,
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
        correct_answer: "A",
        marks: 5,
        negative_marks: 1,
        explanation: "",
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionDraft, value: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optId: string, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].options = copy[qIndex].options.map((opt) =>
        opt.id === optId ? { ...opt, text } : opt
      );
      return copy;
    });
  };

  const handleSaveAssessment = async (status: "DRAFT" | "PENDING_VERIFICATION") => {
    if (!formData.title.trim()) {
      setCreateError("Please provide an assessment title.");
      return;
    }
    if (!formData.code.trim()) {
      setCreateError("Please provide an assessment code.");
      return;
    }

    if (questions.length === 0) {
      setCreateError("Please add at least one question to the assessment.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setCreateError(`Question #${i + 1} is missing its question text.`);
        return;
      }
      if (q.type === "MCQ") {
        const emptyOpt = q.options.find((o) => !o.text.trim());
        if (emptyOpt) {
          setCreateError(`Question #${i + 1} has an empty option (${emptyOpt.id}). Please fill all choices.`);
          return;
        }
      }
    }

    setCreating(true);
    setCreateError(null);
    try {
      const totalQuestionMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      const computedTotalMarks = totalQuestionMarks > 0 ? totalQuestionMarks : formData.total_marks;

      const payload = {
        ...formData,
        total_marks: computedTotalMarks,
        status,
        questions: questions.map((q, idx) => ({
          title: q.title || `Question ${idx + 1}`,
          question_text: q.question_text,
          type: q.type,
          difficulty: q.difficulty,
          category: q.category || formData.assessment_type,
          options: q.type === "MCQ" ? q.options : null,
          correct_answer: q.correct_answer,
          marks: q.marks,
          negative_marks: q.negative_marks,
          explanation: q.explanation,
        })),
      };

      await assessmentsApi.createAssessment(payload);
      setIsCreateModalOpen(false);
      await fetchAssessments();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create assessment.");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitForReview = async (id: number) => {
    setActionLoadingId(id);
    try {
      await assessmentsApi.submitForVerification(id);
      await fetchAssessments();
    } catch (err: any) {
      alert(err?.message || "Failed to submit assessment for verification.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    setActionLoadingId(id);
    try {
      await assessmentsApi.deleteAssessment(id);
      await fetchAssessments();
    } catch (err: any) {
      alert(err?.message || "Failed to delete assessment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const totalCount = assessments.length;
  const pendingCount = assessments.filter((a) => a.status === "PENDING_VERIFICATION").length;
  const publishedCount = assessments.filter((a) => a.status === "PUBLISHED").length;
  const rejectedCount = assessments.filter((a) => a.status === "REJECTED").length;

  const filteredAssessments = assessments.filter((a) => {
    if (statusFilter === "ALL") return true;
    return a.status === statusFilter;
  });

  // Calculate pacing ratio
  const pacingRatio = questions.length > 0 ? (formData.duration_minutes / questions.length) : 0;
  const isPacingOptimal = pacingRatio >= 1.2 && pacingRatio <= 3.0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white border border-campusblue-100 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
              Stage 1 &bull; Admin Hub
            </span>
            <span className="text-2xs text-gray-400">&bull; Assessment Engineering</span>
          </div>
          <h2 className="text-xl font-black text-campusblue-900 mt-1">
            Assessment Creation &amp; Management Hub
          </h2>
          <p className="text-xs text-campusblue-600 mt-0.5">
            Design technical examinations with time-calibrated question counts, define rubrics, and submit them for authoritative TPO verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAssessments} disabled={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
            <span className="font-bold">+ Create New Assessment</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-campusblue-100 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Total Created</span>
          <div className="text-2xl font-black text-campusblue-900 mt-1">{totalCount}</div>
          <div className="text-2xs text-campusblue-600 mt-1">Total configured evaluations</div>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-700">Awaiting TPO Review</span>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">Action Needed</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
          <div className="text-2xs text-amber-700 mt-1">Submitted to Placement Officer</div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Verified &amp; Live</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{publishedCount}</div>
          <div className="text-2xs text-emerald-700 mt-1">Approved by TPO &bull; Student accessible</div>
        </div>

        <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-rose-700">Revisions Needed</span>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</div>
          <div className="text-2xs text-rose-700 mt-1">Flagged with feedback by TPO</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-campusblue-100 pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: "ALL", label: `All (${totalCount})` },
            { id: "PENDING_VERIFICATION", label: `Pending TPO Review (${pendingCount})` },
            { id: "PUBLISHED", label: `Verified & Active (${publishedCount})` },
            { id: "REJECTED", label: `Flagged / Revisions (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-campusblue-900 text-white"
                  : "bg-white text-campusblue-700 hover:bg-campusblue-50 border border-campusblue-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assessments Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-campusblue-100 p-12 text-center text-sm text-campusblue-500 animate-pulse">
          Loading assessments telemetry...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-campusblue-100 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-campusblue-50 text-campusblue-600 flex items-center justify-center mx-auto text-xl">
            📋
          </div>
          <h3 className="text-base font-bold text-campusblue-900">No assessments found</h3>
          <p className="text-xs text-campusblue-600 max-w-md mx-auto">
            {statusFilter === "ALL"
              ? "No assessments have been created yet. Click '+ Create New Assessment' above to configure one."
              : `No assessments found matching the '${statusFilter}' status filter.`}
          </p>
          {statusFilter === "ALL" && (
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              + Create Assessment
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-campusblue-50/80 text-campusblue-800 uppercase tracking-wider text-2xs font-bold border-b border-campusblue-100">
                <tr>
                  <th className="py-3 px-4">Assessment</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Duration &amp; Pacing</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-campusblue-50">
                {filteredAssessments.map((a) => {
                  const qCount = a.questions_count ?? 0;
                  const pace = qCount > 0 ? (a.duration_minutes / qCount).toFixed(1) : "N/A";

                  return (
                    <tr key={a.id} className="hover:bg-campusblue-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-campusblue-900 text-sm">{a.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-2xs text-campusblue-500">{a.code}</span>
                          {a.drive && (
                            <span className="text-2xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {a.drive.name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-campusblue-100 text-campusblue-800">
                          {a.assessment_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-campusblue-800">
                        <div>
                          <span className="font-bold">{a.duration_minutes}</span> mins &bull;{" "}
                          <span className="font-bold">{a.total_marks}</span> pts
                        </div>
                        <div className="text-2xs text-campusblue-500 mt-0.5">
                          Pacing: <span className="font-semibold text-campusblue-700">{pace} mins/q</span> &bull; Pass:{" "}
                          <span className="font-semibold text-campusblue-700">{a.pass_percentage}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-campusblue-900 text-sm">{qCount}</span>
                        <span className="text-2xs text-campusblue-500 block">questions</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {a.status === "PENDING_VERIFICATION" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                              Awaiting TPO Review
                            </span>
                          )}
                          {a.status === "PUBLISHED" && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Verified &amp; Active
                              </span>
                              {a.metadata?.verification?.verified_by_name && (
                                <div className="text-3xs text-emerald-700 mt-0.5 font-medium">
                                  by {a.metadata.verification.verified_by_name}
                                </div>
                              )}
                            </div>
                          )}
                          {a.status === "REJECTED" && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                ⚠ Revisions Requested
                              </span>
                              {a.metadata?.rejection?.reason && (
                                <div className="text-3xs text-rose-700 mt-0.5 italic max-w-xs truncate" title={a.metadata.rejection.reason}>
                                  &quot;{a.metadata.rejection.reason}&quot;
                                </div>
                              )}
                            </div>
                          )}
                          {a.status === "DRAFT" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-gray-100 text-gray-700">
                              Draft
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-2xs"
                            onClick={() => setSelectedAssessment(a)}
                          >
                            View Paper ({qCount})
                          </Button>

                          {(a.status === "DRAFT" || a.status === "REJECTED") && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-2xs bg-amber-600 hover:bg-amber-700"
                              disabled={actionLoadingId === a.id}
                              onClick={() => handleSubmitForReview(a.id)}
                            >
                              Submit to TPO
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-2xs text-rose-600 hover:bg-rose-50"
                            disabled={actionLoadingId === a.id}
                            onClick={() => handleDelete(a.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ASSESSMENT MODAL WITH QUESTION & TIMING CALIBRATOR */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create & Configure Assessment"
        subtitle="Configure the examination rules, balance duration with appropriate question count, and submit for TPO verification."
        size="3xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {createError}
            </div>
          )}

          {/* Quick Preset Template Loader */}
          <div className="bg-campusblue-50/70 border border-campusblue-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-black uppercase tracking-wider text-campusblue-800">
                ⚡ Quick Standard Templates (Appropriate Questions for Duration):
              </span>
              <span className="text-3xs text-campusblue-500 font-medium">1-Click Auto-Fill</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadTemplate("45MIN_20Q")}
                className="px-3 py-1.5 rounded-md bg-white border border-campusblue-300 text-campusblue-900 text-2xs font-bold hover:bg-campusblue-100 transition cursor-pointer shadow-xs"
              >
                🎯 45 Mins &bull; 20 Questions (Optimal Technical Pace: 2.25m/q)
              </button>
              <button
                type="button"
                onClick={() => loadTemplate("30MIN_15Q")}
                className="px-3 py-1.5 rounded-md bg-white border border-campusblue-300 text-campusblue-900 text-2xs font-bold hover:bg-campusblue-100 transition cursor-pointer shadow-xs"
              >
                ⏱️ 30 Mins &bull; 15 Questions (2.0m/q)
              </button>
              <button
                type="button"
                onClick={() => loadTemplate("20MIN_10Q")}
                className="px-3 py-1.5 rounded-md bg-white border border-campusblue-300 text-campusblue-900 text-2xs font-bold hover:bg-campusblue-100 transition cursor-pointer shadow-xs"
              >
                ⚡ 20 Mins &bull; 10 Questions (2.0m/q)
              </button>
            </div>
          </div>

          {/* Real-Time Pacing Advisor */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
              isPacingOptimal
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-amber-50 border-amber-300 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{isPacingOptimal ? "✓" : "⚠️"}</span>
              <div>
                <span className="font-bold block">
                  Pacing Calibration: {pacingRatio.toFixed(1)} mins per question ({questions.length} questions for {formData.duration_minutes} minutes)
                </span>
                <span className="text-2xs opacity-90">
                  {isPacingOptimal
                    ? "Optimal pacing: Matches corporate placement benchmarks (1.5 - 2.5 minutes per MCQ)."
                    : "Pacing imbalance: For a 45-minute examination, 20-30 questions is typical. Consider loading the 20-question preset above."}
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded text-2xs font-bold uppercase shrink-0 ${
                isPacingOptimal ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
              }`}
            >
              {isPacingOptimal ? "Well Balanced" : "Adjust Pacing"}
            </span>
          </div>

          {/* Section 1: General Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-700 border-b border-campusblue-100 pb-1">
              1. Basic Examination Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Engineering Aptitude & Coding Test"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Assessment Code (Slug) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. TECH-FS-2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Category / Assessment Type
                </label>
                <select
                  value={formData.assessment_type}
                  onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                >
                  <option value="TECHNICAL">TECHNICAL (Core Engineering / CS)</option>
                  <option value="APTITUDE">APTITUDE (Quant &amp; Analytical)</option>
                  <option value="CODING">CODING (Algorithmic / Data Structures)</option>
                  <option value="REASONING">REASONING (Logical &amp; Verbal)</option>
                  <option value="MIXED">MIXED (Comprehensive Evaluation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min={5}
                  max={360}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Passing Percentage (%) *
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={formData.pass_percentage}
                  onChange={(e) => setFormData({ ...formData, pass_percentage: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-campusblue-900 mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-campusblue-900 mb-1">
                Candidate Instructions
              </label>
              <textarea
                rows={2}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
              />
            </div>
          </div>

          {/* Section 2: Questions Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-campusblue-100 pb-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-700">
                  2. Examination Questions ({questions.length})
                </h4>
                <p className="text-2xs text-campusblue-500">
                  Total marks calculated: {questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0)} pts
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddQuestion} className="text-2xs">
                + Add Custom Question
              </Button>
            </div>

            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-campusblue-50/40 border border-campusblue-200 rounded-lg p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-campusblue-900">
                      Q{idx + 1}. {q.title || `Question ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-2xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      rows={2}
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(idx, "question_text", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-2xs font-bold text-campusblue-800 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={q.category}
                        onChange={(e) => handleQuestionChange(idx, "category", e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-campusblue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-campusblue-800 mb-1">
                        Marks
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(idx, "marks", Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-campusblue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-campusblue-800 mb-1">
                        Correct Choice
                      </label>
                      <select
                        value={q.correct_answer}
                        onChange={(e) => handleQuestionChange(idx, "correct_answer", e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-lg border border-campusblue-200 font-bold text-emerald-800"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {q.type === "MCQ" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                              q.correct_answer === opt.id
                                ? "bg-emerald-600 text-white"
                                : "bg-campusblue-200 text-campusblue-800"
                            }`}
                          >
                            {opt.id}
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(idx, opt.id, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 bg-white rounded-md border border-campusblue-200 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 mb-0.5">
                      Explanation / Solution Key (Auditable by TPO)
                    </label>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => handleQuestionChange(idx, "explanation", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white rounded-md border border-campusblue-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-campusblue-100 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={creating}
              onClick={() => handleSaveAssessment("DRAFT")}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={creating}
              onClick={() => handleSaveAssessment("PENDING_VERIFICATION")}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {creating ? "Submitting..." : "Submit for TPO Verification"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW PAPER / DETAILS MODAL */}
      {selectedAssessment && (
        <Modal
          isOpen={!!selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          title={`Question Paper: ${selectedAssessment.title}`}
          subtitle={`Code: ${selectedAssessment.code} • Duration: ${selectedAssessment.duration_minutes}m • Total Marks: ${selectedAssessment.total_marks}`}
          size="3xl"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-campusblue-50/60 p-3 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-campusblue-500 font-medium block text-2xs uppercase">Lifecycle Status</span>
                <span className="font-bold text-campusblue-900">{selectedAssessment.status}</span>
              </div>
              <div>
                <span className="text-campusblue-500 font-medium block text-2xs uppercase">Pass Percentage</span>
                <span className="font-bold text-campusblue-900">{selectedAssessment.pass_percentage}%</span>
              </div>
              <div>
                <span className="text-campusblue-500 font-medium block text-2xs uppercase">Total Questions</span>
                <span className="font-bold text-campusblue-900">{selectedAssessment.questions?.length ?? selectedAssessment.questions_count ?? 0}</span>
              </div>
              <div>
                <span className="text-campusblue-500 font-medium block text-2xs uppercase">Pacing Benchmark</span>
                <span className="font-bold text-emerald-800">
                  {selectedAssessment.questions?.length
                    ? `${(selectedAssessment.duration_minutes / selectedAssessment.questions.length).toFixed(1)} mins/q`
                    : "Calibrated"}
                </span>
              </div>
            </div>

            {selectedAssessment.instructions && (
              <div className="text-xs text-campusblue-700 bg-white border border-campusblue-100 p-3 rounded-lg">
                <span className="font-bold block mb-1">Candidate Instructions:</span>
                {selectedAssessment.instructions}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-700">
                Attached Questions ({selectedAssessment.questions?.length ?? 0})
              </h4>

              {(!selectedAssessment.questions || selectedAssessment.questions.length === 0) ? (
                <div className="text-xs text-campusblue-500 italic p-4 text-center">
                  No questions attached to this assessment.
                </div>
              ) : (
                selectedAssessment.questions.map((q, idx) => (
                  <div key={q.id || idx} className="bg-white border border-campusblue-100 rounded-lg p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-campusblue-900">
                        Q{idx + 1}. {q.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-campusblue-100 text-campusblue-800">
                          {q.category}
                        </span>
                        <span className="text-2xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {q.marks} Marks
                        </span>
                      </div>
                    </div>

                    <p className="text-campusblue-800">{q.question_text}</p>

                    {q.options && Array.isArray(q.options) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-md border text-2xs flex items-center gap-2 ${
                              q.correct_answer === opt.id
                                ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900"
                                : "bg-campusblue-50/50 border-campusblue-100 text-campusblue-800"
                            }`}
                          >
                            <span className="w-4 h-4 rounded bg-white border flex items-center justify-center font-bold text-3xs">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                            {q.correct_answer === opt.id && (
                              <span className="ml-auto text-3xs text-emerald-700 font-bold uppercase">
                                Correct Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-2xs text-campusblue-600 bg-campusblue-50/40 p-2 rounded">
                        <span className="font-semibold">Rationale:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
