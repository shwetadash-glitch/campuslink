<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Notification extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    protected $appends = ['type', 'delivery_status'];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'metadata_json' => 'array',
        'retry_count' => 'integer',
        'max_retries' => 'integer',
    ];

    public function setTypeAttribute($value): void
    {
        $this->attributes['notification_type'] = $value;
    }

    public function getTypeAttribute(): ?string
    {
        return $this->attributes['notification_type'] ?? null;
    }

    public function setDeliveryStatusAttribute($value): void
    {
        $this->attributes['status'] = $value;
    }

    public function getDeliveryStatusAttribute(): ?string
    {
        return $this->attributes['status'] ?? null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function markAsRead(): self
    {
        if ($this->read_at === null) {
            $this->update([
                'status' => 'READ',
                'read_at' => Carbon::now(),
            ]);
        }
        return $this;
    }

    public function markAsDelivered(): self
    {
        $this->update([
            'status' => 'DELIVERED',
            'delivered_at' => Carbon::now(),
            'sent_at' => $this->sent_at ?? Carbon::now(),
        ]);
        return $this;
    }

    public function recordFailure(string $errorMessage): self
    {
        $newRetryCount = $this->retry_count + 1;
        $isFailed = $newRetryCount >= $this->max_retries;

        $this->update([
            'retry_count' => $newRetryCount,
            'last_error' => $errorMessage,
            'status' => $isFailed ? 'FAILED' : 'RETRYING',
        ]);

        return $this;
    }
}
