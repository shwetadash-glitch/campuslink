const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\MessageController.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `            $contacts = User::where('role', 'PLACEMENT_OFFICER')
                ->select('id', 'email', 'role')`,
    `            $contacts = User::where('role', 'PLACEMENT_OFFICER')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])`
);

content = content.replace(
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')`,
    `            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])`
);

fs.writeFileSync(file, content);
console.log('Successfully updated MessageController to include unread_count');
