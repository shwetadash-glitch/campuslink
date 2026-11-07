<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configured for Bearer-token authentication between Vercel and Render.
    | supports_credentials is false because Bearer tokens are transmitted in
    | the Authorization header rather than browser cookies.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'https://campuslink.vercel.app,http://localhost:3000,http://127.0.0.1:3000')))),

    'allowed_origins_patterns' => [
        '#^https://campuslink(-[a-z0-9-]+)?\.vercel\.app$#',
    ],

    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization', 'Accept', 'Origin', 'X-CSRF-TOKEN'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
