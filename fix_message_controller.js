const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\MessageController.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `            $contacts = User::where('role', 'PLACEMENT_OFFICER')
                ->select('id', 'name', 'email', 'role')
                ->get();`,
    `            $contacts = User::where('role', 'PLACEMENT_OFFICER')
                ->select('id', 'email', 'role')
                ->get()
                ->map(function ($u) {
                    $u->name = "Placement Officer";
                    return $u;
                });`
);

content = content.replace(
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'name', 'email', 'role')
                ->get();`,
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')
                ->get()
                ->map(function ($u) {
                    $u->name = explode('@', $u->email)[0]; // Fallback to email prefix
                    return $u;
                });`
);

fs.writeFileSync(file, content);
console.log('Successfully updated MessageController.php');
