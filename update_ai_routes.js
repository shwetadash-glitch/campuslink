const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\routes\\api.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `use App\\Http\\Controllers\\Api\\MessageController;`,
    `use App\\Http\\Controllers\\Api\\MessageController;\nuse App\\Http\\Controllers\\Api\\AiHelperController;`
);

content = content.replace(
    `Route::post('/messages', [MessageController::class, 'send']);`,
    `Route::post('/messages', [MessageController::class, 'send']);\n        Route::post('/ai-interview/chat', [AiHelperController::class, 'chat']);`
);

fs.writeFileSync(file, content);
console.log('Successfully updated api.php with AI route');
