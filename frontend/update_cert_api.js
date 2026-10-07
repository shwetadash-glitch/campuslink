const fs = require('fs');
const path = require('path');

// 1. Update types.ts
const typesFile = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\features\\students\\types.ts';
let typesContent = fs.readFileSync(typesFile, 'utf8');
typesContent = typesContent.replace(
    'credential_id?: string | null;',
    'credential_id?: string | null;\n  proof_path?: string | null;'
);
fs.writeFileSync(typesFile, typesContent);

// 2. Update studentsApi.ts
const apiFile = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\services\\studentsApi.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');
apiContent = apiContent.replace(
    `  createCertification: (data: Omit<StudentCertificationItem, "id">) =>
    apiClient.post<StudentCertificationItem>("/api/v1/students/me/certifications", data),

  updateCertification: (id: number, data: Partial<StudentCertificationItem>) =>
    apiClient.put<StudentCertificationItem>(
      \`/api/v1/students/me/certifications/\${id}\`,
      data
    ),`,
    `  createCertification: (data: FormData) =>
    apiClient.upload<StudentCertificationItem>("/api/v1/students/me/certifications", data),

  updateCertification: (id: number, data: FormData) => {
    data.append("_method", "PUT");
    return apiClient.upload<StudentCertificationItem>(
      \`/api/v1/students/me/certifications/\${id}\`,
      data
    );
  },`
);
fs.writeFileSync(apiFile, apiContent);

console.log('Successfully updated API and Types');
