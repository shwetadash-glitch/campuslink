const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\features\\students\\ResumeModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// We will inject a helper function to get branch-specific defaults
const branchDefaults = `
  const getBranchDefaults = (branch?: string) => {
    const b = (branch || 'cse').toLowerCase();
    
    if (b.includes('mech')) {
      return {
        degree: 'Mechanical Engineering',
        skills: 'AutoCAD, SolidWorks, MATLAB, ANSYS, Thermodynamics, Fluid Mechanics, C++',
        projects: [
          {
            title: 'Design and Analysis of a Go-Kart Chassis',
            date: 'May 2023 - October 2023',
            award: 'Automotive Engineering Project',
            desc: 'Designed a lightweight, rigid chassis using SolidWorks. Conducted finite element analysis (FEA) in ANSYS to ensure structural integrity under dynamic loads, reducing overall weight by 15%.'
          },
          {
            title: 'Thermal Analysis of Heat Exchangers',
            date: 'January 2024 - Present',
            award: 'Heat Transfer Course Project',
            desc: 'Simulated heat flow and pressure drops in shell-and-tube heat exchangers using MATLAB. Optimized baffle spacing to increase heat transfer efficiency by 12%.'
          }
        ]
      };
    } else if (b.includes('ece') || b.includes('electronics')) {
      return {
        degree: 'Electronics & Comm. Engineering',
        skills: 'Verilog, VHDL, MATLAB, C, Microcontrollers (Arduino, ARM), PCB Design, Signal Processing',
        projects: [
          {
            title: 'IoT Based Smart Home Automation',
            date: 'May 2023 - October 2023',
            award: 'Embedded Systems Lab',
            desc: 'Developed a central hub using ESP32 to control home appliances via a custom mobile app. Implemented MQTT protocol for low-latency communication over Wi-Fi.'
          },
          {
            title: 'Digital Filter Design for Audio Processing',
            date: 'January 2024 - Present',
            award: 'Digital Signal Processing Project',
            desc: 'Designed FIR and IIR filters in MATLAB to remove high-frequency noise from audio signals. Deployed the optimized filter onto an FPGA using Verilog.'
          }
        ]
      };
    } else if (b.includes('it') || b.includes('info')) {
      return {
        degree: 'Information Technology',
        skills: 'Java, Python, SQL, JavaScript, React, Node.js, AWS, Network Security',
        projects: [
          {
            title: 'Decentralized Identity Verification',
            date: 'May 2023 - October 2023',
            award: 'Blockchain Research Project',
            desc: 'Built a smart contract using Solidity on the Ethereum testnet to issue and verify student credentials securely without a central authority.'
          },
          {
            title: 'E-Commerce Analytics Dashboard',
            date: 'January 2024 - Present',
            award: 'Web Engineering Project',
            desc: 'Developed a full-stack dashboard using React and Node.js. Integrated Redis for real-time traffic monitoring and PostgreSQL for transaction records.'
          }
        ]
      };
    } else {
      // Default CSE
      return {
        degree: 'Computer Science and Engineering',
        skills: 'C/C++, Java, Python, Data Structures, Algorithms, SQL, Git, Linux, React',
        projects: [
          {
            title: 'Unsupervised Video Surveillance',
            date: 'May 2023 - October 2023',
            award: 'Student Undergraduate Research Award',
            desc: 'Developed a novel technique to detect unusual activities in videos using pLSA. Any new activity different from the clustered ones was flagged as unusual.'
          },
          {
            title: 'Scalable Microservices API',
            date: 'January 2024 - Present',
            award: 'Backend Architecture Project',
            desc: 'Architected a distributed system using Docker and Kubernetes. Implemented an API gateway with rate limiting and load balancing for high availability.'
          }
        ]
      };
    }
  };
`;

// Inject helper before the return statement
content = content.replace(
    `if (!isOpen) return null;`,
    `if (!isOpen) return null;\n\n  const defaults = getBranchDefaults(profile?.basic_info?.branch);\n`
);

// Inject helper function definition
content = content.replace(
    `export function ResumeModal({ isOpen, onClose, studentId, studentName, readinessScore }: ResumeModalProps) {`,
    `export function ResumeModal({ isOpen, onClose, studentId, studentName, readinessScore }: ResumeModalProps) {\n${branchDefaults}`
);

// Update Academic table fallback
content = content.replace(
    `<td className="border border-gray-400 p-1">BTech in {profile?.basic_info?.branch || 'Computer Science'}</td>`,
    `<td className="border border-gray-400 p-1">BTech in {defaults.degree}</td>`
);

// Update Projects fallback
const projFallbackRegex = /<li>\s*<div className="flex justify-between items-baseline">\s*<strong className="text-base">Unsupervised Video Surveillance.*?<\/li>/s;
content = content.replace(projFallbackRegex, 
    `{defaults.projects.map((p: any, i: number) => (
                      <li key={i}>
                        <div className="flex justify-between items-baseline">
                          <strong className="text-base">{p.title}</strong>
                          <span className="italic text-gray-700">{p.date}</span>
                        </div>
                        <div className="italic text-gray-700 mb-1">{p.award}</div>
                        <p className="text-justify text-sm leading-relaxed">{p.desc}</p>
                      </li>
                    ))}`
);

// Update Skills fallback
content = content.replace(
    `<li><strong>Programming Languages:</strong> {profile?.skills ? profile.skills.map((s: any) => s.skill.name).join(', ') : 'Java, C/C++, Python, SQL, JavaScript, HTML, CSS'}</li>`,
    `<li><strong>Programming Languages & Core Skills:</strong> {profile?.skills && profile.skills.length > 0 ? profile.skills.map((s: any) => s.skill?.name || s.name).join(', ') : defaults.skills}</li>`
);

fs.writeFileSync(file, content);
console.log('Successfully updated ResumeModal to branch-specific data');
