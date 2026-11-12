<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller {
    public function register(RegisterRequest $request) {
        $validated = $request->validated();
        
        if ($validated['role'] === UserRole::SUPER_ADMIN->value) {
            return response()->json(['detail' => 'Cannot register as SUPER_ADMIN'], 403);
        }
        if ($validated['role'] === UserRole::PLACEMENT_OFFICER->value) {
            return response()->json(['detail' => 'Cannot register as PLACEMENT_OFFICER'], 403);
        }
        if ($validated['role'] === UserRole::MENTOR->value) {
            return response()->json(['detail' => 'Cannot register as MENTOR'], 403);
        }

        return DB::transaction(function () use ($validated) {
            $user = User::create([
                'email' => $validated['email'],
                'password_hash' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);
            if ($validated['role'] === UserRole::STUDENT->value) {
                $namePrefix = ucfirst(explode('@', $validated['email'])[0]);
                Student::create([
                    'user_id' => $user->id,
                    'student_identifier' => 'STU' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
                    'first_name' => $namePrefix,
                    'last_name' => 'Student',
                    'branch' => 'Computer Science',
                    'graduation_year' => date('Y') + 2,
                    'cgpa' => 8.0,
                ]);
            } elseif ($validated['role'] === UserRole::RECRUITER->value) {
                $namePrefix = ucfirst(explode('@', $validated['email'])[0]);
                $companyName = $namePrefix . ' Technologies';
                $company = Company::create(
                    ['name' => $companyName, 'description' => null, 'industry' => 'Information Technology', 'size' => '51-200']
                );
                Recruiter::create([
                    'user_id' => $user->id,
                    'company_id' => $company->id,
                    'contact_name' => $namePrefix,
                    'contact_email' => $validated['email'],
                ]);
            }
            return response()->json([
                'message' => 'User registered successfully',
                'user' => new UserResource($user)
            ], 201);
        });
    }

    public function login(LoginRequest $request) {
        $identifier = $request->input('email') ?? $request->input('username');
        $user = User::where('email', $identifier)->first();
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['detail' => 'Incorrect email or password'], 401); // 401 in FastAPI
        }
        if (!$user->is_active) {
            return response()->json(['detail' => 'Inactive user'], 400);
        }
        $token = $user->createToken('auth_token')->plainTextToken;
        $refreshToken = $user->createToken('refresh_token')->plainTextToken;
        return response()->json([
            'access_token' => $token,
            'refresh_token' => $refreshToken,
            'token_type' => 'bearer',
            'user' => new UserResource($user)
        ]);
    }

    public function me(Request $request) {
        return new UserResource($request->user());
    }

    public function refresh(Request $request) {
        $refreshToken = $request->input('refresh_token');
        if (!$refreshToken) {
            return response()->json(['detail' => 'Invalid token type'], 401);
        }
        
        // Find the token in the database
        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($refreshToken);
        if (!$tokenModel || $tokenModel->name !== 'refresh_token') {
            return response()->json(['detail' => 'Invalid token type'], 401);
        }
        
        $user = $tokenModel->tokenable;
        if (!$user || !$user->is_active) {
            return response()->json(['detail' => 'User not found or inactive'], 401);
        }
        
        $user->tokens()->where('name', 'refresh_token')->delete();
        $user->tokens()->where('name', 'auth_token')->delete();
        
        $newToken = $user->createToken('auth_token')->plainTextToken;
        $newRefreshToken = $user->createToken('refresh_token')->plainTextToken;
        return response()->json([
            'access_token' => $newToken,
            'refresh_token' => $newRefreshToken,
            'token_type' => 'bearer'
        ]);
    }
}
