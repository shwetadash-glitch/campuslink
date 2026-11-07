<?php

namespace App\Services\Resume;

class PdfDocumentBuilder
{
    protected array $objects = [];
    protected array $pages = [];
    protected string $currentStream = '';
    protected float $pageWidth = 595.28;  // A4 Width
    protected float $pageHeight = 841.89; // A4 Height
    protected float $margin = 40.0;
    protected float $currentY = 801.89;
    protected string $fontFamily = 'Helvetica';

    public function __construct(string $fontFamily = 'Helvetica')
    {
        $this->fontFamily = in_array($fontFamily, ['Times', 'Helvetica', 'Courier']) ? $fontFamily : 'Helvetica';
        $this->startNewPage();
    }

    public function startNewPage(): void
    {
        if (!empty($this->currentStream)) {
            $this->pages[] = $this->currentStream;
            $this->currentStream = '';
        }
        $this->currentY = $this->pageHeight - $this->margin;
    }

    public function checkPageOverflow(float $heightNeeded): void
    {
        if ($this->currentY - $heightNeeded < $this->margin) {
            $this->startNewPage();
        }
    }

    public function drawLine(float $startX, float $startY, float $endX, float $endY, array $rgb = [0.8, 0.8, 0.8], float $width = 0.75): void
    {
        $r = number_format($rgb[0], 2, '.', '');
        $g = number_format($rgb[1], 2, '.', '');
        $b = number_format($rgb[2], 2, '.', '');
        $w = number_format($width, 2, '.', '');

        $this->currentStream .= "q {$w} w {$r} {$g} {$b} RG {$startX} {$startY} m {$endX} {$endY} l S Q\n";
    }

    public function addText(
        string $text,
        float $fontSize = 10.0,
        bool $isBold = false,
        array $rgb = [0.1, 0.1, 0.1],
        ?float $x = null,
        bool $advanceY = true
    ): void {
        $cleanText = $this->sanitizeText($text);
        if ($cleanText === '') return;

        $this->checkPageOverflow($fontSize + 4.0);

        $fontKey = $this->getFontKey($isBold);
        $xPos = $x !== null ? $x : $this->margin;
        $yPos = $this->currentY;

        $r = number_format($rgb[0], 2, '.', '');
        $g = number_format($rgb[1], 2, '.', '');
        $b = number_format($rgb[2], 2, '.', '');
        $sz = number_format($fontSize, 1, '.', '');

        $this->currentStream .= "BT /{$fontKey} {$sz} Tf {$r} {$g} {$b} rg {$xPos} {$yPos} Td ({$cleanText}) Tj ET\n";

        if ($advanceY) {
            $this->currentY -= ($fontSize + 4.0);
        }
    }

    public function addBulletPoint(string $text, float $fontSize = 9.0, array $rgb = [0.2, 0.2, 0.2]): void
    {
        $this->checkPageOverflow($fontSize + 4);
        $bulletX = $this->margin + 8;
        $textX = $this->margin + 18;

        // Draw bullet character
        $this->currentStream .= "BT /F2 {$fontSize} Tf 0.3 0.3 0.3 rg {$bulletX} {$this->currentY} Td (-) Tj ET\n";

        // Wrap text if needed
        $wrappedLines = $this->wordWrap($text, 85);
        foreach ($wrappedLines as $line) {
            $cleanLine = $this->sanitizeText($line);
            $sz = number_format($fontSize, 1, '.', '');
            $this->currentStream .= "BT /F2 {$sz} Tf 0.2 0.2 0.2 rg {$textX} {$this->currentY} Td ({$cleanLine}) Tj ET\n";
            $this->currentY -= ($fontSize + 3.0);
            $this->checkPageOverflow($fontSize + 4);
        }
    }

    public function addSectionHeading(string $title, array $accentColor = [0.15, 0.35, 0.65]): void
    {
        $this->checkPageOverflow(30);
        $this->currentY -= 6.0;

        // Section Title
        $this->addText(strtoupper($title), 11.0, true, $accentColor, $this->margin, true);

        // Divider rule
        $ruleY = $this->currentY + 2.0;
        $this->drawLine($this->margin, $ruleY, $this->pageWidth - $this->margin, $ruleY, [0.85, 0.85, 0.85], 0.75);
        $this->currentY -= 4.0;
    }

