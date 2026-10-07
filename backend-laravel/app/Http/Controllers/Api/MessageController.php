<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\User;

class MessageController extends Controller
{
    public function contacts(Request $request)
    {
        $user = $request->user();
        
        // If Student, list all Placement Officers
        if ($user->role === 'STUDENT') {
            $contacts = User::where('role', 'PLACEMENT_OFFICER')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])
                ->get()
                ->map(function ($u) {
                    $arr = $u->toArray();
                    $arr['name'] = "Placement Officer";
                    return $arr;
                });
            return response()->json($contacts);
        }
        
        // If Placement Officer, list all Students
        if ($user->role === 'PLACEMENT_OFFICER') {
            $contacts = User::where('role', 'STUDENT')
                ->select('id', 'email', 'role')
                ->addSelect(['unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('sender_id', 'users.id')
                    ->where('receiver_id', $user->id)
                    ->whereNull('read_at')
                ])
                ->get()
                ->map(function ($u) {
                    $arr = $u->toArray();
                    $student = \App\Models\Student::where('user_id', $u->id)->first();
                    if ($student) {
                        $arr['name'] = $student->first_name . ' ' . $student->last_name;
                    } else {
                        $arr['name'] = explode('@', $u->email)[0];
                    }
                    return $arr;
                });
            return response()->json($contacts);
        }
        
        return response()->json([]);
    }

    public function conversation(Request $request, $otherUserId)
    {
        $userId = $request->user()->id;
        
        // Mark unread messages as read
        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = Message::where(function($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
            })
            ->orWhere(function($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get();
            
        return response()->json($messages);
    }

    public function send(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'content' => 'required|string|max:5000',
        ]);
        
        $message = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $validated['receiver_id'],
            'content' => $validated['content'],
        ]);
        
        return response()->json($message, 201);
    }
}
