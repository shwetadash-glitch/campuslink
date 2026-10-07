const fs = require('fs');
const file = 'frontend/src/services/adminApi.ts';
let content = fs.readFileSync(file, 'utf8');

const interfaces = `
export interface ShortlistCandidate {
  student_id: number;
  student_identifier: string;
  student_name: string;
  branch: string;
  cgpa: string | null;
  readiness_score: number;
  is_eligible: boolean;
  matched_skills: any[];
  partial_skills: any[];
  missing_skills: any[];
  tier: "HIGHLY_EMPLOYABLE" | "QUALIFIED" | "NOT_READY";
  justification: string;
}
`;

if (!content.includes('ShortlistCandidate')) {
    content = content.replace('export const adminApi = {', interfaces + '\nexport const adminApi = {');
}

const method = `
  getAiShortlist: (driveId: number, params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset !== undefined) q.append("offset", params.offset.toString());
    return apiClient.get<{ total: number; candidates: ShortlistCandidate[] }>(
      \`/api/v1/officer/drives/\${driveId}/ai-shortlist?\${q.toString()}\`
    );
  },
`;

if (!content.includes('getAiShortlist:')) {
    content = content.replace('export const adminApi = {', 'export const adminApi = {' + method);
}

fs.writeFileSync(file, content);
console.log('adminApi.ts updated.');
