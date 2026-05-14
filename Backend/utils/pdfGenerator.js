const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const COLORS = {
    primary: '#1e40af',
    accent: '#6366f1',
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    headerBg: '#0f172a',
    sectionBg: '#f1f5f9',
    tableBorder: '#cbd5e1',
    tableHeader: '#334155',
    textDark: '#0f172a',
    textMuted: '#64748b',
    white: '#ffffff'
};

const drawRect = (doc, x, y, w, h, color) => {
    doc.save().rect(x, y, w, h).fill(color).restore();
};

const sectionTitle = (doc, title, color = COLORS.primary) => {
    doc.moveDown(0.5);
    const y = doc.y;
    drawRect(doc, 50, y, 495, 24, color);
    doc.fillColor(COLORS.white).fontSize(11).font('Helvetica-Bold')
        .text(title.toUpperCase(), 58, y + 6, { width: 479 });
    doc.fillColor(COLORS.textDark).font('Helvetica');
    doc.moveDown(1.6);
};

const bulletItem = (doc, text, indent = 58) => {
    const y = doc.y;
    doc.fillColor(COLORS.accent).fontSize(10).text('>>', indent, y, { continued: false, width: 16 });
    doc.fillColor(COLORS.textDark).fontSize(10).text(text, indent + 18, y, { width: 465 - indent });
    doc.moveDown(0.3);
};

const drawTableRow = (doc, cols, y, isHeader = false, shade = false) => {
    const startX = 50;
    const rowH = 18;
    if (isHeader) {
        drawRect(doc, startX, y, 495, rowH, COLORS.tableHeader);
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
    } else {
        if (shade) drawRect(doc, startX, y, 495, rowH, '#f8fafc');
        doc.fillColor(COLORS.textDark).font('Helvetica').fontSize(9);
    }
    let x = startX + 4;
    cols.forEach(({ text, width }) => {
        doc.text(String(text ?? '—'), x, y + 4, { width: width - 6, ellipsis: true, lineBreak: false });
        x += width;
    });
    doc.rect(startX, y, 495, rowH).strokeColor(COLORS.tableBorder).lineWidth(0.5).stroke();
    doc.font('Helvetica').fillColor(COLORS.textDark);
    return y + rowH;
};

const checkPageBreak = (doc, needed = 60) => {
    if (doc.y > doc.page.height - needed - 60) doc.addPage();
};

