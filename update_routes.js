const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\backend-laravel\\routes\\api.php';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `use App\\Http\\Controllers\\Api\\JobApplicationController;`,
    `use App\\Http\\Controllers\\Api\\JobApplicationController;\nuse App\\Http\\Controllers\\Api\\MessageController;`
);

content = content.replace(
    `Route::get('/auth/me', [AuthController::class, 'me']);`,
    `Route::get('/auth/me', [AuthController::class, 'me']);\n        \n        Route::get('/messages/contacts', [MessageController::class, 'contacts']);\n        Route::get('/messages/{userId}', [MessageController::class, 'conversation']);\n        Route::post('/messages', [MessageController::class, 'send']);`
);

fs.writeFileSync(file, content);
console.log('Successfully updated api.php');
