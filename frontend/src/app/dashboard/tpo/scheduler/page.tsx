"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";

const INITIAL_EVENTS = [
  { id: 1, name: "TechCorp Aptitude Test", date: "Oct 15, 2026", time: "10:00 AM - 12:00 PM", location: "Computer Center Labs", type: "TEST", conflict: false, description: "Initial screening test focusing on quantitative aptitude, logical reasoning, and basic programming concepts for all registered candidates." },
  { id: 2, name: "Innovate Technical Interviews", date: "Oct 15, 2026", time: "01:00 PM - 05:00 PM", location: "Interview Rooms A & B", type: "INTERVIEW", conflict: false, description: "One-on-one technical interview rounds for candidates who cleared the initial screening. Focuses on data structures and algorithms." },
  { id: 3, name: "Global Systems Pre-Placement Talk", date: "Oct 16, 2026", time: "09:30 AM - 11:00 AM", location: "Main Auditorium", type: "PPT", conflict: false, description: "An introductory session by Global Systems executives discussing company culture, role expectations, and career growth." },
  { id: 4, name: "NextGen AI Coding Round", date: "Oct 16, 2026", time: "10:00 AM - 01:00 PM", location: "Virtual (HackerRank)", type: "TEST", conflict: true, description: "Intensive 3-hour competitive coding assessment on HackerRank evaluating problem-solving skills for the Machine Learning Engineer role." },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SchedulerPage() {
  const [selectedDate, setSelectedDate] = useState("Oct 16, 2026");
  const [viewMode, setViewMode] = useState<"DAY" | "WEEK">("DAY");
  
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [ignoredConflicts, setIgnoredConflicts] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [modalState, setModalState] = useState<{ type: string, event?: any, date?: string } | null>(null);

  // Load from local storage on mount
  React.useEffect(() => {
    const savedEvents = localStorage.getItem("scheduler_events");
    const savedIgnored = localStorage.getItem("scheduler_ignored");
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedIgnored) setIgnoredConflicts(JSON.parse(savedIgnored));
    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  React.useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("scheduler_events", JSON.stringify(events));
      localStorage.setItem("scheduler_ignored", JSON.stringify(ignoredConflicts));
    }
  }, [events, ignoredConflicts, isLoaded]);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2026, 9)); // Default to Oct 2026 (0-indexed month)
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const monthName = MONTH_NAMES[currentMonthDate.getMonth()];
  const currentYear = currentMonthDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonthDate.getMonth() - 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonthDate.getMonth() + 1));
  };

  const getStartOfWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to Sunday
    return new Date(d.setDate(diff));
  };
  
  const getEndOfWeek = (dateStr: string) => {
    const d = getStartOfWeek(dateStr);
    return new Date(d.setDate(d.getDate() + 6));
  };
  
  const isEventInSelectedWeek = (eventDateStr: string, selectedDateStr: string) => {
    const eventDate = new Date(eventDateStr);
    const startOfWeek = getStartOfWeek(selectedDateStr);
    const endOfWeek = getEndOfWeek(selectedDateStr);
    eventDate.setHours(0,0,0,0);
    startOfWeek.setHours(0,0,0,0);
    endOfWeek.setHours(23,59,59,999);
    return eventDate >= startOfWeek && eventDate <= endOfWeek;
  };

  const displayedEvents = viewMode === "DAY" 
    ? events.filter(e => e.date === selectedDate)
    : events.filter(e => isEventInSelectedWeek(e.date, selectedDate));

  const handleIgnore = (id: number) => {
    setIgnoredConflicts([...ignoredConflicts, id]);
  };

  const updateConflicts = (currentEvents: any[]) => {
    return currentEvents.map(ev => {
      // Detect conflict: Same date and same time slot
      const hasConflict = currentEvents.some(other => other.id !== ev.id && other.date === ev.date && other.time === ev.time);
      return { ...ev, conflict: hasConflict };
    });
  };

  const handleResolve = (id: number, action: string) => {
    if (action === "RESCHEDULE_NEXTGEN") {
      const updated = events.map(e => e.id === id ? { ...e, time: "02:00 PM - 05:00 PM" } : e);
      setEvents(updateConflicts(updated));
    }
    setModalState(null);
  };

  const handleSaveTime = (id: number, newTime: string) => {
    const updated = events.map(e => e.id === id ? { ...e, time: newTime } : e);
    setEvents(updateConflicts(updated));
    setModalState(null);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newEvent = {
      id: Date.now(),
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      date: modalState?.date || selectedDate,
      time: (form.elements.namedItem("time") as HTMLSelectElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      type: (form.elements.namedItem("type") as HTMLSelectElement).value,
      conflict: false,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value || "No description provided."
    };
    
    setEvents(updateConflicts([...events, newEvent]));
    setModalState(null);
  };

  if (!isLoaded) return null;

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="Conflict-Free Scheduler" 
        description="Automated placement scheduling engine that eliminates overlaps and optimizes resource allocation." 
        actionLabel="Schedule Event"
        onAction={() => setModalState({ type: "ADD", date: selectedDate })}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar Sidebar */}
          <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-campusblue-900">{monthName} {currentYear}</h3>
              <div className="flex gap-1">
                <button onClick={handlePrevMonth} className="p-1.5 rounded bg-campusblue-50 hover:bg-campusblue-100 text-campusblue-700 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={handleNextMonth} className="p-1.5 rounded bg-campusblue-50 hover:bg-campusblue-100 text-campusblue-700 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-campusblue-500 mb-2">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {/* Empty padding blocks for the first week */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="text-campusblue-200 py-2"></div>
              ))}
              
              {/* Actual Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateString = `${monthName} ${day}, ${currentYear}`;
                const isSelected = selectedDate === dateString;
                const hasEvents = events.some(e => e.date === dateString);
                const hasActiveConflict = events.some(e => e.date === dateString && e.conflict && !ignoredConflicts.includes(e.id));

                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDate(dateString)} 
                    className={`group py-2 rounded-lg cursor-pointer font-bold relative transition-colors ${
                      isSelected 
                        ? "bg-campusblue-700 text-white shadow-md" 
                        : hasEvents
                          ? (hasActiveConflict ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-campusblue-50 text-campusblue-800 hover:bg-campusblue-50")
                          : "hover:bg-campusblue-50 text-campusblue-800"
                    }`}
                  >
                    {day}
                    
                    {/* Add Event Hover Button */}
                    {!isSelected && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalState({ type: "ADD", date: dateString });
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-campusblue-500 hover:bg-campusblue-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Add Event"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    )}

                    {hasActiveConflict && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 border-t border-campusblue-50 pt-6">
              <h4 className="text-xs font-bold text-campusblue-300 uppercase tracking-wider mb-4">Resource Availability</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-campusblue-700">Computer Labs</span>
                  <span className="font-bold text-campusblue-900">4 / 10 Used</span>
                </div>
                <div className="w-full bg-campusblue-50 rounded-full h-1.5"><div className="bg-campusblue-500 h-1.5 rounded-full w-2/5"></div></div>
                
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-campusblue-700">Interview Rooms</span>
                  <span className="font-bold text-campusblue-900">8 / 8 Used</span>
                </div>
                <div className="w-full bg-campusblue-50 rounded-full h-1.5"><div className="bg-campusblue-500 h-1.5 rounded-full w-full"></div></div>
              </div>
            </div>
          </div>

          {/* Schedule View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-campusblue-50 bg-campusblue-50/50 flex justify-between items-center">
                <h3 className="font-bold text-campusblue-900 text-lg">
                  {viewMode === "DAY" ? `Schedule for ${selectedDate}` : "Weekly Schedule View"}
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode("DAY")} 
                    className={`px-3 py-1 rounded text-xs font-semibold shadow-sm transition ${viewMode === "DAY" ? "bg-white border border-campusblue-100 text-campusblue-900" : "bg-campusblue-50 text-campusblue-500 hover:bg-campusblue-100"}`}
                  >
                    Day View
                  </button>
                  <button 
                    onClick={() => setViewMode("WEEK")} 
                    className={`px-3 py-1 rounded text-xs font-semibold shadow-sm transition ${viewMode === "WEEK" ? "bg-white border border-campusblue-100 text-campusblue-900" : "bg-campusblue-50 text-campusblue-500 hover:bg-campusblue-100"}`}
                  >
                    Week View
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {displayedEvents.length === 0 ? (
                  <div className="text-center py-10 text-campusblue-500">
                    No events scheduled for {viewMode === "DAY" ? "this date" : "this week"}.
                  </div>
                ) : (
                  <>
                    {displayedEvents.map((event, idx) => {
                      const showDateHeader = viewMode === "WEEK" && (idx === 0 || displayedEvents[idx - 1].date !== event.date);
                      const isIgnored = ignoredConflicts.includes(event.id);
                      const isConflict = event.conflict && !isIgnored;

                      return (
                        <React.Fragment key={event.id}>
                          {showDateHeader && (
                            <h4 className="font-bold text-campusblue-900 border-b border-campusblue-50 pb-2 mt-4 first:mt-0">
                              {event.date}
                            </h4>
                          )}
                          <div className={`border rounded-xl p-5 relative overflow-hidden transition-all ${isConflict ? 'border-red-200 bg-red-50/30' : 'border-campusblue-100 bg-white hover:border-campusblue-200 hover:shadow-sm'}`}>
                            {isConflict && (
                              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                Conflict Detected
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    event.type === 'TEST' ? 'bg-campusblue-50 text-campusblue-800' : 
                                    event.type === 'INTERVIEW' ? 'bg-campusblue-50 text-campusblue-800' : 
                                    'bg-campusblue-50 text-campusblue-800'
                                  }`}>
                                    {event.type}
                                  </span>
                                  <span className="text-sm font-semibold text-campusblue-500">{event.time}</span>
                                  {viewMode === "WEEK" && !showDateHeader && (
                                    <span className="text-xs text-campusblue-300 ml-2">&bull; {event.date}</span>
                                  )}
                                </div>
                                <h4 className="text-lg font-bold text-campusblue-900">{event.name}</h4>
                                <div className="flex items-center gap-1 text-sm text-campusblue-500 mt-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  {event.location}
                                </div>
                              </div>
                              
                              <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                                {isConflict ? (
                                  <>
                                    <button onClick={() => setModalState({ type: 'RESOLVE', event })} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition w-full">Resolve Overlap</button>
                                    <button onClick={() => handleIgnore(event.id)} className="bg-white border border-campusblue-100 hover:bg-campusblue-50 text-campusblue-800 px-4 py-2 rounded-lg text-sm font-semibold transition w-full">Ignore</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => setModalState({ type: 'EDIT', event })} className="bg-campusblue-50 hover:bg-campusblue-50 text-campusblue-800 border border-campusblue-100 px-4 py-2 rounded-lg text-sm font-semibold transition w-full">Edit Time</button>
                                    <button onClick={() => setModalState({ type: 'DETAILS', event })} className="bg-white border border-campusblue-100 hover:bg-campusblue-50 text-campusblue-800 px-4 py-2 rounded-lg text-sm font-semibold transition w-full">View Details</button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {isConflict && (
                              <div className="mt-4 p-3 bg-red-100/50 rounded-lg border border-red-200 flex gap-3 text-sm text-red-800">
                                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <div>
                                  <strong>Schedule Collision:</strong> This event overlaps with the <em>Global Systems Pre-Placement Talk</em>. 14 shortlisted students are registered for both events simultaneously.
                                </div>
                              </div>
                            )}

                            {isIgnored && event.conflict && (
                              <div className="mt-4 p-3 bg-campusblue-50 rounded-lg border border-campusblue-50 flex gap-3 text-sm text-campusblue-900">
                                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div>
                                  <strong>Overlap Ignored:</strong> You have chosen to bypass the schedule collision warning for this event.
                                </div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Modals */}
      {modalState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-campusblue-100">
            
            <div className="p-6 border-b border-campusblue-50 flex justify-between items-center bg-campusblue-50/50">
              <h2 className="text-xl font-bold text-campusblue-900 leading-tight">
                {modalState.type === 'DETAILS' && "Event Details"}
                {modalState.type === 'EDIT' && "Adjust Event Time"}
                {modalState.type === 'RESOLVE' && "Resolve Collision"}
                {modalState.type === 'ADD' && "Add New Event"}
              </h2>
              <button onClick={() => setModalState(null)} className="w-8 h-8 flex items-center justify-center bg-campusblue-50 hover:bg-campusblue-100 rounded-full text-campusblue-500 hover:text-campusblue-800 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              {modalState.event && <h3 className="font-bold text-campusblue-900">{modalState.event.name}</h3>}
              
              {modalState.type === 'DETAILS' && modalState.event && (
                <div className="space-y-3">
                  <div className="text-sm text-campusblue-700 leading-relaxed bg-campusblue-50 p-4 rounded-lg border border-campusblue-50">
                    {modalState.event.description}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="block text-xs font-bold text-campusblue-300 uppercase">Date</span>
                      <span className="text-sm font-semibold">{modalState.event.date}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-campusblue-300 uppercase">Time</span>
                      <span className="text-sm font-semibold">{modalState.event.time}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs font-bold text-campusblue-300 uppercase">Location</span>
                      <span className="text-sm font-semibold">{modalState.event.location}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalState.type === 'EDIT' && modalState.event && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-campusblue-800 mb-1">Time Slot</label>
                    <select 
                      className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm"
                      defaultValue={modalState.event.time}
                      id="timeSelect"
                    >
                      <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                      <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                      <option value="01:00 PM - 04:00 PM">01:00 PM - 04:00 PM</option>
                      <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById('timeSelect') as HTMLSelectElement;
                      handleSaveTime(modalState.event.id, sel.value);
                    }}
                    className="w-full bg-campusblue-700 hover:bg-campusblue-800 text-white py-2 rounded-lg font-bold transition"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              {modalState.type === 'RESOLVE' && modalState.event && (
                <div className="space-y-3">
                  <p className="text-sm text-campusblue-700 mb-4">
                    Please select an action to resolve the scheduling collision for this event.
                  </p>
                  <button 
                    onClick={() => handleResolve(modalState.event.id, "RESCHEDULE_NEXTGEN")} 
                    className="w-full text-left p-4 border border-campusblue-100 rounded-lg hover:bg-campusblue-50 hover:border-campusblue-200 transition"
                  >
                    <div className="font-bold text-campusblue-900 text-sm">Reschedule to Afternoon Slot</div>
                    <div className="text-xs text-campusblue-500 mt-1">Moves this event to 02:00 PM - 05:00 PM to clear the overlap.</div>
                  </button>
                  <button 
                    onClick={() => { alert("Message sent to recruiter!"); setModalState(null); }} 
                    className="w-full text-left p-4 border border-campusblue-100 rounded-lg hover:bg-campusblue-50 transition"
                  >
                    <div className="font-bold text-campusblue-900 text-sm">Request Recruiter to Shift Date</div>
                    <div className="text-xs text-campusblue-500 mt-1">Send an automated email to the company requesting a new date.</div>
                  </button>
                </div>
              )}

              {modalState.type === 'ADD' && (
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-campusblue-800 mb-1">Event Name</label>
                    <input name="name" required className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm" placeholder="e.g. Mock Interview Drive" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-campusblue-800 mb-1">Event Type</label>
                      <select name="type" className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm">
                        <option value="INTERVIEW">Interview</option>
                        <option value="TEST">Test</option>
                        <option value="PPT">PPT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-campusblue-800 mb-1">Time Slot</label>
                      <select name="time" className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm">
                        <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                        <option value="01:00 PM - 04:00 PM">01:00 PM - 04:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-campusblue-800 mb-1">Location</label>
                    <input name="location" required defaultValue="Computer Labs" className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-campusblue-800 mb-1">Description</label>
                    <textarea name="description" rows={2} placeholder="Briefly describe this event..." className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm resize-none"></textarea>
                  </div>
                  
                  <div className="bg-campusblue-50 p-3 rounded-lg border border-campusblue-50 flex gap-2">
                    <svg className="w-5 h-5 text-campusblue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div className="text-xs text-campusblue-800">
                      <strong>Selected Date:</strong> {modalState.date}
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-campusblue-700 hover:bg-campusblue-800 text-white py-2.5 rounded-lg font-bold shadow-sm transition mt-2">
                    Add Event to Schedule
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}





