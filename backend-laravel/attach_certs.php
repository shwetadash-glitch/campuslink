<?php
$studentProfile = \App\Models\User::where('email', 'student1@college.edu')->first()->studentProfile;
$certs = $studentProfile->certifications;

foreach ($certs as $cert) {
    if (strpos($cert->name, 'AWS') !== false) {
        $cert->proof_path = '/storage/certificates/aws_cert.pdf';
        $cert->save();
        echo "Updated AWS cert.\n";
    }
    if (strpos($cert->name, 'Python') !== false) {
        $cert->proof_path = '/storage/certificates/python_cert.pdf';
        $cert->save();
        echo "Updated Python cert.\n";
    }
}
echo "Done.\n";
