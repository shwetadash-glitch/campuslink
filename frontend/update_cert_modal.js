const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\features\\students\\CertModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add proofFile state
content = content.replace(
    `const [loading, setLoading] = useState(false);`,
    `const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);`
);

// 2. Reset proofFile in useEffect
content = content.replace(
    `setFieldErrors({});
      setFormError("");`,
    `setFieldErrors({});
      setFormError("");
      setProofFile(null);`
);

// 3. Update handleSubmit
content = content.replace(
    `const payload = {
        name: form.name.trim(),
        issuing_org: form.issuing_org.trim(),
        issue_date: form.issue_date || undefined,
        expiry_date: form.expiry_date || undefined,
        credential_id: form.credential_id.trim() || undefined,
      };

      if (item) {
        await studentsApi.updateCertification(item.id, payload);
      } else {
        await studentsApi.createCertification(payload);
      }`,
    `const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("issuing_org", form.issuing_org.trim());
      if (form.issue_date) formData.append("issue_date", form.issue_date);
      if (form.expiry_date) formData.append("expiry_date", form.expiry_date);
      if (form.credential_id) formData.append("credential_id", form.credential_id.trim());
      if (proofFile) formData.append("proof_file", proofFile);

      if (item) {
        await studentsApi.updateCertification(item.id, formData);
      } else {
        await studentsApi.createCertification(formData);
      }`
);

// 4. Add file input to the form UI
content = content.replace(
    `</FormField>
        </div>

        <div className="flex justify-end gap-3 mt-6">`,
    `</FormField>
        </div>

        <FormField label="Proof Document (PDF, Optional)" error={fieldErrors.proof_file}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) setProofFile(e.target.files[0]);
              else setProofFile(null);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          {item?.proof_path && !proofFile && (
            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Current proof document is attached. Uploading a new one will replace it.
            </p>
          )}
        </FormField>

        <div className="flex justify-end gap-3 mt-6">`
);

fs.writeFileSync(file, content);
console.log('Successfully updated CertModal.tsx');
