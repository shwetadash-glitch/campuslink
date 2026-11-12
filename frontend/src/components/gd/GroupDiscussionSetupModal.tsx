"use client";

import React, { useState, useEffect } from "react";
import {
  studentsApi,
  PeerStudent,
  GdPanelConfigResponse,
} from "@/services/studentsApi";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface GroupDiscussionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId?: number;
  driveId?: number;
  scenarioTitle?: string;
  scenarioDescription?: string;
  difficulty?: string;
  onPanelReady: (panelConfig: GdPanelConfigResponse) => void;
}

export function GroupDiscussionSetupModal({
  isOpen,
  onClose,
  scenarioId,
  driveId,
  scenarioTitle = "Monolithic vs Microservices Architecture in Hyperscale Systems",
  scenarioDescription,
  difficulty = "INTERMEDIATE",
  onPanelReady,
}: GroupDiscussionSetupModalProps) {
  const [activeTab, setActiveTab] = useState<"FRIENDS" | "RANDOM">("FRIENDS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PeerStudent[]>([]);
  const [suggestedPeers, setSuggestedPeers] = useState<PeerStudent[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<PeerStudent[]>([]);
  const [randomPeers, setRandomPeers] = useState<PeerStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: suggested friends + random preview
  useEffect(() => {
    if (!isOpen) return;
    loadSuggestedPeers();
    loadRandomPeers();
  }, [isOpen]);

  // Search classmates debounced
  useEffect(() => {
    if (!isOpen || activeTab !== "FRIENDS") return;

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        handleSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, activeTab]);

  const loadSuggestedPeers = async () => {
    try {
      const res = await studentsApi.getPeers("", 8);
      setSuggestedPeers(res.peers || []);
    } catch (err: any) {
      console.warn("Could not load initial peers:", err);
    }
  };

  const loadRandomPeers = async () => {
    setIsLoadingRandom(true);
    setError(null);
    try {
      const res = await studentsApi.getRandomPeers(3);
      setRandomPeers(res.peers || []);
    } catch (err: any) {
      setError("Failed to fetch random peers. Please try again.");
    } finally {
      setIsLoadingRandom(false);
    }
  };

  const handleSearch = async (term: string) => {
    setIsSearching(true);
    try {
      const res = await studentsApi.getPeers(term, 12);
      setSearchResults(res.peers || []);
    } catch (err: any) {
      console.warn("Peer search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = (peer: PeerStudent) => {
    if (selectedFriends.some((f) => f.id === peer.id)) return;
    if (selectedFriends.length >= 3) {
      setError("You can select up to 3 friends for the panel (total 4 candidates).");
      return;
    }
    setError(null);
    setSelectedFriends((prev) => [...prev, peer]);
  };

  const handleRemoveFriend = (peerId: number) => {
    setSelectedFriends((prev) => prev.filter((f) => f.id !== peerId));
  };

  const handleLaunchSession = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      const payload: {
        mode: "FRIENDS" | "RANDOM";
        peer_ids?: number[];
        scenario_id?: number;
        drive_id?: number;
        topic_title?: string;
      } = {
        mode: activeTab,
        scenario_id: scenarioId,
        drive_id: driveId,
        topic_title: scenarioTitle,
      };

      if (activeTab === "FRIENDS") {
        if (selectedFriends.length === 0) {
          setError("Please select at least 1 friend, or choose 'Placed Between Random Students'.");
          setIsLaunching(false);
          return;
        }
        payload.peer_ids = selectedFriends.map((f) => f.id);
      }

      const res = await studentsApi.configureGdPanel(payload);
      onPanelReady(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to configure Group Discussion panel.");
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 text-lg">
              👥
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Group Discussion Panel Setup
                </h3>
                {difficulty && <StatusBadge status={difficulty} size="sm" />}
              </div>
              <p className="text-2xs text-slate-400">
                Choose to invite friends or get matched with random classmates from campus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* TOPIC HIGHLIGHT BANNER */}
        <div className="px-6 py-3 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border-b border-slate-800/80">
          <span className="text-3xs uppercase tracking-widest text-blue-300 font-bold block mb-0.5">
            Discussion Topic
          </span>
          <h4 className="text-xs sm:text-sm font-black text-white">{scenarioTitle}</h4>
          {scenarioDescription && (
            <p className="text-2xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {scenarioDescription}
            </p>
          )}
        </div>

        {/* MODE SELECTOR TABS */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 bg-slate-950/50 flex gap-2">
          <button
            onClick={() => {
              setActiveTab("FRIENDS");
              setError(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
              activeTab === "FRIENDS"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>👥</span>
            <span>Add Friends / Invite Peers</span>
            {selectedFriends.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-900 text-indigo-200 text-3xs font-extrabold">
                {selectedFriends.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("RANDOM");
              setError(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
              activeTab === "RANDOM"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>🎲</span>
            <span>Placed Between Random Students</span>
          </button>
        </div>

        {/* ERROR NOTICE */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: ADD FRIENDS */}
        {activeTab === "FRIENDS" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Selected Friends Tray */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>Selected Discussion Panel</span>
                  <span className="text-2xs text-slate-400 font-normal">
                    (You + {selectedFriends.length} / 3 friends)
                  </span>
                </label>
                {selectedFriends.length < 3 && (
                  <span className="text-3xs text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                    Remaining slots filled with campus peers
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-2.5 min-h-[58px]">
                {/* User tile */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-3xs font-black flex items-center justify-center">
                    YOU
                  </span>
                  <span>You (Candidate)</span>
                </div>

                {/* Selected Friends */}
                {selectedFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-200 text-xs font-semibold animate-fade-in"
                  >
                    <img
                      src={friend.avatar_url}
                      alt={friend.name}
                      className="w-6 h-6 rounded-full object-cover border border-indigo-400/50"
                    />
                    <span>{friend.name}</span>
                    <span className="text-4xs text-indigo-300 font-mono">
                      ({friend.branch})
                    </span>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-slate-400 hover:text-rose-400 ml-1 transition"
                      title="Remove from panel"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {selectedFriends.length === 0 && (
                  <span className="text-xs text-slate-500 italic">
                    No friends added yet. Search below or pick from suggestions to form your panel.
                  </span>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Search Classmates / Friends by Name, Roll No., or Branch
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Lydia Stark, CSE, ROLL2026..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 pl-9"
                />
                <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchQuery.trim().length > 0 && (
              <div>
                <span className="text-3xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  {isSearching ? "Searching classmates..." : `Search Results (${searchResults.length})`}
                </span>
                {searchResults.length === 0 && !isSearching ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    No students found matching "{searchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {searchResults.map((peer) => {
                      const isAdded = selectedFriends.some((f) => f.id === peer.id);
                      return (
                        <div
                          key={peer.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={peer.avatar_url}
                              alt={peer.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700"
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">
                                {peer.name}
                              </h5>
                              <p className="text-3xs text-slate-400 truncate">
                                {peer.branch} • {peer.student_identifier}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            disabled={isAdded}
                            onClick={() => handleAddFriend(peer)}
                            className={`text-2xs font-bold px-3 py-1 shrink-0 ${
                              isAdded
                                ? "bg-slate-800 text-slate-400 cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {isAdded ? "✓ Added" : "+ Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Classmates (if not searching) */}
            {searchQuery.trim().length === 0 && (
              <div>
                <span className="text-3xs uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  Suggested College Peers & Friends
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {suggestedPeers.map((peer) => {
                    const isAdded = selectedFriends.some((f) => f.id === peer.id);
                    return (
                      <div
                        key={peer.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={peer.avatar_url}
                            alt={peer.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">
                              {peer.name}
                            </h5>
                            <p className="text-3xs text-slate-400 truncate">
                              {peer.branch} • {peer.student_identifier}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          disabled={isAdded}
                          onClick={() => handleAddFriend(peer)}
                          className={`text-2xs font-bold px-3 py-1 shrink-0 ${
                            isAdded
                              ? "bg-slate-800 text-slate-400 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          {isAdded ? "✓ Added" : "+ Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PLACED BETWEEN RANDOM STUDENTS */}
        {activeTab === "RANDOM" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-950 to-slate-900 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xs uppercase tracking-widest text-emerald-400 font-extrabold">
                    ⚡ Auto-Placement Mode
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 text-3xs font-bold border border-emerald-700/50">
                    Real Recruitment Simulator
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mt-1">
                  Placed Between Random Campus Students
                </h4>
                <p className="text-2xs text-slate-300 max-w-md mt-0.5 leading-relaxed">
                  You will be seated randomly among candidates from different engineering & technology branches to simulate an authentic campus placement round.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={loadRandomPeers}
                disabled={isLoadingRandom}
                className="border-emerald-600/60 text-emerald-300 hover:bg-emerald-950 text-xs shrink-0 font-bold"
              >
                <span>🔄 Shuffle Random Cohort</span>
              </Button>
            </div>

            <div>
              <span className="text-3xs uppercase tracking-wider text-slate-400 font-bold block mb-3">
                Matched Peer Panel Roster (3 Random Candidates)
              </span>

              {isLoadingRandom ? (
                <div className="p-8 text-center text-xs text-emerald-400 animate-pulse">
                  Matching candidates from active campus directory...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {randomPeers.map((peer, idx) => (
                    <div
                      key={peer.id || idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center relative overflow-hidden"
                    >
                      <span className="absolute top-2 right-2 text-4xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Peer {idx + 1}
                      </span>
                      <img
                        src={peer.avatar_url}
                        alt={peer.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 mb-2.5 shadow-md"
                      />
                      <h5 className="text-xs font-bold text-white mb-0.5">
                        {peer.name}
                      </h5>
                      <span className="text-3xs text-emerald-300 font-medium">
                        {peer.branch}
                      </span>
                      <span className="text-4xs text-slate-500 mt-1 font-mono">
                        {peer.student_identifier}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-2xs text-slate-400">
              💡 <strong>Evaluation Tip:</strong> In random placement discussions, listen attentively to unfamiliar perspectives and synthesize conflicting arguments to demonstrate executive leadership.
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-2xs text-slate-400">
            {activeTab === "FRIENDS" ? (
              <span>
                Panel configured with <strong>{selectedFriends.length}</strong> friend(s).
              </span>
            ) : (
              <span>
                Panel ready with <strong>3</strong> randomly placed student candidates.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs w-full sm:w-auto font-bold"
            >
              Cancel
            </Button>

            <Button
              onClick={handleLaunchSession}
              disabled={isLaunching || (activeTab === "FRIENDS" && selectedFriends.length === 0)}
              className={`text-xs font-black px-6 py-2.5 w-full sm:w-auto shadow-lg transition ${
                activeTab === "FRIENDS"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
              }`}
            >
              {isLaunching
                ? "Launching Discussion Room..."
                : activeTab === "FRIENDS"
                ? "🚀 Enter Group Discussion with Friends →"
                : "🚀 Enter Group Discussion (Random Cohort) →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
