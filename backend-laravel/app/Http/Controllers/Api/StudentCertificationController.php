<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudentCertificationController extends Controller {
    public function index(Request $request) {
        return $request->user()->studentProfile->certifications()->get();
    }
    public function store(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|min:1|max:200', 
            'issuing_org' => 'required|string|min:1|max:200', 
            'issue_date' => 'nullable|date', 
            'expiry_date' => 'nullable|date',
            'credential_id' => 'nullable|string|max:100',
            'proof_file' => 'nullable|file|mimes:pdf|max:10240'
        ]);
        
        if (isset($validated['issue_date']) && isset($validated['expiry_date'])) {
            if (strtotime($validated['expiry_date']) < strtotime($validated['issue_date'])) {
                return response()->json(['detail' => 'Expiry date cannot be before issue date'], 400);
            }
        }
        
        $data = $validated;
        unset($data['proof_file']);
        
        if ($request->hasFile('proof_file')) {
            $path = $request->file('proof_file')->store('certificates', 'public');
            $data['proof_path'] = '/storage/' . $path;
        }
        
        $cert = $request->user()->studentProfile->certifications()->create($data);
        return response()->json($cert, 200);
    }
    public function update(Request $request, $id) {
        $cert = $request->user()->studentProfile->certifications()->where('id', $id)->first();
        if (!$cert) return response()->json(['detail' => 'Certification not found'], 404);
        
        $validated = $request->validate([
            'name' => 'sometimes|string|min:1|max:200', 
            'issuing_org' => 'sometimes|string|min:1|max:200', 
            'issue_date' => 'nullable|date', 
            'expiry_date' => 'nullable|date',
            'credential_id' => 'nullable|string|max:100',
            'proof_file' => 'nullable|file|mimes:pdf|max:10240'
        ]);
        
        $newIssueDate = array_key_exists('issue_date', $validated) ? $validated['issue_date'] : $cert->issue_date;
        $newExpiryDate = array_key_exists('expiry_date', $validated) ? $validated['expiry_date'] : $cert->expiry_date;
        
        if ($newIssueDate && $newExpiryDate) {
            if (strtotime($newExpiryDate) < strtotime($newIssueDate)) {
                return response()->json(['detail' => 'Expiry date cannot be before issue date'], 400);
            }
        }
        
        $data = $validated;
        unset($data['proof_file']);
        
        if ($request->hasFile('proof_file')) {
            $path = $request->file('proof_file')->store('certificates', 'public');
            $data['proof_path'] = '/storage/' . $path;
        }
        
        $cert->update($data);
        return response()->json($cert);
    }
    public function destroy(Request $request, $id) {
        $cert = $request->user()->studentProfile->certifications()->where('id', $id)->first();
        if (!$cert) return response()->json(['detail' => 'Certification not found'], 404);
        $cert->delete();
        return response()->json(null, 204);
    }
}
