<?php
namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest {
    public function authorize() { return true; }
    public function rules() {
        return [
            'username' => 'required_without:email|string',
            'email' => 'required_without:username|string',
            'password' => 'required|string',
        ];
    }
}
