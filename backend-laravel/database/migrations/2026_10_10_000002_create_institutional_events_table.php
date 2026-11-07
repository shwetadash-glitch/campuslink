<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('institutional_events', function (Blueprint $table) {
            $table->id();
            $table->string('title')->index();
            $table->string('event_type')->index(); // EXAMINATION, SYMPOSIUM, HOLIDAY, INSTITUTIONAL_BLACKOUT
            $table->timestamp('start_time')->index();
            $table->timestamp('end_time')->index();
            $table->json('affects_branches')->nullable(); // e.g. ["CS", "IT"] or ["ALL"]
            $table->boolean('is_hard_blackout')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('institutional_events');
    }
};
