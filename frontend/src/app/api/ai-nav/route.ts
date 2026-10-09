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

    const response = await fetch((process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        prompt: systemPrompt + '\n\nUser Request: ' + prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      console.error("Ollama error:", response.statusText);
      return NextResponse.json({ message: "Sorry, I couldn't connect to my brain. Taking you home.", route: '/dashboard' });
    }

    const data = await response.json();
    try {
        let parsed = data.response;
        parsed = parsed.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(parsed);
        return NextResponse.json(json);
    } catch(e) {
        console.error("JSON parse error:", e);
        return NextResponse.json({ message: "Sorry, I had trouble understanding that. Taking you home.", route: '/dashboard' });
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ message: "An error occurred. Taking you home.", route: '/dashboard' });
  }
}

