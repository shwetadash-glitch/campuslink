const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\tpo\\shortlisting\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace(
    `import { PageHeader } from "@/components/layout/PageHeader";`,
    `import { PageHeader } from "@/components/layout/PageHeader";\nimport { ResumeModal } from "@/features/students/ResumeModal";`
);

// Add state for modal
content = content.replace(
    `const [targetDrive, setTargetDrive] = useState("TechCorp Campus Drive 2026");`,
    `const [targetDrive, setTargetDrive] = useState("TechCorp Campus Drive 2026");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);`
);

// Update button onClick
content = content.replace(
    /hover:bg-blue-100 transition">View Profile<\/button>/g,
    `hover:bg-blue-100 transition" onClick={() => setSelectedStudent(student)}>View Profile</button>`
);

// Add modal to render
content = content.replace(
    `</AppLayout>`,
    `  <ResumeModal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        studentId={selectedStudent?.id} 
        studentName={selectedStudent?.name}
        readinessScore={selectedStudent?.score}
      />
    </AppLayout>`
);

fs.writeFileSync(file, content);
console.log('Successfully integrated ResumeModal into shortlisting page');
