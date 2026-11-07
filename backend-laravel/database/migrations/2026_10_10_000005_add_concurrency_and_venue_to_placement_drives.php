<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('placement_drives', function (Blueprint $table) {
            $table->unsignedInteger('lock_version')->default(1)->after('status');
            $table->foreignId('venue_id')->nullable()->after('lock_version')->constrained('venues')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('placement_drives', function (Blueprint $table) {
            $table->dropForeign(['venue_id']);
            $table->dropColumn(['lock_version', 'venue_id']);
        });
    }
};
