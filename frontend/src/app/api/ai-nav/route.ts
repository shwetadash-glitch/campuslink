import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, userRole } = await req.json();

    const systemPrompt = `You are a helpful navigation assistant for CampusLink. 
Based on the user's request and their role (${userRole}), determine the best route and provide a brief, friendly conversational response.
Available routes:
- Student: /dashboard/profile, /dashboard/readiness, /dashboard/jobs, /dashboard/companies, /dashboard/messages, /dashboard/ai-interview
- Recruiter: /dashboard/recruiter, /dashboard/students (to view candidates)
- Placement Officer (TPO): /dashboard/tpo/command-center, /dashboard/tpo/drive-manager, /dashboard/tpo/students, /dashboard/tpo/shortlisting, /dashboard/tpo/offer-desk, /dashboard/tpo/scheduler, /dashboard/tpo/alerts, /dashboard/tpo/security, /dashboard/tpo/at-risk
- Admin: /dashboard/admin/users, /dashboard/admin/skills
- General: /dashboard

If the user asks a general question about how to use a feature, guide them to the most relevant page and explain what they can do there in your message.

Reply ONLY with a JSON object in this exact format:
{"message": "Sure, let me take you to the drive manager where you can configure the placement rounds!", "route": "/the/chosen/route"}

No markdown wrappers, no backticks, no other text. Only pure JSON.`;

    const targetUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api/generate';
    
    let response: Response | null = null;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3.2',
          prompt: systemPrompt + '\n\nUser Request: ' + prompt,
          stream: false,
          format: 'json',
        }),
        signal: AbortSignal.timeout(3000), // 3s timeout to prevent hanging
      });
    } catch {
      // Ollama service unreachable or timed out - fall back to deterministic role routing
      return NextResponse.json(getDeterministicNav(prompt, userRole));
    }

    if (!response || !response.ok) {
      return NextResponse.json(getDeterministicNav(prompt, userRole));
    }

    const data = await response.json();
    try {
        let parsed = data.response;
        parsed = parsed.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(parsed);
        return NextResponse.json(json);
    } catch {
        return NextResponse.json(getDeterministicNav(prompt, userRole));
    }
  } catch {
    return NextResponse.json({ message: "Welcome to CampusLink. Taking you to your dashboard.", route: '/dashboard' });
  }
}

function getDeterministicNav(prompt: string = '', userRole: string = ''): { message: string, route: string } {
  const p = prompt.toLowerCase();
  if (p.includes('interview') || p.includes('practice')) {
    return { message: "Taking you to the AI Mock Interview practice room.", route: '/dashboard/ai-interview' };
  }
  if (p.includes('profile') || p.includes('resume') || p.includes('cv') || p.includes('skill')) {
    return { message: "Taking you to your student profile and resume manager.", route: '/dashboard/profile' };
  }
  if (p.includes('job') || p.includes('drive') || p.includes('apply')) {
    return { message: "Opening available jobs and placement drives.", route: '/dashboard/jobs' };
  }
  if (p.includes('readiness') || p.includes('score') || p.includes('gap')) {
    return { message: "Opening your employability readiness analytics.", route: '/dashboard/readiness' };
  }
  if (userRole === 'PLACEMENT_OFFICER' || userRole === 'SUPER_ADMIN') {
    if (p.includes('schedule') || p.includes('calendar')) {
      return { message: "Opening the Placement Drive Scheduler.", route: '/dashboard/tpo/scheduler' };
    }
    if (p.includes('drive') || p.includes('lifecycle')) {
      return { message: "Opening Drive Lifecycle Manager.", route: '/dashboard/tpo/drive-manager' };
    }
    return { message: "Taking you to the Placement Command Center.", route: '/dashboard/tpo/command-center' };
  }
  return { message: "Taking you to your central dashboard.", route: '/dashboard' };
}

