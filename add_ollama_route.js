const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\routes\\api.php';
let content = fs.readFileSync(file, 'utf8');

// Ensure Http facade is imported
if (!content.includes('use Illuminate\\Support\\Facades\\Http;')) {
    content = content.replace('use Illuminate\\Support\\Facades\\Route;', 'use Illuminate\\Support\\Facades\\Route;\nuse Illuminate\\Support\\Facades\\Http;');
}

const newRoute = `
Route::get('/ollama-test', function () {
    $response = Http::timeout(120)->post(
        env('OLLAMA_URL') . '/api/generate',
        [
            'model' => env('OLLAMA_MODEL', 'llama3.2'),
            'prompt' => 'Give me one interview question for a computer science student.',
            'stream' => false,
        ]
    );

    return $response->json();
});
`;

content += newRoute;
fs.writeFileSync(file, content);
console.log('Added temporary ollama-test route to api.php');
