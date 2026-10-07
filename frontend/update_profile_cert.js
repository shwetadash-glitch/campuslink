const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\profile\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `{cert.credential_id && (
                        <span className="text-2xs font-mono px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {cert.credential_id}
                        </span>
                      )}`,
    `{cert.credential_id && (
                        <span className="text-2xs font-mono px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {cert.credential_id}
                        </span>
                      )}
                      {cert.proof_path && (
                        <a
                          href={\`http://127.0.0.1:8001\${cert.proof_path}\`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition"
                        >
                          View Proof
                        </a>
                      )}`
);

fs.writeFileSync(file, content);
console.log('Successfully added View Proof button to Profile Page');
