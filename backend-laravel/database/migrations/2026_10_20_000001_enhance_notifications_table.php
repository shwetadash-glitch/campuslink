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
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable()->unique()->after('status');
            $table->integer('retry_count')->default(0)->after('idempotency_key');
            $table->integer('max_retries')->default(3)->after('retry_count');
            $table->text('last_error')->nullable()->after('max_retries');
            $table->timestamp('delivered_at')->nullable()->after('sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn([
                'idempotency_key',
                'retry_count',
                'max_retries',
                'last_error',
                'delivered_at',
            ]);
        });
    }
};
