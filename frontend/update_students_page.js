const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\students\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import ResumeModal
content = content.replace(
    `import { parseApiError } from "@/services/apiClient";`,
    `import { parseApiError } from "@/services/apiClient";\nimport { ResumeModal } from "@/features/students/ResumeModal";`
);

// 2. Replace the giant Modal rendering block with ResumeModal
const modalStartRegex = /\{selectedStudentId && \(\s*<Modal/s;
const modalEndStr = `</Modal>\n        )}\n      </div>\n    </AppLayout>\n  );\n}`;

// Let's just find everything from `{selectedStudentId && (` to the end of the file and replace it.
// We have to be careful with exact replacement.
const replaceBlockRegex = /\{selectedStudentId && \(\s*<Modal.*?(?=<\/AppLayout>)/s;

content = content.replace(replaceBlockRegex, 
    `<ResumeModal 
        isOpen={!!selectedStudentId} 
        onClose={() => {
          setSelectedStudentId(null);
          setStudentDetail(null);
        }} 
        studentId={selectedStudentId?.toString()} 
        studentName={students.find((s) => s.id === selectedStudentId)?.first_name + ' ' + students.find((s) => s.id === selectedStudentId)?.last_name}
        readinessScore={0}
      />
      `
);

fs.writeFileSync(file, content);
console.log('Successfully replaced old modal with ResumeModal in students directory');
