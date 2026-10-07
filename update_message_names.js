const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\MessageController.php';
let content = fs.readFileSync(file, 'utf8');

// Update TPO view of students to get real names
content = content.replace(
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])
                ->get()
                ->map(function ($u) {
                    $arr = $u->toArray();
                    $arr['name'] = explode('@', $u->email)[0];
                    return $arr;
                });`,
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])
                ->get()
                ->map(function ($u) {
                    $arr = $u->toArray();
                    $student = \\App\\Models\\Student::where('user_id', $u->id)->first();
                    if ($student) {
                        $arr['name'] = $student->first_name . ' ' . $student->last_name;
                    } else {
                        $arr['name'] = explode('@', $u->email)[0];
                    }
                    return $arr;
                });`
);

fs.writeFileSync(file, content);
console.log('Successfully updated MessageController to use real names');
