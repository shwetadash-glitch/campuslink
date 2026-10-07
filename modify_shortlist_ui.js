const fs = require('fs');
const file = 'frontend/src/app/dashboard/tpo/shortlisting/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace static array
content = content.replace(/const SHORTLISTED_STUDENTS = \[[\s\S]*?\];\s*/, '');

// Import API
if (!content.includes('import { adminApi, ShortlistCandidate }')) {
    content = content.replace('import { ResumeModal } from "@/features/students/ResumeModal";', 'import { ResumeModal } from "@/features/students/ResumeModal";\nimport { adminApi, ShortlistCandidate } from "@/services/adminApi";\nimport { LoadingState } from "@/components/feedback/LoadingState";\nimport { ErrorState } from "@/components/feedback/ErrorState";\nimport { useEffect } from "react";');
}

// Modify component internals
const newComponentTop = `
  const [targetDrive, setTargetDrive] = useState("1");
  const [candidates, setCandidates] = useState<ShortlistCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const fetchShortlist = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminApi.getAiShortlist(parseInt(targetDrive));
        setCandidates(res.candidates || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || "Failed to fetch shortlist");
      } finally {
        setLoading(false);
      }
    };
    fetchShortlist();
  }, [targetDrive]);
`;

content = content.replace(/const \[targetDrive, setTargetDrive\] = useState\("TechCorp Campus Drive 2026"\);\s*const \[selectedStudent, setSelectedStudent\] = useState<any>\(null\);/, newComponentTop);

// Update select options
content = content.replace(
    /<option>TechCorp Campus Drive 2026<\/option>\s*<option>Innovate Intern Hiring<\/option>/,
    '<option value="1">TechCorp Campus Drive 2026</option>\n              <option value="2">Innovate Intern Hiring</option>'
);

// Update stats
content = content.replace(/SHORTLISTED_STUDENTS\.length/g, 'candidates.length');
content = content.replace(/SHORTLISTED_STUDENTS\.filter/g, 'candidates.filter');

// Fix tbody mappings
const newRow = `
                {loading && (
                  <tr><td colSpan={6} className="px-6 py-10"><LoadingState text="Generating AI Shortlist..." /></td></tr>
                )}
                {error && !loading && (
                  <tr><td colSpan={6} className="px-6 py-10"><ErrorState title="Error" message={error} /></td></tr>
                )}
                {!loading && !error && candidates.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">No candidates found for this drive.</td></tr>
                )}
                {!loading && !error && candidates.map((student, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {student.student_identifier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{student.student_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {student.branch}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className={\`text-sm font-black \${student.readiness_score >= 80 ? 'text-emerald-600' : student.readiness_score >= 50 ? 'text-blue-600' : 'text-red-600'}\`}>
                          {Math.round(student.readiness_score)}%
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={\`h-2 rounded-full \${student.readiness_score >= 80 ? 'bg-emerald-500' : student.readiness_score >= 50 ? 'bg-blue-500' : 'bg-red-500'}\`} 
                            style={{ width: \`\${student.readiness_score}%\` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTierBadge(student.tier)}
                      <div className="text-[10px] text-gray-500 mt-2 max-w-xs whitespace-normal leading-tight italic">
                        {student.justification}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition" onClick={() => setSelectedStudent(student)}>View Profile</button>
                    </td>
                  </tr>
                ))}
`;

content = content.replace(/\{SHORTLISTED_STUDENTS\.map\([\s\S]*?\)\)\}/, newRow.trim());

// Update ResumeModal props
content = content.replace(
    /studentId=\{selectedStudent\?\.id\}/,
    'studentId={selectedStudent?.student_id?.toString() || ""}'
);
content = content.replace(
    /studentName=\{selectedStudent\?\.name\}/,
    'studentName={selectedStudent?.student_name}'
);
content = content.replace(
    /readinessScore=\{selectedStudent\?\.score\}/,
    'readinessScore={selectedStudent?.readiness_score}'
);

fs.writeFileSync(file, content);
console.log('shortlisting/page.tsx updated.');
