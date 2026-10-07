const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert after TPO Connect card
content = content.replace(
    `<Link href="/dashboard/readiness" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">`,
    `<Link href="/dashboard/ai-interview" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-violet-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ¤–</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-violet-600 transition mb-1">AI Mock Interview</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">Practice technical questions with our AI Helper. Get instant feedback and study references.</p>
                  <span className="text-xs font-semibold text-violet-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Start Practice</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/readiness" className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-200">`
);

fs.writeFileSync(file, content);
console.log('Successfully updated dashboard grid with AI card');
