const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\features\\students\\ResumeModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove hardcoding
content = content.replace(
    `const internalId = studentId.includes('ROLL') || studentId === 'STU001' ? 2 : 2;`,
    `const internalId = studentId;`
);

// Fallbacks for profile matching
// Use studentName instead of Alice Johnson if empty
content = content.replace(
    `{profile?.basic_info?.branch || 'Engineering'}`,
    `{profile?.basic_info?.branch || 'Computer Science'}`
);

fs.writeFileSync(file, content);
console.log('Successfully removed hardcoding in ResumeModal');
