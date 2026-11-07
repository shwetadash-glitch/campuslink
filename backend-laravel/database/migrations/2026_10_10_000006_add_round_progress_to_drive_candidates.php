<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('drive_candidates', function (Blueprint $table) {
            $table->unsignedInteger('current_round_number')->nullable()->after('status');
            $table->json('round_results')->nullable()->after('current_round_number');
        });
    }

    public function down(): void
    {
        Schema::table('drive_candidates', function (Blueprint $table) {
            $table->dropColumn(['current_round_number', 'round_results']);
        });
    }
};
