<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NeonPingCommand extends Command
{
    protected $signature = 'neon:ping {--count=10 : Number of latency ping iterations} {--probes= : Alias for count}';
    protected $description = 'Measure empirical round-trip database query latency to Neon PostgreSQL';

    public function handle(): int
    {
        $this->info("=== CampusLink Neon Database Latency Diagnostic ===");

        $connection = config('database.default');
        $host = config("database.connections.{$connection}.host");
        $database = config("database.connections.{$connection}.database");
        $port = config("database.connections.{$connection}.port");
        $sslmode = config("database.connections.{$connection}.sslmode");

        $this->line("Connection: <comment>{$connection}</comment>");
        $this->line("Target Host: <comment>{$host}:{$port}</comment>");
        $this->line("Database: <comment>{$database}</comment> (sslmode: {$sslmode})");
        $this->newLine();

        $count = (int) ($this->option('probes') ?: $this->option('count') ?: 10);
        $latencies = [];

        $this->info("Executing {$count} round-trip query probes (SELECT 1)...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        for ($i = 0; $i < $count; $i++) {
            $start = microtime(true);
            try {
                DB::select('SELECT 1 as ping');
                $elapsedMs = (microtime(true) - $start) * 1000;
                $latencies[] = $elapsedMs;
            } catch (\Exception $e) {
                $bar->finish();
                $this->newLine(2);
                $this->error("Connection Probe Failed: " . $e->getMessage());
                return Command::FAILURE;
            }
            $bar->advance();
            usleep(20000); // 20ms pause between probes
        }

        $bar->finish();
        $this->newLine(2);

        sort($latencies);
        $min = min($latencies);
        $max = max($latencies);
        $avg = array_sum($latencies) / count($latencies);
        $p50Index = (int) floor(count($latencies) * 0.50);
        $p95Index = (int) min(count($latencies) - 1, floor(count($latencies) * 0.95));
        $p99Index = (int) min(count($latencies) - 1, floor(count($latencies) * 0.99));
        $p50 = $latencies[$p50Index];
        $p95 = $latencies[$p95Index];
        $p99 = $latencies[$p99Index];

        $this->table(
            ['Metric', 'Measured Latency (ms)'],
            [
                ['Probes Sent', (string) $count],
                ['Minimum', sprintf('%.2f ms', $min)],
                ['Average', sprintf('%.2f ms', $avg)],
                ['P50 (Median)', sprintf('%.2f ms', $p50)],
                ['P95', sprintf('%.2f ms', $p95)],
                ['P99', sprintf('%.2f ms', $p99)],
                ['Maximum', sprintf('%.2f ms', $max)],
            ]
        );

        if ($avg < 50) {
            $this->info("Assessment: EXCELLENT latency (< 50ms). Close regional proximity.");
        } elseif ($avg < 150) {
            $this->info("Assessment: GOOD cross-region latency (~{$avg}ms). Connection pooler and eager-loading recommended.");
        } else {
            $this->warn("Assessment: HIGH cross-region latency (> 150ms). Ensure strict eager-loading to minimize N+1 queries.");
        }

        return Command::SUCCESS;
    }
}
