"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

export default function CommunicationCoachHubPage() {
  const [categories, setCategories] = useState<CommunicationCategoryInfo[]>([]);
  const [scenarios, setScenarios] = useState<CommunicationScenarioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        subtitle="Practice, evaluate, and refine workplace communication across professional scenarios."
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
            Formative Skill Development
          </span>
          <h2 className="text-xl sm:text-2xl font-black mb-2">Master Professional Communication</h2>
          <p className="text-xs text-campusblue-100 max-w-xl leading-relaxed mb-4">
            Practice structuring emails, framing technical trade-offs for non-engineers, interjecting constructively in group discussions, and pitching capstone ideas.
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
            <p className="text-xs text-campusblue-500">Structured written exercises completed.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-campusblue-50">
            <span className="text-2xs text-slate-500 italic block">
              7-dimension rubric: Clarity, Tone, Audience Adaptation, Grammar, Relevance...
            </span>
          </div>
        </Card>
      </div>

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
                  <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-600">
                    {scen.category.replace("_", " ")}
                  </span>
                  <StatusBadge status={scen.difficulty} size="sm" />
                </div>
                <h4 className="text-sm font-bold text-campusblue-900 mb-1">{scen.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3">{scen.prompt_text}</p>
                
                <div className="flex items-center gap-2 mb-4 text-2xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Audience: {scen.target_audience}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{scen.recommended_min_words}-{scen.recommended_max_words} words</span>
                </div>

                <Link href={`/dashboard/communication-coach/practice/${scen.id}`}>
                  <Button className="w-full bg-campusblue-700 hover:bg-campusblue-800 text-white text-xs">
                    Start Practice Exercise →
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
