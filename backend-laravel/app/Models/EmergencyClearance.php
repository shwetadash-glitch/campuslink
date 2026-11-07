<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Exceptions\ClearanceValidationException;
use App\Enums\UserRole;

class EmergencyClearance extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $hidden = [
        'clearance_token_hash',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function institutionalEvent()
    {
        return $this->belongsTo(InstitutionalEvent::class, 'institutional_event_id');
    }

    public function placementDrive()
    {
        return $this->belongsTo(PlacementDrive::class, 'placement_drive_id');
    }

    public function approvedByUser()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function usedByUser()
    {
        return $this->belongsTo(User::class, 'used_by_user_id');
    }

    /**
     * Issue a single-use cryptographically secure emergency clearance code.
     * Uses PHP random_bytes(32) providing 256 bits of CSPRNG entropy.
     *
     * @param array $params [
     *    'institutional_event_id' => int,
     *    'placement_drive_id' => int|null,
     *    'target_drive_name' => string|null,
     *    'approved_by_user_id' => int,
     *    'approving_authority_name' => string,
     *    'approving_authority_role' => string,
     *    'reason' => string,
     *    'valid_minutes' => int (optional, default 120)
     * ]
     * @return array ['clearance' => EmergencyClearance, 'raw_clearance_code' => string]
     */
    public static function issue(array $params): array
    {
        // Generate 32 bytes (256 bits) of cryptographically secure unpredictable entropy using random_bytes()
        $rawBytes = random_bytes(32);
        $rawCode = 'EMG-' . strtoupper(bin2hex(substr($rawBytes, 0, 16))) . '-' . strtoupper(bin2hex(substr($rawBytes, 16, 16)));
        $tokenHash = hash('sha256', $rawCode);
        $validMinutes = $params['valid_minutes'] ?? 120;

        $clearance = static::create([
            'clearance_token_hash' => $tokenHash,
            'institutional_event_id' => $params['institutional_event_id'],
            'placement_drive_id' => $params['placement_drive_id'] ?? null,
            'target_drive_name' => $params['target_drive_name'] ?? null,
            'approved_by_user_id' => $params['approved_by_user_id'],
            'approving_authority_name' => $params['approving_authority_name'],
            'approving_authority_role' => $params['approving_authority_role'],
            'reason' => $params['reason'],
            'expires_at' => Carbon::now()->addMinutes($validMinutes),
        ]);

        return [
            'clearance' => $clearance,
            'raw_clearance_code' => $rawCode,
        ];
    }

    /**
     * Validate and consume an emergency clearance token inside a transaction.
     * Enforces single-use, non-expiry, event/drive binding, role authority,
     * and strict separation of duties (two-person rule: issuer cannot redeem own code).
     *
     * @throws ClearanceValidationException
     */
    public static function validateAndConsume(
        string $rawCode,
        int $eventId,
        ?int $driveId,
        ?string $driveName,
        User $requestingUser
    ): self {
        // 1. Role verification: user must have placement administration role
        $roleValue = is_object($requestingUser->role) ? $requestingUser->role->value : (string) $requestingUser->role;
        if (!in_array($roleValue, [UserRole::PLACEMENT_OFFICER->value, UserRole::SUPER_ADMIN->value], true)) {
            throw new ClearanceValidationException(
                'UNAUTHORIZED_OVERRIDE_ATTEMPT',
                'User role [' . $roleValue . '] is not authorized to execute emergency hard-blackout clearance overrides.'
            );
        }

        $tokenHash = hash('sha256', trim($rawCode));

        // 2. Lock clearance row for update to prevent concurrent replay attacks
        $clearance = static::where('clearance_token_hash', $tokenHash)->lockForUpdate()->first();

        if (!$clearance) {
            throw new ClearanceValidationException(
                'INVALID_CLEARANCE_CODE',
                'Emergency clearance code is invalid or does not exist.'
            );
        }

        // 3. Two-person rule (Separation of duties): Approving authority cannot redeem their own clearance
        if ((int) $clearance->approved_by_user_id === (int) $requestingUser->id) {
            throw new ClearanceValidationException(
                'SELF_CLEARANCE_DISALLOWED',
                'Two-person rule violation: The approving executive authority cannot redeem their own emergency clearance. It must be presented and redeemed by a separate placement administrator.'
            );
        }

        // 4. Single-use guard: check if already consumed
        if ($clearance->used_at !== null) {
            throw new ClearanceValidationException(
                'CLEARANCE_ALREADY_USED',
                "Emergency clearance code was already consumed on {$clearance->used_at->toIso8601String()}."
            );
        }

        // 5. Expiry guard
        if (Carbon::now()->isAfter($clearance->expires_at)) {
            throw new ClearanceValidationException(
                'CLEARANCE_EXPIRED',
                "Emergency clearance code expired on {$clearance->expires_at->toIso8601String()}."
            );
        }

        // 6. Institutional Event binding guard
        if ((int) $clearance->institutional_event_id !== (int) $eventId) {
            throw new ClearanceValidationException(
                'CLEARANCE_EVENT_MISMATCH',
                "Emergency clearance is bound to institutional event #{$clearance->institutional_event_id}, not event #{$eventId}."
            );
        }

        // 7. Placement Drive binding guard
        if ($clearance->placement_drive_id !== null && $driveId !== null) {
            if ((int) $clearance->placement_drive_id !== (int) $driveId) {
                throw new ClearanceValidationException(
                    'CLEARANCE_DRIVE_MISMATCH',
                    "Emergency clearance is bound to placement drive #{$clearance->placement_drive_id}, not drive #{$driveId}."
                );
            }
        } elseif (!empty($clearance->target_drive_name) && !empty($driveName)) {
            if (trim(strtolower($clearance->target_drive_name)) !== trim(strtolower($driveName))) {
                throw new ClearanceValidationException(
                    'CLEARANCE_DRIVE_MISMATCH',
                    "Emergency clearance is bound to drive name '{$clearance->target_drive_name}', not '{$driveName}'."
                );
            }
        }

        // 8. Consume the clearance
        $clearance->update([
            'used_at' => Carbon::now(),
            'used_by_user_id' => $requestingUser->id,
            'consumed_drive_id' => $driveId,
        ]);

        return $clearance;
    }
}
