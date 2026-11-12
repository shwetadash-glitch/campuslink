"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  communicationCoachApi,
  CommunicationCategoryInfo,
  CommunicationScenarioItem,
} from "@/services/communicationCoachApi";
import { GroupDiscussionSetupModal } from "@/components/gd/GroupDiscussionSetupModal";
import { GroupDiscussionVideoRoomModal } from "@/components/gd/GroupDiscussionVideoRoomModal";
import { GdPanelConfigResponse } from "@/services/studentsApi";

export default function CommunicationCoachHubPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CommunicationCategoryInfo[]>([]);
  const [scenarios, setScenarios] = useState<CommunicationScenarioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Email Generation states
  const [generatingEmail, setGeneratingEmail] = useState<boolean>(false);
  const [selectedDomain, setSelectedDomain] = useState<string>("All Domains");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("INTERMEDIATE");

  // Group Discussion interactive panel states
  const [setupModalScenario, setSetupModalScenario] = useState<CommunicationScenarioItem | null>(null);
  const [activeGdPanelData, setActiveGdPanelData] = useState<GdPanelConfigResponse | null>(null);
  const [isGdRoomOpen, setIsGdRoomOpen] = useState<boolean>(false);

  const emailDomains = [
    "All Domains",
    "Cloud Infrastructure & Reliability",
    "Enterprise SaaS & Billing",
    "Cybersecurity & Data Privacy Incident",
    "Fintech Payment Orchestration",
    "Cross-Functional Product Launch",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, scenRes] = await Promise.all([
        communicationCoachApi.getCategories(),
        communicationCoachApi.getScenarios(),
      ]);
      setCategories(catRes.categories || []);
      setScenarios(scenRes.scenarios || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load communication coach data.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDynamicEmail = async () => {
    setGeneratingEmail(true);
    setError(null);
    try {
      const payload: { difficulty?: string; domain?: string } = {
        difficulty: selectedDifficulty,
      };
      if (selectedDomain !== "All Domains") {
        payload.domain = selectedDomain;
      }

      const res = await communicationCoachApi.generateDynamicEmail(payload);
      // Navigate directly into practice session for the newly generated scenario
      router.push(`/dashboard/communication-coach/practice/${res.scenario.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to generate dynamic email challenge.");
      setGeneratingEmail(false);
    }
  };

  const handleOpenGdSetup = (scen: CommunicationScenarioItem) => {
    setSetupModalScenario(scen);
  };

  const handleGdPanelReady = (panelConfig: GdPanelConfigResponse) => {
    setActiveGdPanelData(panelConfig);
    setIsGdRoomOpen(true);
  };

  const filteredScenarios =
    selectedCategory === "ALL"
      ? scenarios
      : scenarios.filter((s) => s.category === selectedCategory);

  const totalCompleted = categories.reduce((acc, c) => acc + c.completed_sessions, 0);

  const categoryIcons: Record<string, string> = {
    HR_INTERVIEW: "💼",
    TECHNICAL_EXPLANATION: "⚙️",
    GROUP_DISCUSSION: "👥",
    PROFESSIONAL_EMAIL: "✉️",
    STRUCTURED_SPEAKING: "🎤",
  };

  return (
    <AppLayout allowedRoles={["STUDENT"]}>
      <PageHeader
        title="AI Communication Skills Coach"
        subtitle="Practice spoken delivery, presentation structures, and workplace email writing."
      />

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Hero Overview */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-campusblue-900 to-campusblue-800 text-white md:col-span-2 shadow-sm border-0">
          <span className="text-2xs uppercase tracking-widest text-campusblue-200 font-bold block mb-1">
            Formative Skill Development & Spoken Delivery
          </span>
          <h2 className="text-xl sm:text-2xl font-black mb-2">Master Spoken & Written Communication</h2>
          <p className="text-xs text-campusblue-100 max-w-xl leading-relaxed mb-4">
            Practice microphone-captured technical explanations, structured speaking frameworks (PREP & STAR), and dynamic on-demand executive email challenges.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href="#practice-scenarios">
              <Button className="bg-white text-campusblue-900 hover:bg-campusblue-50 text-xs font-bold">
                Browse Scenarios ↓
              </Button>
            </Link>
            <Link href="/dashboard/communication-coach/history">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 text-xs">
                View Practice History & Progress →
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-campusblue-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xs text-campusblue-600 uppercase font-bold block mb-1">Your Journey</span>
            <h3 className="text-sm font-bold text-campusblue-900 mb-4">Completed Practice Sessions</h3>
            <div className="text-3xl font-black text-campusblue-900 mb-1">{totalCompleted}</div>
            <p className="text-xs text-campusblue-500">Spoken and written exercises evaluated.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-campusblue-50">
            <span className="text-2xs text-slate-500 italic block">
              Graded on E-to-D Scale (Exemplary to Deficient) + Pacing (WPM) & Fillers
            </span>
          </div>
        </Card>
      </div>

      {/* Dynamic Email Generator Banner */}
      <Card className="mb-8 p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-campusblue-900 text-white border-0 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase tracking-widest text-purple-200 font-bold">
                ⚡ Dynamic Scenario Engine
              </span>
              <span className="px-2 py-0.5 text-2xs font-bold rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                Anti-Repetition AI
              </span>
            </div>
            <h3 className="text-lg font-black">Generate a Fresh Workplace Email Challenge</h3>
            <p className="text-xs text-purple-100 max-w-xl leading-relaxed">
              Facing realistic, unpredictable workplace situations builds genuine agility. Generate a context-rich scenario tailored to your chosen domain and difficulty.
            </p>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {emailDomains.map((domain) => (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition ${
                    selectedDomain === domain
                      ? "bg-white text-purple-950 font-bold shadow-sm"
                      : "bg-white/10 text-purple-200 hover:bg-white/20"
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white/10 text-white border border-white/20 text-xs rounded-lg px-3 py-2 outline-none"
            >
              <option value="BEGINNER" className="text-slate-900">Beginner</option>
              <option value="INTERMEDIATE" className="text-slate-900">Intermediate</option>
              <option value="ADVANCED" className="text-slate-900">Advanced</option>
            </select>

            <Button
              onClick={handleGenerateDynamicEmail}
              disabled={generatingEmail}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-2.5 shadow-lg"
            >
              {generatingEmail ? "⚡ Synthesizing Topic..." : "⚡ Generate Fresh Email Scenario"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Grid */}
      <div className="mb-8">
        <h3 className="text-base font-bold text-campusblue-900 mb-4 flex items-center gap-2">
          <span>🎯</span>
          <span>Select Practice Category</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`p-4 rounded-xl text-left border transition ${
              selectedCategory === "ALL"
                ? "bg-campusblue-50 border-campusblue-600 shadow-sm ring-1 ring-campusblue-600"
                : "bg-white border-campusblue-100 hover:border-campusblue-300"
            }`}
          >
            <div className="text-2xl mb-2">🌐</div>
            <h4 className="text-sm font-bold text-campusblue-900">All Categories</h4>
            <p className="text-xs text-campusblue-600 mt-1">{scenarios.length} scenarios available</p>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`p-4 rounded-xl text-left border transition ${
                selectedCategory === cat.key
                  ? "bg-campusblue-50 border-campusblue-600 shadow-sm ring-1 ring-campusblue-600"
                  : "bg-white border-campusblue-100 hover:border-campusblue-300"
              }`}
            >
              <div className="text-2xl mb-2">{categoryIcons[cat.key] || "📝"}</div>
              <h4 className="text-sm font-bold text-campusblue-900">{cat.label}</h4>
              <div className="flex justify-between items-center mt-2 text-xs text-campusblue-600">
                <span>{cat.scenario_count} scenarios</span>
                {cat.average_score !== null && (
                  <span className="font-bold text-campusblue-800">Avg: {cat.average_score}%</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Group Discussion Collaborative Banner */}
      {selectedCategory === "GROUP_DISCUSSION" && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-900 via-purple-900 to-campusblue-900 text-white border border-indigo-700/60 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase tracking-widest text-indigo-200 font-extrabold">
                👥 Interactive Collaborative Discussions
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-3xs font-extrabold border border-indigo-400/40">
                Friends & Random Students
              </span>
            </div>
            <h4 className="text-sm font-black">Add Your Friends or Get Placed with Random Students</h4>
            <p className="text-xs text-indigo-100 max-w-xl leading-relaxed">
              Experience authentic campus recruitment group discussions. Search and invite classmates to your panel, or let the AI placement engine match you with random students from other engineering departments.
            </p>
          </div>
          <Button
            onClick={() =>
              handleOpenGdSetup(
                filteredScenarios[0] ||
                  scenarios.find((s) => s.category === "GROUP_DISCUSSION") ||
                  scenarios[0]
              )
            }
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-2.5 shrink-0 shadow-lg"
          >
            ⚡ Configure Panel & Start
          </Button>
        </div>
      )}

      {/* Scenarios Catalog */}
      <div id="practice-scenarios" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-campusblue-900 flex items-center gap-2">
            <span>📚</span>
            <span>Available Practice Prompts</span>
          </h3>
          <span className="text-xs text-campusblue-600">Showing {filteredScenarios.length} scenarios</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-campusblue-500">Loading practice scenarios...</div>
        ) : filteredScenarios.length === 0 ? (
          <Card className="p-8 text-center bg-white border border-campusblue-100">
            <p className="text-xs text-campusblue-500">No practice scenarios found for this category.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((scen) => (
              <Card key={scen.id} className="p-5 bg-white border border-campusblue-100 hover:border-campusblue-300 hover:shadow-md transition">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-600">
                      {scen.category.replace("_", " ")}
                    </span>
                    {scen.is_dynamic && (
                      <span className="px-2 py-0.5 text-3xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 rounded-full">
                        ✨ AI Generated
                      </span>
                    )}
                  </div>
                  <StatusBadge status={scen.difficulty} size="sm" />
                </div>
                <h4 className="text-sm font-bold text-campusblue-900 mb-1">{scen.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3">{scen.prompt_text}</p>
                
                <div className="flex items-center gap-2 mb-4 text-2xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Audience: {scen.target_audience}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{scen.recommended_min_words}-{scen.recommended_max_words} words</span>
                </div>

                {scen.category === "GROUP_DISCUSSION" ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleOpenGdSetup(scen)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <span>👥🎙️</span>
                      <span>Start Group Discussion (Friends or Random) →</span>
                    </Button>
                    <div className="flex justify-between items-center text-3xs text-slate-500 pt-0.5 px-1">
                      <span className="flex items-center gap-1 text-indigo-700 font-bold">
                        <span>✓</span>
                        <span>Add Friends or Auto-Match Random</span>
                      </span>
                      <Link
                        href={`/dashboard/communication-coach/practice/${scen.id}`}
                        className="text-slate-500 hover:text-slate-900 underline font-semibold"
                      >
                        Solo Practice →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link href={`/dashboard/communication-coach/practice/${scen.id}`}>
                    <Button className="w-full bg-campusblue-700 hover:bg-campusblue-800 text-white text-xs font-bold">
                      Start Practice Exercise →
                    </Button>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Group Discussion Setup Modal (Friends vs Random Students) */}
      {setupModalScenario && (
        <GroupDiscussionSetupModal
          isOpen={Boolean(setupModalScenario)}
          onClose={() => setSetupModalScenario(null)}
          scenarioId={setupModalScenario.id}
          scenarioTitle={setupModalScenario.title}
          scenarioDescription={setupModalScenario.prompt_text}
          difficulty={setupModalScenario.difficulty}
          onPanelReady={handleGdPanelReady}
        />
      )}

      {/* Group Discussion Live Video Room */}
      {isGdRoomOpen && (
        <GroupDiscussionVideoRoomModal
          isOpen={isGdRoomOpen}
          scenarioId={setupModalScenario?.id}
          scenarioTitle={setupModalScenario?.title}
          panelData={activeGdPanelData}
          onClose={() => {
            setIsGdRoomOpen(false);
            setActiveGdPanelData(null);
            setSetupModalScenario(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </AppLayout>
  );
}
