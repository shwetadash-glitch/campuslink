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
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('channel', 30)->default('IN_APP'); // IN_APP, EMAIL
            $table->string('notification_type', 50)->default('ALL'); // ALL, DRIVE_PUBLISHED, DEADLINE_REMINDER, SCHEDULE_UPDATE, STATUS_CHANGE, OFFER
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'channel', 'notification_type'], 'uq_user_channel_notif_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
