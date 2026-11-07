<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('emergency_clearances', function (Blueprint $table) {
            $table->id();
            $table->string('clearance_token_hash', 64)->unique();
            $table->foreignId('institutional_event_id')->constrained('institutional_events')->cascadeOnDelete();
            $table->foreignId('placement_drive_id')->nullable()->constrained('placement_drives')->cascadeOnDelete();
            $table->string('target_drive_name')->nullable();
            $table->foreignId('approved_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('approving_authority_name');
            $table->string('approving_authority_role');
            $table->text('reason');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('consumed_drive_id')->nullable()->constrained('placement_drives')->nullOnDelete();
            $table->timestamps();

            $table->index('expires_at');
            $table->index('used_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_clearances');
    }
};
