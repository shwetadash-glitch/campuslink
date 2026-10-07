import React, { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";
import { FullProfileData } from "@/features/students/types";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  readinessScore?: number;
}

export function ResumeModal({ isOpen, onClose, studentId, studentName, readinessScore }: ResumeModalProps) {

  const getBranchDefaults = (branch?: string) => {
    const b = (branch || 'cse').toLowerCase();
    
    if (b.includes('mech')) {
      return {
        degree: 'Mechanical Engineering',
        objective: 'To pursue graduate studies in mechanical systems and design, leading to a research career in computational mechanics, robotics, and thermal-fluid sciences.',
        skills: 'CAD/CAM/CAE: SolidWorks, Autodesk Inventor, ANSYS Fluent, ANSYS Mechanical, OpenFOAM, Abaqus, MATLAB/Simulink.\nManufacturing/Machining: CNC Milling, 3D Printing (FDM/SLA), TIG/MIG Welding, Lathe operations.\nCore Courses: Finite Element Methods, Fluid Mechanics, Computational Heat Transfer, Kinematics and Dynamics of Machines, Continuum Mechanics, Mechanical Vibration.',
        achievements: [
          'SAE Baja IIT Delhi: Chief Technical Lead; managed powertrain design and frame fabrication for the national intercollegiate competition.',
          'Institute Silver Medal: Ranked 1st among 110 students in the Mechanical Engineering Department across six semesters.'
        ],
        majorProjects: [
          {
            title: 'Topology Optimization of Additively Manufactured Structural Nodes',
            date: 'May 2023 - October 2023',
            award: 'Undergrad Thesis / Summer Research (Collaborative Research with DRDO)',
            desc: 'Formulated a density-based SIMP (Solid Isotropic Material with Penalization) algorithm to minimize structural compliance under high-vibration dynamic loads. Implemented finite element routines in MATLAB and coupled them with ANSYS to validate stress distributions in 3D-printed titanium alloy brackets.'
          },
          {
            title: 'Autonomous Multimodal All-Terrain Rover Chassis',
            date: 'January 2024 - Present',
            award: 'Student Undergraduate Research Award (SURA)',
            desc: 'Designed a rocker-bogie suspension system capable of passive obstacle clearance over 250 mm thresholds. Conducted dynamic kinematic analysis in ADAMS and performed topology-guided lightweighting in SolidWorks, cutting chassis weight by 22% without sacrificing torsional stiffness.'
          }
        ],
        minorProjects: [
          {
            title: 'CFD Analysis of Turbulent Heat Transfer in Microchannel Heat Sinks',
            desc: 'Modeled convective cooling performance of liquid nitrogen flows using OpenFOAM and ANSYS Fluent under high heat-flux boundaries.'
          },
          {
            title: 'Kinematic Synthesis of a 4-DOF Robotic Manipulator',
            desc: 'Solved forward and inverse kinematics using Denavit-Hartenberg parameterization; validated trajectory profiles using MATLAB SimMechanics.'
          },
          {
            title: 'Low-Cost Regenerative Braking Unit',
            desc: 'Designed a planetary gear-coupled flywheel setup for urban kinetic energy recovery.'
          }
        ]
      };
    } else if (b.includes('ece') || b.includes('electronics')) {
      return {
        degree: 'Electronics & Communication Engineering',
        objective: 'To pursue graduate research in digital VLSI design, wireless signal processing, and low-power hardware architectures for embedded systems.',
        skills: 'HDLs & EDA Tools: SystemVerilog, Verilog, VHDL, Cadence Virtuoso, Cadence Innovus, Synopsys Design Compiler, ModelSim, Vivado HLS.\nProgramming & Modeling: C, C++, Python, MATLAB, SPICE.\nCore Courses: Digital VLSI Design, Analog Integrated Circuits, Digital Signal Processing, Wireless Communication, Information Theory, Semiconductor Device Physics.',
        achievements: [
          'Texas Instruments Innovation Challenge: National Finalist for low-power remote health monitoring hardware.',
          'Undergraduate Teaching Assistant: Mentored 120 juniors in the Digital Circuits & Microprocessors Laboratory.'
        ],
        majorProjects: [
          {
            title: 'Design of a Energy-Efficient 16-Bit RISC-V Microprocessor',
            date: 'May 2023 - October 2023',
            award: "Bachelor's Thesis Project (Adviser: Senior Faculty, Department of EE/ECE)",
            desc: 'Designed, synthesized, and verified an in-order 5-stage pipelined RISC-V (RV32I) core in SystemVerilog. Optimized static timing and dynamic switching dissipation using clock gating and operand isolation in Cadence Genus, achieving a 28% drop in dynamic power at 65nm CMOS.'
          },
          {
            title: 'FPGA-Accelerated Beamforming for Massive MIMO Systems',
            date: 'January 2024 - Present',
            award: 'Research Internship, Wireless Systems Lab',
            desc: 'Implemented a real-time QR-decomposition precoding pipeline on a Xilinx Zynq UltraScale+ FPGA using Vivado HLS. Benchmarked matrix decomposition throughput, processing 64-antenna channels within a sub-millisecond coherence window.'
          }
        ],
        minorProjects: [
          {
            title: 'Phase-Locked Loop (PLL) Design at 2.4 GHz',
            desc: 'Implemented a charge-pump PLL in Cadence Virtuoso with 1.8V nominal supply, achieving <1.2 ps RMS jitter.'
          },
          {
            title: 'OFDM Modulation and Demodulation Pipeline',
            desc: 'Simulated dynamic 64-QAM multipath fading channel models in MATLAB; optimized bit-error-rate performance using soft-decision Viterbi decoders.'
          },
          {
            title: 'Embedded IoT Environmental Node',
            desc: 'Programmed STM32 (ARM Cortex-M4) microcontrollers over I2C/SPI; transmitted encrypted sensor telemetry using LoRaWAN.'
          }
        ]
      };
    } else if (b.includes('civil') || b.includes('ce')) {
      return {
        degree: 'Civil Engineering',
        objective: 'To pursue advanced research in structural mechanics, earthquake-resistant design, and sustainable infrastructure materials.',
        skills: 'Software Packages: ETABS, SAP2000, STAAD.Pro, OpenSees, PLAXIS 2D/3D, ArcGIS, AutoCAD Civil 3D, HEC-RAS.\nTesting & Laboratory: Universal Testing Machine (UTM), Non-Destructive Testing (Rebound Hammer, Ultrasonic Pulse Velocity), Rheology.\nCore Courses: Advanced Structural Analysis, Soil Mechanics & Foundation Engineering, Design of Concrete & Steel Structures, Earthquake Engineering, Fluid Mechanics.',
        achievements: [
          'National Structural Design Challenge: Secured 1st place in the national tall-building model vibration testing competition.',
          'Secretary, Civil Engineering Society (CES): Coordinated regional paper presentation events and alumni industry mentorship sessions.'
        ],
        majorProjects: [
          {
            title: 'Performance-Based Seismic Assessment of High-Rise Base-Isolated RC Structures',
            date: 'May 2023 - October 2023',
            award: 'Undergraduate Thesis (B.Tech Project)',
            desc: 'Performed non-linear time-history analyses on a 30-story reinforced concrete building using ETABS and OpenSees. Evaluated lead-rubber bearing (LRB) base isolation mechanisms against peak ground acceleration spectrums from historic Himalayan earthquake records.'
          },
          {
            title: 'Carbon-Negative Geopolymer Concrete Formulation Using Fly Ash & Slag',
            date: 'January 2024 - Present',
            award: 'Student Undergraduate Research Award (SURA)',
            desc: 'Synthesized zero-cement alkali-activated binders using industrial by-products (GGBS and fly ash). Conducted compressive strength tests, SEM (Scanning Electron Microscopy), and XRD characterization, demonstrating 42 MPa 28-day strength with a 65% reduction in embodied carbon.'
          }
        ],
        minorProjects: [
          {
            title: 'Hydrological Catchment Modeling using GIS and HEC-RAS',
            desc: 'Modeled peak 100-year flood inundation zones along urban river basins to optimize storm-drain network capacities.'
          },
          {
            title: 'Finite Element Settlement Analysis of Driven Pile Groups',
            desc: 'Simulated soil-structure interaction using PLAXIS 3D under eccentric lateral wave loading.'
          },
          {
            title: 'Intelligent Traffic Management Model',
            desc: 'Built a dynamic signal timing algorithm using microscopic simulation in VISSIM to reduce delay indices at urban intersections.'
          }
        ]
      };
    } else if (b.includes('ee') || b.includes('electrical')) {
      return {
        degree: 'Electrical Engineering',
        objective: 'To pursue graduate studies in electrical engineering focusing on modern power electronics, smart grid dynamics, and electric powertrain control.',
        skills: 'Simulation & Hardware Tools: MATLAB/Simulink, PLECS, PSCAD, LTspice, LabVIEW, dSPACE, DSP programming (TI C2000).\nHardware Skills: PCB Layout (Altium Designer), Power MOSFET/GaN Gate Drivers, High-Voltage Bench Testing.\nCore Courses: Power Electronics, Power System Dynamics & Control, Electrical Machines, Modern Control Theory, High Voltage Engineering, Linear Systems.',
        achievements: [
          'OPJEMS Scholar: Awarded the O.P. Jindal Engineering & Management Scholarship for academic merit and leadership.',
          'Convener, IEEE Student Branch IIT Delhi: Organized technical symposiums, hands-on micro-controller boot camps, and industrial visits.'
        ],
        majorProjects: [
          {
            title: 'Model Predictive Control (MPC) of Dual Active Bridge (DAB) Converters for EVs',
            date: 'May 2023 - October 2023',
            award: 'B.Tech Project & Summer Fellowship',
            desc: 'Developed a high-frequency isolated DC-DC bidirectional converter topology operating at 100 kHz. Formulated finite-set model predictive control algorithms to minimize peak inductor currents and zero-voltage-switching (ZVS) transitions across the entire charging envelope.'
          },
          {
            title: 'Wide-Area Real-Time Frequency Stability Analysis for Renewable-Dominated Grids',
            date: 'January 2024 - Present',
            award: 'Sponsored Research Project',
            desc: 'Simulated transient grid instability caused by high inverter-based solar penetration. Programmed dynamic virtual synchronous generator (VSG) emulators in PSCAD/EMTDC to deliver fast frequency support during trip contingencies.'
          }
        ],
        minorProjects: [
          {
            title: 'Field-Oriented Control (FOC) for Permanent Magnet Synchronous Motors (PMSM)',
            desc: 'Implemented space vector pulse width modulation (SVPWM) on a TMS320F28379D DSP board.'
          },
          {
            title: 'Design of a 5 kW High-Efficiency Buck-Boost PFC Converter',
            desc: 'Modeled magnetic components (planar inductor design) and thermal heatsinks using PLECS and LTspice.'
          },
          {
            title: 'Automatic Fault Location and Isolation Scheme',
            desc: 'Developed an automated microgrid islanding detection scheme using phase-locked loop angle drift.'
          }
        ]
      };
    } else {
      // Default CSE / IT
      return {
        degree: 'Computer Science and Engineering',
        objective: 'To pursue a challenging career in software engineering, leading to a career in research and development. I am highly interested in backend architecture, machine learning, and scalable systems.',
        skills: 'Programming Languages: C/C++, Java, Python, Data Structures, Algorithms, SQL, Git, Linux, React.\nCore Courses: Operating Systems, Database Management Systems, Computer Networks, Theory of Computation, Compiler Design, Artificial Intelligence.',
        achievements: [
          'Smart India Hackathon Finalist: Developed an AI-powered crop disease detection platform for farmers.',
          'Competitive Programming: Global Rank 540 in Google Kickstart Round B.'
        ],
        majorProjects: [
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
        ],
        minorProjects: [
          {
            title: 'Real-time Chat Application',
            desc: 'Built a WebSocket-based messaging platform using Node.js and Redis Pub/Sub.'
          },
          {
            title: 'E-Commerce Analytics Dashboard',
            desc: 'Developed a React dashboard visualizing sales trends using D3.js and PostgreSQL.'
          },
          {
            title: 'Custom Memory Allocator',
            desc: 'Implemented malloc() and free() functions in C with segregated free lists.'
          }
        ]
      };
    }
  };

  const [profile, setProfile] = useState<FullProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      const internalId = studentId;
      
      apiClient.get<any>(`/api/v1/officer/students/${internalId}`)
        .then((res) => {
          setProfile(res.data.data ? res.data.data : res.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const defaults = getBranchDefaults(profile?.basic_info?.branch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-campusblue-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-campusblue-50 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-campusblue-900">Generated Resume</h2>
            {readinessScore != null && (
              <span className="bg-campusblue-50 text-campusblue-900 text-xs font-bold px-3 py-1 rounded-full border border-campusblue-100">
                Readiness Score: {readinessScore.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-campusblue-700 text-white rounded-md text-sm font-semibold hover:bg-campusblue-800 transition">Print / Save PDF</button>
            <button onClick={onClose} className="p-2 text-campusblue-300 hover:text-campusblue-700 bg-campusblue-100 rounded-md hover:bg-campusblue-200 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* PDF Body Container - scrollable */}
        <div className="flex-1 overflow-y-auto p-8 bg-campusblue-100 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-campusblue-700 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-campusblue-700 font-medium">Generating Document...</p>
            </div>
          ) : (
            <div className="bg-white w-[800px] min-h-[1100px] shadow-lg text-black font-serif p-10" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              
              {/* Profile Header */}
              <div className="border-b-2 border-black pb-4 mb-4">
                <h1 className="text-3xl font-bold uppercase text-center mb-1">{studentName || "Student Name"}</h1>
                <p className="text-center font-bold mb-2">Senior Year B.Tech Student, {defaults.degree}, Indian Institute of Technology Delhi</p>
                
                <div className="text-center text-sm">
                  Email: {profile?.basic_info?.email || "student@campuslink.edu"} | Phone: +91 {profile?.basic_info?.phone || "9911592327"}
                </div>
              </div>

              {/* Academic Details Section */}
              <div className="mb-4 text-sm">
                <div className="font-bold underline decoration-1 mb-1">Academic Record:</div>
                <div className="font-semibold">B.Tech CGPA: {profile?.basic_info?.cgpa || '8.5'}/10 | Class XII: 95.8% | Class X: 96.2%</div>
              </div>

              {/* Objective */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Objective</div>
                <p className="text-justify text-sm leading-relaxed">{defaults.objective}</p>
              </div>

              {/* Major Projects */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Major Projects</div>
                <ul className="list-disc pl-5 space-y-3">
                  {profile?.projects && profile.projects.length > 0 ? (
                    profile.projects.map((proj: any, i: number) => (
                      <li key={i}>
                        <div className="flex justify-between items-baseline">
                          <strong className="text-base">{proj.title}</strong>
                          <span className="italic text-campusblue-800">{proj.start_date ? new Date(proj.start_date).getFullYear() : '2023'} - {proj.end_date ? new Date(proj.end_date).getFullYear() : 'Present'}</span>
                        </div>
                        <div className="italic text-campusblue-800 mb-1">{proj.role || 'Project Lead'}</div>
                        <p className="text-justify text-sm leading-relaxed">{proj.description}</p>
                      </li>
                    ))
                  ) : (
                    <>
                      {defaults.majorProjects.map((p: any, i: number) => (
                        <li key={i}>
                          <div className="flex justify-between items-baseline">
                            <strong className="text-base">{p.title}</strong>
                            <span className="italic text-campusblue-800">{p.date}</span>
                          </div>
                          <div className="italic text-campusblue-800 mb-1">{p.award}</div>
                          <p className="text-justify text-sm leading-relaxed">{p.desc}</p>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </div>

              {/* Minor Projects */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Minor Projects</div>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                  {defaults.minorProjects.map((p: any, i: number) => (
                    <li key={i}>
                      <strong>{p.title}:</strong> {p.desc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Skills */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Technical Skills & Coursework</div>
                <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                  {defaults.skills.split('\n').map((skillLine, i) => {
                    const [category, items] = skillLine.split(': ');
                    return (
                      <li key={i}>
                        <strong>{category}:</strong> {items || category}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Achievements & Leadership */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Achievements & Leadership</div>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                  {defaults.achievements.map((a: any, i: number) => {
                    const [title, desc] = a.split(': ');
                    return (
                      <li key={i}>
                        <strong>{title}:</strong> {desc || title}
                      </li>
                    );
                  })}
                </ul>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}





