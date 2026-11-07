<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('drive_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drive_id')->constrained('placement_drives')->cascadeOnDelete();
            $table->integer('round_number');
            $table->string('name');
            $table->string('round_type')->default('INTERVIEW'); // ASSESSMENT, INTERVIEW, GD, CODING, HR
            $table->timestamp('start_time')->nullable()->index();
            $table->timestamp('end_time')->nullable()->index();
            $table->string('venue')->nullable()->index();
            $table->foreignId('venue_id')->nullable()->constrained('venues')->nullOnDelete();
            $table->integer('capacity')->nullable();
            $table->text('instructions')->nullable();
            $table->string('status')->default('PENDING'); // PENDING, ONGOING, COMPLETED, CANCELLED
            $table->timestamps();

            $table->unique(['drive_id', 'round_number'], 'uq_drive_round_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drive_rounds');
    }
};
