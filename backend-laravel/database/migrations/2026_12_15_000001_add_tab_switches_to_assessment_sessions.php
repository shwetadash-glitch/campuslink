<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment_sessions', function (Blueprint $table) {
            $table->integer('tab_switches')->default(0)->after('proctoring_flags_count');
            $table->boolean('is_disqualified')->default(false)->after('tab_switches');
            $table->string('disqualification_reason')->nullable()->after('is_disqualified');
        });
    }

    public function down(): void
    {
        Schema::table('assessment_sessions', function (Blueprint $table) {
            $table->dropColumn(['tab_switches', 'is_disqualified', 'disqualification_reason']);
        });
    }
};
