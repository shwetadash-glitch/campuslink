"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [activeRole, setActiveRole] = useState<"student" | "recruiter" | "tpo">("student");

  const roles = {
    student: {
      title: "For Students",
      description: "Build your AI-powered profile, parse your resume automatically, analyze your skill gaps, and apply to top corporate placement drives seamlessly.",
      icon: (
        <svg className="w-12 h-12 text-campusblue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v7" /></svg>
      ),
      features: ["AI Resume Parsing", "Skill-Gap Analysis", "Readiness Scoring", "Direct Applications"]
    },
    recruiter: {
      title: "For Corporate Recruiters",
      description: "Post jobs, define hard skill requirements, and leverage our deterministic AI to instantly shortlist the most highly employable candidates.",
      icon: (
        <svg className="w-12 h-12 text-campusblue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      ),
      features: ["One-Click Shortlisting", "Drive Lifecycle Management", "Targeted Hiring", "Analytics Dashboard"]
    },
    tpo: {
      title: "For Placement Officers (TPO)",
      description: "Maintain complete oversight of the placement season. Track drive pipelines, monitor cohort readiness, and orchestrate the entire campus-to-corporate bridge.",
      icon: (
        <svg className="w-12 h-12 text-campusblue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      ),
      features: ["Command Center Dashboard", "Cohort Readiness Tracking", "Offer Verification", "Placement Heatmaps"]
    }
  };

  return (
    <div className="min-h-screen bg-campusblue-50 font-serif flex flex-col relative overflow-hidden">
      
      {/* Global Custom CSS for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out 3s infinite;
        }
        .animate-pulse-soft {
          animation: pulse-soft 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />

      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#C0E6FD] rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse-soft pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-[#80AAD3] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse-soft pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* Navigation */}
      <nav className="relative z-10 w-full bg-white/80 backdrop-blur-md border-b border-campusblue-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-black text-campusblue-900 tracking-widest uppercase">
            CampusLink
          </div>
        </div>
        <div>
          <Link 
            href="/login" 
            className="bg-campusblue-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-campusblue-900 transition shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between p-6 md:p-12 mt-8 lg:mt-16 gap-12">
        <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
          <h1 className="text-5xl md:text-7xl font-extrabold text-campusblue-900 tracking-tight leading-tight">
            The AI-Powered <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-campusblue-600 to-campusblue-900">Placement Platform</span>
          </h1>
          <p className="text-lg md:text-xl text-campusblue-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Bridge the gap between campus talent and corporate opportunities. A unified, intelligent dashboard for students, recruiters, and placement officers to seamlessly orchestrate the hiring season.
          </p>
          
          <div className="pt-6">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center gap-3 bg-campusblue-800 text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-campusblue-900 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Access Your Dashboard 
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>
        </div>

        {/* Hero Visual Graphic (Abstract UI) */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative h-[400px]">
          {/* Main Dashboard Mockup Card */}
          <div className="absolute top-10 right-10 lg:right-20 w-80 bg-white p-6 rounded-2xl shadow-2xl border border-campusblue-100 animate-float z-20">
            <div className="flex items-center justify-between mb-6 border-b border-campusblue-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-campusblue-100 flex items-center justify-center">
                  <span className="text-campusblue-800 font-bold text-xs">AI</span>
                </div>
                <div>
                  <div className="h-3 w-20 bg-campusblue-200 rounded mb-2"></div>
                  <div className="h-2 w-12 bg-campusblue-100 rounded"></div>
                </div>
              </div>
              <div className="w-16 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 text-[10px] font-bold">95% Match</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full bg-campusblue-50 rounded"></div>
              <div className="h-2 w-4/5 bg-campusblue-50 rounded"></div>
              <div className="h-2 w-full bg-campusblue-50 rounded"></div>
              <div className="h-2 w-3/4 bg-campusblue-50 rounded"></div>
            </div>
            <div className="mt-6 pt-4 border-t border-campusblue-50 flex gap-2">
              <div className="h-8 flex-1 bg-campusblue-800 rounded-lg"></div>
              <div className="h-8 w-8 bg-campusblue-100 rounded-lg"></div>
            </div>
          </div>

          {/* Floating Analytics Card */}
          <div className="absolute top-48 left-10 lg:left-0 w-64 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-campusblue-100 animate-float-delayed z-30">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-campusblue-50 flex items-center justify-center border-4 border-campusblue-500 border-r-transparent transform rotate-45"></div>
               <div>
                 <div className="text-2xl font-black text-campusblue-900">82%</div>
                 <div className="text-xs font-semibold text-campusblue-500">Readiness Score</div>
               </div>
             </div>
             <div className="flex justify-between items-end h-16 gap-2 border-b border-campusblue-50 pb-2">
               {[40, 70, 45, 90, 60, 85].map((h, i) => (
                 <div key={i} className="w-full bg-campusblue-200 rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Interactive User Personas Section */}
      <div className="relative z-10 mt-16 md:mt-24 w-full max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-campusblue-900 mb-4">Tailored for Every Stakeholder</h2>
          <p className="text-campusblue-600 text-lg">Select your role to explore the features crafted for you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white/80 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-campusblue-100">
          
          {/* Tabs Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {(Object.keys(roles) as Array<keyof typeof roles>).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`text-left px-6 py-5 rounded-2xl transition-all duration-300 font-semibold text-lg border-2 ${
                  activeRole === role 
                    ? "bg-campusblue-50 border-campusblue-500 text-campusblue-900 shadow-md transform scale-[1.02]" 
                    : "bg-white border-transparent text-campusblue-400 hover:bg-campusblue-50 hover:text-campusblue-700"
                }`}
              >
                {roles[role].title}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-8 flex flex-col justify-center bg-gradient-to-br from-campusblue-50 to-white rounded-2xl p-8 md:p-12 border border-campusblue-100 min-h-[320px] shadow-inner transition-all duration-500 relative overflow-hidden">
            {/* Background graphic inside card */}
            <div className="absolute -right-20 -bottom-20 opacity-5">
              {roles[activeRole].icon}
            </div>

            <div className="relative z-10 flex items-center gap-6 mb-6">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-campusblue-50 text-campusblue-600">
                {roles[activeRole].icon}
              </div>
              <h3 className="text-3xl font-black text-campusblue-900">
                {roles[activeRole].title}
              </h3>
            </div>
            <p className="relative z-10 text-xl text-campusblue-800 mb-10 leading-relaxed font-medium">
              {roles[activeRole].description}
            </p>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mt-auto">
              {roles[activeRole].features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 text-campusblue-900 font-bold bg-white px-4 py-3 rounded-xl border border-campusblue-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-campusblue-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-campusblue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-auto pb-8 w-full text-center border-t border-campusblue-200/50 pt-8 text-campusblue-500 font-medium">
        <p>&copy; 2026 CampusLink Placement Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
