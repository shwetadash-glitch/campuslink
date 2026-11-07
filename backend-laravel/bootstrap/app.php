<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Disabled statefulApi() as frontend uses Bearer tokens, not cookies
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (\App\Exceptions\AiServiceUnavailableException $e, Request $request) {
            return response()->json([
                'status' => 'error',
                'code' => 'AI_SERVICE_UNAVAILABLE',
                'message' => $e->getMessage() ?: 'The AI service is temporarily unavailable. Core operations remain fully functional.',
                'retry_after' => $e->getRetryAfter(),
            ], 503);
        });
    })->create();
