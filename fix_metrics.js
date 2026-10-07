const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\recruiter\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexCards = /<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">/g;
let matches = [...content.matchAll(regexCards)];

if (matches.length === 3) {
    let newContent = content;
    const tabs = ['drives', 'candidates', 'shortlisted'];
    const hoverColors = ['emerald', 'indigo', 'purple'];
    
    // Replace backwards
    for(let i=2; i>=0; i--) {
        const start = matches[i].index;
        const end = start + matches[i][0].length;
        const replacement = `<div onClick={() => setActiveTab('${tabs[i]}')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-${hoverColors[i]}-300 hover:shadow-md transition group">`;
        newContent = newContent.substring(0, start) + replacement + newContent.substring(end);
    }
    fs.writeFileSync(file, newContent);
    console.log('Success replacing remaining 3 cards');
} else {
    console.log('Error: Found ' + matches.length + ' matches instead of 3.');
}
