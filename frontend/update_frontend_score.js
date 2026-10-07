const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\students\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Readiness Score display in table
content = content.replace(
    `<td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                      Not Evaluated
                    </td>`,
    `<td className="px-6 py-4 whitespace-nowrap text-xs">
                      {student.readiness_score ? (
                        <span className={\`font-bold \${student.readiness_score >= 80 ? 'text-emerald-600' : student.readiness_score >= 50 ? 'text-blue-600' : 'text-red-600'}\`}>
                          {Math.round(student.readiness_score)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Not Evaluated</span>
                      )}
                    </td>`
);

// Add readines_score to OfficerStudentItem in services/adminApi.ts
const apiFile = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\services\\adminApi.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');
apiContent = apiContent.replace(
    `backlogs_history: number;`,
    `backlogs_history: number;\n    readiness_score?: number;`
);
fs.writeFileSync(apiFile, apiContent);

// Update ResumeModal prop
content = content.replace(
    `readinessScore={undefined}`,
    `readinessScore={students.find((s) => s.id === selectedStudentId)?.readiness_score}`
);

fs.writeFileSync(file, content);
console.log('Successfully updated frontend to display and pass readiness_score');
