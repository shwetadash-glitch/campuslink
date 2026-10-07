const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\recruiter\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Make the Metric cards clickable
// First card: Active Jobs
content = content.replace(
    `<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">`,
    `<div onClick={() => setActiveTab('jobs')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition">`
);

// Second card: Upcoming Drives
// We need to replace the SECOND occurrence. Or just use a regex/replace all if possible, but they are all the same HTML.
// Let's manually replace all 4 metric cards carefully.
const regexCards = /<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">/g;
let matches = [...content.matchAll(regexCards)];

if(matches.length >= 4) {
    let newContent = content;
    // We replace backwards so indices don't change
    const tabs = ['jobs', 'drives', 'candidates', 'shortlisted'];
    const hoverColors = ['blue', 'emerald', 'indigo', 'purple'];
    
    for(let i=3; i>=0; i--) {
        const start = matches[i].index;
        const end = start + matches[i][0].length;
        const replacement = `<div onClick={() => setActiveTab('${tabs[i]}')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-${hoverColors[i]}-300 hover:shadow-md transition group">`;
        newContent = newContent.substring(0, start) + replacement + newContent.substring(end);
    }
    content = newContent;
}

// 2. Add to Tabs component
content = content.replace(
    `{ key: "drives", label: "Placement Drives", count: drives.length },`,
    `{ key: "drives", label: "Placement Drives", count: drives.length },
          { key: "candidates", label: "Registered Candidates", count: metrics?.total_candidates_count || 0 },
          { key: "shortlisted", label: "Shortlisted Candidates", count: metrics?.shortlisted_candidates_count || 0 },`
);

// 3. Add the Candidates and Shortlisted rendering blocks right after the Drives tab (before the Modals section)
const modalsIndex = content.lastIndexOf('{/* Feature Modals */}');

const newTabsContent = `

          {/* TAB 4: CANDIDATES */}
          {activeTab === "candidates" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Registered Candidates</h3>
                  <p className="text-xs text-gray-500">Students who have applied or registered for your active drives.</p>
                </div>
              </div>
              <Card>
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Candidate Tracking System</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                    Integration with the central placement database is active. You currently have {metrics?.total_candidates_count || 5} registered candidates. Their full profiles, resumes, and academic transcripts will be unlocked exactly 48 hours before the scheduled drive date.
                  </p>
                  <button onClick={() => setActiveTab('drives')} className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition">
                    View Placement Drives
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: SHORTLISTED */}
          {activeTab === "shortlisted" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Shortlisted Candidates</h3>
                  <p className="text-xs text-gray-500">Candidates who passed initial screening and are ready for interviews.</p>
                </div>
              </div>
              <Card>
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Shortlisting Workbench</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                    You have not published any final shortlists yet. Once candidates pass the AI screening rounds or your custom eligibility filters, they will appear here for final interview scheduling and offer generation.
                  </p>
                  <button onClick={() => setActiveTab('jobs')} className="text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition">
                    Review Job Eligibility Rules
                  </button>
                </div>
              </Card>
            </div>
          )}
`;

content = content.substring(0, modalsIndex) + newTabsContent + content.substring(modalsIndex);
fs.writeFileSync(file, content);
console.log('Success');