const generatePDF = (report, filename) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const pdfName = `report-${Date.now()}.pdf`;
        const pdfPath = path.join(__dirname, '../uploads', pdfName);
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const stats = report.analysisStats;
        const ai = report.reportData;
        const pageW = doc.page.width;

        // ── HEADER ──────────────────────────────────────────────────
        drawRect(doc, 0, 0, pageW, 90, COLORS.headerBg);
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22)
            .text('Data Analysis Report', 50, 22, { width: pageW - 100, align: 'center' });
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
            .text(`Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}   |   File: ${filename}`,
                50, 56, { width: pageW - 100, align: 'center' });
        doc.y = 110;

        // ── DATA OVERVIEW ────────────────────────────────────────────
        sectionTitle(doc, '1. Data Overview', COLORS.primary);
        const overviewY = doc.y;
        const boxW = 115, boxH = 52, gap = 8;
        const boxes = [
            { label: 'Total Rows', value: stats.totalRows },
            { label: 'Total Columns', value: stats.totalColumns },
            { label: 'Duplicate Rows', value: stats.duplicates, alert: stats.duplicates > 0 },
            { label: 'Missing Columns', value: stats.missingByColumn.length, alert: stats.missingByColumn.length > 0 },
        ];
        boxes.forEach((b, i) => {
            const bx = 50 + i * (boxW + gap);
            drawRect(doc, bx, overviewY, boxW, boxH, b.alert ? '#fef2f2' : COLORS.sectionBg);
            doc.rect(bx, overviewY, boxW, boxH).strokeColor(b.alert ? COLORS.danger : COLORS.tableBorder).lineWidth(0.5).stroke();
            doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(8).text(b.label, bx + 6, overviewY + 8, { width: boxW - 12 });
            doc.fillColor(b.alert ? COLORS.danger : COLORS.textDark).font('Helvetica-Bold').fontSize(20)
                .text(String(b.value), bx + 6, overviewY + 22, { width: boxW - 12 });
        });
        doc.y = overviewY + boxH + 16;

        // ── EXECUTIVE SUMMARY ────────────────────────────────────────
        sectionTitle(doc, '2. Executive Summary', COLORS.accent);
        doc.fillColor(COLORS.textDark).font('Helvetica').fontSize(10)
            .text(ai.summary, 58, doc.y, { width: 479, align: 'justify', lineGap: 3 });
        doc.moveDown(1);

        // ── COLUMN STATISTICS TABLE ──────────────────────────────────
        checkPageBreak(doc, 120);
        sectionTitle(doc, '3. Column Statistics', COLORS.primary);
        const colWidths = [110, 70, 55, 55, 55, 55, 55, 40];
        const headers = [
            { text: 'Column', width: colWidths[0] },
            { text: 'Type', width: colWidths[1] },
            { text: 'Missing', width: colWidths[2] },
            { text: 'Unique', width: colWidths[3] },
            { text: 'Min', width: colWidths[4] },
            { text: 'Max', width: colWidths[5] },
            { text: 'Mean', width: colWidths[6] },
            { text: 'Outlier', width: colWidths[7] },
        ];
        let ty = doc.y;
        ty = drawTableRow(doc, headers, ty, true);
        Object.entries(stats.columnStats).forEach(([col, s], idx) => {
            checkPageBreak(doc, 25);
            const ns = stats.numericStats?.[col];
            const hasOutlier = stats.outliers?.[col]?.length > 0;
            const row = [
                { text: col, width: colWidths[0] },
                { text: s.type, width: colWidths[1] },
                { text: s.nullCount > 0 ? `${s.nullCount} (!)` : '0', width: colWidths[2] },
                { text: s.uniqueCount, width: colWidths[3] },
                { text: ns ? ns.min : '—', width: colWidths[4] },
                { text: ns ? ns.max : '—', width: colWidths[5] },
                { text: ns ? ns.mean : '—', width: colWidths[6] },
                { text: hasOutlier ? 'Yes (!)' : 'No', width: colWidths[7] },
            ];
            ty = drawTableRow(doc, row, ty, false, idx % 2 === 0);
        });
        doc.y = ty + 12;

        // ── NUMERIC STATS TABLE ──────────────────────────────────────
        const numCols = Object.keys(stats.numericStats || {});
        if (numCols.length > 0) {
            checkPageBreak(doc, 80);
            sectionTitle(doc, '4. Numeric Column Details', COLORS.primary);
            const nw = [110, 75, 75, 75, 75, 85];
            const nHeaders = [
                { text: 'Column', width: nw[0] },
                { text: 'Min', width: nw[1] },
                { text: 'Max', width: nw[2] },
                { text: 'Mean', width: nw[3] },
                { text: 'Median', width: nw[4] },
                { text: 'Std Dev', width: nw[5] },
            ];
            let ny = doc.y;
            ny = drawTableRow(doc, nHeaders, ny, true);
            numCols.forEach((col, idx) => {
                checkPageBreak(doc, 25);
                const ns = stats.numericStats[col];
                const row = [
                    { text: col, width: nw[0] },
                    { text: ns.min, width: nw[1] },
                    { text: ns.max, width: nw[2] },
                    { text: ns.mean, width: nw[3] },
                    { text: ns.median, width: nw[4] },
                    { text: ns.stddev, width: nw[5] },
                ];
                ny = drawTableRow(doc, row, ny, false, idx % 2 === 0);
            });
            doc.y = ny + 12;
        }

        // ── ANOMALIES ────────────────────────────────────────────────
        checkPageBreak(doc, 80);
        sectionTitle(doc, '5. Anomalies & Data Quality Issues', COLORS.danger);
        if (ai.anomalies.length === 0) {
            doc.fillColor(COLORS.success).fontSize(10).text('✓ No anomalies detected.', 58, doc.y);
        } else {
            ai.anomalies.forEach(a => bulletItem(doc, a));
        }
        doc.moveDown(0.5);

        // ── RECOMMENDATIONS ──────────────────────────────────────────
        checkPageBreak(doc, 80);
        sectionTitle(doc, '6. Recommendations', COLORS.success);
        ai.recommendations.forEach((r, i) => {
            bulletItem(doc, `[${i + 1}] ${r}`);
        });

        // ── FOOTER ───────────────────────────────────────────────────
        const footerY = doc.page.height - 40;
        doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(8)
            .text(`AI File Reader & Report Generator  •  ${filename}  •  ${new Date().toLocaleDateString()}`,
                50, footerY, { width: pageW - 100, align: 'center' });

        doc.end();
        stream.on('finish', () => resolve(pdfPath));
        stream.on('error', reject);
    });
};

module.exports = { generatePDF };
