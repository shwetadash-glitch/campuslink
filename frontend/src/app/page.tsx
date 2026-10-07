import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-campusblue-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold text-campusblue-900 tracking-tight">
          Welcome to CAMPUSLINK
        </h1>
        <p className="text-xl text-campusblue-700">
          The AI-Powered Campus-to-Corporate Placement Management & Analytics Platform.
        </p>
        
        <div className="bg-white p-8 rounded-xl shadow-lg mt-8">
          <h2 className="text-2xl font-bold mb-4 text-campusblue-900">Get Started</h2>
          <p className="text-campusblue-700 mb-6">
            Log in to access your dashboard. 
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/login" 
              className="bg-campusblue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-campusblue-800 transition"
            >
              Login
            </Link>
          </div>
          
          <div className="mt-8 text-left bg-campusblue-50 p-4 rounded-md text-sm text-campusblue-800 border border-campusblue-50">
            <strong>Demo Accounts (Password: <code>rec123</code> / <code>stu123</code>):</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Recruiter: <code>recruiter1@comp1.com</code> (Password: <code>rec123</code>)</li>
              <li>Student: <code>student1@college.edu</code> (Password: <code>stu123</code>)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}



