const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* Modules Grid */}'));
if (startIndex !== -1) {
    const head = lines.slice(0, startIndex);
    const newGrid = `        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* STUDENT CARDS */}
          {user?.role === "STUDENT" && (
            <>
              <Link href="/dashboard/profile" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                  <span className="text-2xl">🎓</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">My Profile</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Comprehensive profile management for academic records, skills, capstone projects, certifications, and live profile completeness.</p>
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Profile</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/jobs" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition mb-1">Jobs & Placement Drives</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Browse published placement openings, check your real-time deterministic eligibility, and register for campus interview drives.</p>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Browse Opportunities</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/readiness" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition mb-1">Readiness & Skill Gaps</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Deterministic 7-dimension employability evaluation, dynamic weight normalization, identified strengths, and job-specific gap analysis.</p>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Explore Readiness</span><span>&rarr;</span></span>
              </Link>
            </>
          )}

          {/* RECRUITER CARDS */}
          {user?.role === "RECRUITER" && (
            <Link href="/dashboard/recruiter" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition duration-200 md:col-span-2">
              <div className="w-12 h-12 mb-4 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition mb-1">Recruiter Portal & Operations</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">Corporate profile management, job requisitions, skill requirements with weighted criteria, placement drives, candidate management, and bulk eligibility evaluation.</p>
              <span className="text-xs font-semibold text-purple-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Recruiter Portal</span><span>&rarr;</span></span>
            </Link>
          )}

          {/* PLACEMENT OFFICER CARDS */}
          {user?.role === "PLACEMENT_OFFICER" && (
            <>
              <Link href="/dashboard/tpo/command-center" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">Placement Command Center</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Centralized dashboard for tracking placement metrics, active drives, and overall placement success rates.</p>
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Dashboard</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/drive-manager" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition mb-1">Drive Lifecycle Manager</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">End-to-end management of placement drives from initial scheduling to final candidate selection and feedback.</p>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Drives</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/shortlisting" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-amber-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition mb-1">AI Shortlisting Console</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Identify optimal candidates through predictive algorithms, dynamic threshold modeling, and automated readiness evaluations.</p>
                <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Run Shortlisting</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/scheduler" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-pink-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-pink-600 transition mb-1">Conflict-Free Scheduler</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Manage placement drives, detect time collisions dynamically, and coordinate optimal interview slots across recruiters.</p>
                <span className="text-xs font-semibold text-pink-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Schedule</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/offer-desk" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-600 transition mb-1">Offer Verification Desk</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Digitally authenticate corporate offer letters, track compliance, and manage final placements via secure document viewer.</p>
                <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Verify Offers</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/at-risk" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-rose-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-rose-600 transition mb-1">Cohort & At-Risk Center</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Track student retention, identify at-risk candidates via predictive metrics, and schedule targeted intervention counseling.</p>
                <span className="text-xs font-semibold text-rose-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Monitor Risk</span><span>&rarr;</span></span>
              </Link>
            </>
          )}

          {/* SUPER ADMIN CARDS */}
          {user?.role === "SUPER_ADMIN" && (
            <>
              <Link href="/dashboard/students" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition"><span className="text-2xl">🎓</span></div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">Student Directory</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Search students, filter by CGPA/department, inspect profiles, and review 7-dimension employability readiness scores.</p>
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Browse Students</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/companies" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition"><span className="text-2xl">🏢</span></div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition mb-1">Corporate Partners</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Manage registered employers, company profiles, designated talent acquisition contacts, and active requisitions.</p>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>View Partners</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/recruiter" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition"><span className="text-2xl">💼</span></div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition mb-1">Placement Operations</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Supervise campus hiring events, schedule placement drives, inspect job requirements, and run eligibility sandboxes.</p>
                <span className="text-xs font-semibold text-purple-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Operations</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/admin/skills" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition"><span className="text-2xl">🗂️</span></div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition mb-1">Master Skills Catalog</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Standardized canonical skills taxonomy ensuring clean match data across students and job requisitions.</p>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Catalog</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/admin/users" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-amber-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition"><span className="text-2xl">🛡️</span></div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition mb-1">User Accounts & RBAC</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Inspect registered user accounts, assign system roles, and activate or deactivate platform access.</p>
                <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Users</span><span>&rarr;</span></span>
              </Link>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
`;
    
    head.push(newGrid);
    fs.writeFileSync(file, head.join('\n'));
    console.log('Successfully replaced grid');
} else {
    console.log('Could not find start index');
}
