const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// For students
content = content.replace(
    `<Link href="/dashboard/readiness" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">`,
    `<Link href="/dashboard/messages" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ’¬</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-600 transition mb-1">TPO Connect</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">Direct messaging channel to reach out to Placement Officers for guidance, interview tips, or offer queries.</p>
                  <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Message TPO</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/readiness" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">`
);

// For Placement Officer (and Super Admin since they are identical in some places, wait, they are distinct in this file)
// We add it to TPO dashboard (Role === "PLACEMENT_OFFICER")
content = content.replace(
    `<Link href="/dashboard/tpo/at-risk" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-rose-500 hover:shadow-lg transition duration-200">`,
    `<Link href="/dashboard/messages" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ’¬</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-cyan-600 transition mb-1">Student Queries</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">Direct messaging channel to respond to student questions, provide guidance, and coordinate placement support.</p>
                  <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>View Messages</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/tpo/at-risk" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-rose-500 hover:shadow-lg transition duration-200">`
);

fs.writeFileSync(file, content);
console.log('Successfully updated dashboard grid');
