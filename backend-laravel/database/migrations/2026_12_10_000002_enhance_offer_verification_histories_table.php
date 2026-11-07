<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('offer_verification_histories', function (Blueprint $table) {
            // 1. Rename actor_id to actor_user_id if present
            if (Schema::hasColumn('offer_verification_histories', 'actor_id') && !Schema::hasColumn('offer_verification_histories', 'actor_user_id')) {
                $table->renameColumn('actor_id', 'actor_user_id');
            }
        });

        Schema::table('offer_verification_histories', function (Blueprint $table) {
            // 2. Add immutable actor snapshot columns
            if (!Schema::hasColumn('offer_verification_histories', 'actor_name')) {
                $table->string('actor_name', 255)->nullable()->after('actor_user_id');
            }
            if (!Schema::hasColumn('offer_verification_histories', 'actor_email')) {
                $table->string('actor_email', 255)->nullable()->after('actor_name');
            }

            // 3. Add formal verification approver (populated only on formal verification approval)
            if (!Schema::hasColumn('offer_verification_histories', 'verified_by_user_id')) {
                $table->foreignId('verified_by_user_id')->nullable()->after('actor_email')->constrained('users')->restrictOnDelete();
            }

            // 4. Add reviewed document reference with ON DELETE RESTRICT
            if (!Schema::hasColumn('offer_verification_histories', 'reviewed_document_id')) {
                $table->foreignId('reviewed_document_id')->nullable()->after('verified_by_user_id')->constrained('offer_documents')->restrictOnDelete();
            }
            if (!Schema::hasColumn('offer_verification_histories', 'reviewed_document_type')) {
                $table->string('reviewed_document_type', 100)->nullable()->after('reviewed_document_id');
            }
            if (!Schema::hasColumn('offer_verification_histories', 'reviewed_document_version')) {
                $table->unsignedInteger('reviewed_document_version')->nullable()->after('reviewed_document_type');
            }
        });

        // 5. Backfill existing rows with actor snapshots from users table
        $histories = DB::table('offer_verification_histories')->whereNull('actor_email')->get();
        foreach ($histories as $h) {
            $actorId = $h->actor_user_id ?? $h->actor_id ?? null;
            if ($actorId) {
                $user = DB::table('users')->where('id', $actorId)->first();
                if ($user) {
                    DB::table('offer_verification_histories')->where('id', $h->id)->update([
                        'actor_email' => $user->email,
                        'actor_name' => $user->name ?? explode('@', $user->email)[0],
                    ]);
                }
            }
        }

        // 6. Migrate document_version_reviewed if column exists
        if (Schema::hasColumn('offer_verification_histories', 'document_version_reviewed')) {
            DB::statement('UPDATE offer_verification_histories SET reviewed_document_version = document_version_reviewed WHERE reviewed_document_version IS NULL AND document_version_reviewed IS NOT NULL');
            Schema::table('offer_verification_histories', function (Blueprint $table) {
                $table->dropColumn('document_version_reviewed');
            });
        }

        // 7. Enforce NOT NULL on actor_user_id if no null values exist
        $nullActors = DB::table('offer_verification_histories')->whereNull('actor_user_id')->count();
        if ($nullActors === 0) {
            Schema::table('offer_verification_histories', function (Blueprint $table) {
                $table->unsignedBigInteger('actor_user_id')->nullable(false)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('offer_verification_histories', function (Blueprint $table) {
            $table->unsignedInteger('document_version_reviewed')->nullable();
        });

        DB::statement('UPDATE offer_verification_histories SET document_version_reviewed = reviewed_document_version WHERE reviewed_document_version IS NOT NULL');

        Schema::table('offer_verification_histories', function (Blueprint $table) {
            $table->dropForeign(['reviewed_document_id']);
            $table->dropForeign(['verified_by_user_id']);
            $table->dropColumn([
                'reviewed_document_version',
                'reviewed_document_type',
                'reviewed_document_id',
                'verified_by_user_id',
                'actor_email',
                'actor_name',
            ]);
            if (Schema::hasColumn('offer_verification_histories', 'actor_user_id') && !Schema::hasColumn('offer_verification_histories', 'actor_id')) {
                $table->renameColumn('actor_user_id', 'actor_id');
            }
        });
    }
};
