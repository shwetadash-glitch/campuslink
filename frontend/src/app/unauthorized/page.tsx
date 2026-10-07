export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-campusblue-50">
      <div className="bg-white p-8 rounded shadow text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">403 Forbidden</h1>
        <p className="text-campusblue-800">You do not have permission to access this page.</p>
        <a href="/login" className="mt-6 inline-block bg-campusblue-700 text-white px-4 py-2 rounded">
          Back to Login
        </a>
      </div>
    </div>
  );
}


