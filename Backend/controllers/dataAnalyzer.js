const isNumeric = (val) => val !== null && val !== undefined && val !== '' && !isNaN(Number(val));

const toNum = (val) => Number(val);

const stddev = (values, mean) => {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
};

const median = (sorted) => {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const detectOutliers = (values) => {
    if (values.length < 4) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2)));
    const q3 = median(sorted.slice(Math.ceil(sorted.length / 2)));
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return values.filter(v => v < lower || v > upper);
};

const topValues = (arr, n = 5) => {
    const counts = {};
    arr.forEach(v => { if (v !== null && v !== undefined && v !== '') counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, count]) => ({ value, count }));
};

const analyzeData = (data) => {
    if (!data || data.length === 0) {
        return { totalRows: 0, totalColumns: 0, columnStats: {}, numericStats: {}, duplicates: 0, outliers: {} };
    }

    const totalRows = data.length;
    const columns = Object.keys(data[0]);
    const totalColumns = columns.length;

    const columnStats = {};
    const numericStats = {};
    const outlierReport = {};

    columns.forEach(col => {
        const allValues = data.map(row => row[col]);
        const missingCount = allValues.filter(v => v === null || v === undefined || v === '').length;
        const nonMissing = allValues.filter(v => v !== null && v !== undefined && v !== '');
        const numericVals = nonMissing.filter(isNumeric).map(toNum);
        const isNumericCol = numericVals.length > nonMissing.length * 0.8;

        columnStats[col] = {
            type: isNumericCol ? 'numeric' : 'categorical',
            nullCount: missingCount,
            uniqueCount: new Set(nonMissing.map(String)).size,
        };

        if (isNumericCol && numericVals.length > 0) {
            const sorted = [...numericVals].sort((a, b) => a - b);
            const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
            numericStats[col] = {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: parseFloat(mean.toFixed(2)),
                median: parseFloat(median(sorted).toFixed(2)),
                stddev: parseFloat(stddev(numericVals, mean).toFixed(2))
            };
            const outliers = detectOutliers(numericVals);
            if (outliers.length > 0) outlierReport[col] = outliers;
        } else {
            columnStats[col].topValues = topValues(nonMissing);
        }
    });

    const seen = new Set();
    let duplicates = 0;
    const duplicateRows = [];
    data.forEach((row, idx) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
            duplicates++;
            duplicateRows.push(idx + 1);
        } else {
            seen.add(key);
        }
    });

    const missingByColumn = Object.entries(columnStats)
        .filter(([, s]) => s.nullCount > 0)
        .map(([col, s]) => ({ column: col, missing: s.nullCount }));

    return {
        totalRows,
        totalColumns,
        columnStats,
        numericStats,
        duplicates,
        duplicateRows,
        missingByColumn,
        outliers: outlierReport
    };
};

module.exports = { analyzeData };