    public function getCurrentY(): float
    {
        return $this->currentY;
    }

    public function setCurrentY(float $y): void
    {
        $this->currentY = $y;
    }

    public function getMargin(): float
    {
        return $this->margin;
    }

    public function getPageWidth(): float
    {
        return $this->pageWidth;
    }

    /**
     * Compile everything into a 100% valid PDF 1.4 binary stream.
     */
    public function output(): string
    {
        // Flush last page
        if (!empty($this->currentStream) || empty($this->pages)) {
            $this->pages[] = $this->currentStream;
        }

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];

        // 1. Catalog
        $offsets[1] = strlen($pdf);
        $pdf .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        // 2. Font Objects (F1: Bold, F2: Regular)
        $boldFont = $this->fontFamily === 'Times' ? 'Times-Bold' : ($this->fontFamily === 'Courier' ? 'Courier-Bold' : 'Helvetica-Bold');
        $regFont = $this->fontFamily === 'Times' ? 'Times-Roman' : ($this->fontFamily === 'Courier' ? 'Courier' : 'Helvetica');

        // Font 1 (Bold)
        $offsets[3] = strlen($pdf);
        $pdf .= "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /{$boldFont} /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Font 2 (Regular)
        $offsets[4] = strlen($pdf);
        $pdf .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /{$regFont} /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Page objects setup
        $pageObjIds = [];
        $nextObjId = 5;

        // Pre-reserve object IDs for Pages and Content streams
        foreach ($this->pages as $idx => $streamData) {
            $pageObjIds[] = $nextObjId++; // Page obj ID
            $nextObjId++;                 // Stream obj ID
        }

        // Pages root object (Obj 2)
        $kidsStr = implode(' 0 R ', $pageObjIds) . ' 0 R';
        $pageCount = count($this->pages);
        $offsets[2] = strlen($pdf);
        $pdf .= "2 0 obj\n<< /Type /Pages /Kids [{$kidsStr}] /Count {$pageCount} >>\nendobj\n";

        // Build each Page and its Contents stream
        foreach ($this->pages as $idx => $streamData) {
            $pageId = $pageObjIds[$idx];
            $streamId = $pageId + 1;
            $streamLen = strlen($streamData);

            // Page Object
            $offsets[$pageId] = strlen($pdf);
            $pdf .= "{$pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents {$streamId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ProcSet [/PDF /Text] >> >>\nendobj\n";

            // Stream Object
            $offsets[$streamId] = strlen($pdf);
            $pdf .= "{$streamId} 0 obj\n<< /Length {$streamLen} >>\nstream\n{$streamData}\nendstream\nendobj\n";
        }

        // Cross-Reference Table
        $totalObjs = $nextObjId;
        $xrefStart = strlen($pdf);
        $pdf .= "xref\n0 {$totalObjs}\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i < $totalObjs; $i++) {
            $offset = $offsets[$i] ?? 0;
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        // Trailer
        $pdf .= "trailer\n<< /Size {$totalObjs} /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefStart}\n%%EOF\n";

        return $pdf;
    }

    protected function getFontKey(bool $isBold): string
    {
        return $isBold ? 'F1' : 'F2';
    }

    protected function sanitizeText(string $text): string
    {
        // 1. Normalize common Unicode quotes, dashes, bullets, and currency symbols
        $unicodeMap = [
            '“' => '"', '”' => '"', '‘' => "'", '’' => "'",
            '—' => ' - ', '–' => '-', '•' => '-', '…' => '...',
            '₹' => 'Rs.', '€' => 'EUR', '£' => 'GBP',
        ];
        $text = strtr($text, $unicodeMap);

        // 2. Transliterate UTF-8 characters to ISO-8859-1 (Latin-1) safely
        if (function_exists('iconv')) {
            $trans = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $text);
            if ($trans !== false) {
                $text = $trans;
            }
        }

        // 3. Strip control characters except basic printable characters
        $text = preg_replace('/[\x00-\x1F\x7F]/', '', $text);

        // 4. Escape PDF syntax characters (parentheses and backslashes)
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace('(', '\\(', $text);
        $text = str_replace(')', '\\)', $text);

        return trim($text);
    }

    protected function wordWrap(string $text, int $width = 85): array
    {
        $lines = explode("\n", wordwrap($text, $width, "\n", true));
        return array_filter(array_map('trim', $lines));
    }
}
