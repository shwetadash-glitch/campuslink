const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionalCards = `
              <Link
                href="/dashboard/tpo/shortlisting"
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-amber-500 hover:shadow-lg transition duration-200"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition mb-1">
                  AI Shortlisting Console
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Identify optimal candidates through predictive algorithms, dynamic threshold modeling, and automated readiness evaluations.
                </p>
                <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform">
                  <span>Run Shortlisting</span>
                  <span>&rarr;</span>
                </span>
              </Link>

              <Link
                href="/dashboard/tpo/scheduler"
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-pink-500 hover:shadow-lg transition duration-200"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-pink-600 transition mb-1">
                  Conflict-Free Scheduler
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Manage placement drives, detect time collisions dynamically, and coordinate optimal interview slots across recruiters.
                </p>
                <span className="text-xs font-semibold text-pink-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform">
                  <span>Manage Schedule</span>
                  <span>&rarr;</span>
                </span>
              </Link>

              <Link
                href="/dashboard/tpo/offer-desk"
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition duration-200"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-600 transition mb-1">
                  Offer Verification Desk
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Digitally authenticate corporate offer letters, track compliance, and manage final placements via secure document viewer.
                </p>
                <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform">
                  <span>Verify Offers</span>
                  <span>&rarr;</span>
                </span>
              </Link>

              <Link
                href="/dashboard/tpo/at-risk"
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-rose-500 hover:shadow-lg transition duration-200"
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 group-hover:text-rose-600 transition mb-1">
                  Cohort & At-Risk Center
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Track student retention, identify at-risk candidates via predictive metrics, and schedule targeted intervention counseling.
                </p>
                <span className="text-xs font-semibold text-rose-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform">
                  <span>Monitor Risk</span>
                  <span>&rarr;</span>
                </span>
              </Link>
`;

let lines = content.split('\n');
const insertIdx = lines.findIndex(l => l.trim() === '</>');
lines.splice(insertIdx, 0, additionalCards);
fs.writeFileSync(file, lines.join('\n'));
console.log('Success');
