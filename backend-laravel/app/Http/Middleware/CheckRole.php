<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['detail' => 'Unauthenticated'], 401);
        }

        // Super Admin has universal access across administrative and student inspection endpoints
        if ($user->role === 'SUPER_ADMIN' || in_array($user->role, $roles)) {
            return $next($request);
        }

        return response()->json(['detail' => 'Forbidden'], 403);
    }
}
