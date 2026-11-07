<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OfferVerificationHistory extends Model
{
    use HasFactory;

    protected $table = 'offer_verification_histories';

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'created_at' => 'datetime',
        'metadata' => 'array',
        'actor_user_id' => 'integer',
        'verified_by_user_id' => 'integer',
        'reviewed_document_id' => 'integer',
        'reviewed_document_version' => 'integer',
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->actor_user_id) && ! empty($model->actor_id)) {
                $model->actor_user_id = $model->actor_id;
            }

            if (empty($model->actor_user_id)) {
                throw new \InvalidArgumentException('actor_user_id is required for verification lifecycle events.');
            }

            // Snapshot actor identity if not explicitly provided
            if (empty($model->actor_email) || empty($model->actor_name)) {
                $user = User::find($model->actor_user_id);
                if ($user) {
                    if (empty($model->actor_email)) {
                        $model->actor_email = $user->email;
                    }
                    if (empty($model->actor_name)) {
                        $model->actor_name = $user->name ?? explode('@', $user->email)[0];
                    }
                }
            }

            if (! $model->created_at) {
                $model->created_at = now();
            }
        });

        static::updating(function ($model) {
            throw new \LogicException('OfferVerificationHistory records are append-only and cannot be modified.');
        });

        static::deleting(function ($model) {
            throw new \LogicException('OfferVerificationHistory records are immutable and cannot be deleted.');
        });
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function reviewedDocument()
    {
        return $this->belongsTo(OfferDocument::class, 'reviewed_document_id');
    }

    public function getActorIdAttribute()
    {
        return $this->actor_user_id;
    }

    public function setActorIdAttribute($value)
    {
        $this->attributes['actor_user_id'] = $value;
    }
}
