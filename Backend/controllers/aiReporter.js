const axios = require('axios');

const extractJSON = (text) => {
    const stripped = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in response');
    return JSON.parse(stripped.slice(start, end + 1));
};

const buildPrompt = (stats, filename) => {
    const colLines = Object.entries(stats.columnStats).map(([col, s]) => {
        if (s.type === 'numeric' && stats.numericStats[col]) {
            const ns = stats.numericStats[col];
            const outlierNote = stats.outliers[col] ? ` [OUTLIERS DETECTED: ${stats.outliers[col].join(', ')}]` : '';
            return `  - ${col} (numeric): min=${ns.min}, max=${ns.max}, mean=${ns.mean}, median=${ns.median}, stddev=${ns.stddev}, missing=${s.nullCount}${outlierNote}`;
        } else {
            const top = s.topValues ? s.topValues.map(t => `${t.value}(${t.count})`).join(', ') : '';
            return `  - ${col} (categorical): ${s.uniqueCount} unique values, missing=${s.nullCount}${top ? `, top values: ${top}` : ''}`;
        }
    }).join('\n');

    const missingNote = stats.missingByColumn.length > 0
        ? stats.missingByColumn.map(m => `${m.column}: ${m.missing} missing`).join(', ')
        : 'None';

    const outlierNote = Object.keys(stats.outliers).length > 0
        ? Object.entries(stats.outliers).map(([col, vals]) => `${col}: ${vals.join(', ')}`).join('; ')
        : 'None detected';

    return `You are a senior data analyst. Analyze this dataset and produce a professional, insightful report better than any human analyst would write.

DATASET: "${filename}"
DIMENSIONS: ${stats.totalRows} rows x ${stats.totalColumns} columns
DUPLICATE ROWS: ${stats.duplicates}${stats.duplicateRows.length > 0 ? ` (at row indices: ${stats.duplicateRows.join(', ')})` : ''}
MISSING VALUES: ${missingNote}
STATISTICAL OUTLIERS: ${outlierNote}

COLUMN DETAILS:
${colLines}

Your response MUST be a valid JSON object only — no markdown, no code blocks, no explanation outside the JSON.
Use this exact structure:
{
  "summary": "2-3 sentence executive summary written in plain English for business stakeholders. Mention dataset size, key findings, data quality issues, and one notable insight from the data.",
  "anomalies": [
    "Specific anomaly with exact column name, row count, or value — be precise and detailed",
    "..."
  ],
  "recommendations": [
    "Concrete, actionable recommendation a data engineer or analyst could act on immediately",
    "..."
  ]
}

Rules:
- summary: business-friendly, no technical jargon, no raw field names like nullCount or columnStats
- anomalies: list EVERY real issue found including missing values per column with exact counts, duplicates, outliers, suspicious values
- recommendations: 4-6 specific, prioritized, actionable steps — not generic advice
- Do NOT use the words nullCount, columnStats, numericStats, or any internal variable names in your response`;
};

const fallbackReport = (stats, filename) => ({
    summary: `The "${filename}" dataset contains ${stats.totalRows} rows and ${stats.totalColumns} columns. ` +
        `${stats.duplicates > 0 ? `${stats.duplicates} duplicate record(s) were identified and should be removed before analysis. ` : ''}` +
        `${stats.missingByColumn.length > 0 ? `Missing data was detected in: ${stats.missingByColumn.map(m => `${m.column} (${m.missing})`).join(', ')}. ` : ''}` +
        `AI-powered analysis unavailable — AI service could not be reached.`,
    anomalies: [
        stats.duplicates > 0 ? `${stats.duplicates} duplicate row(s) detected — exact duplicates inflate record counts` : 'No duplicate rows detected',
        ...stats.missingByColumn.map(m => `Column "${m.column}" has ${m.missing} missing value(s) (${((m.missing / stats.totalRows) * 100).toFixed(1)}% of rows)`),
        ...Object.entries(stats.outliers).map(([col, vals]) => `Column "${col}" contains statistical outliers: ${vals.join(', ')}`)
    ].filter(Boolean),
    recommendations: [
        stats.duplicates > 0 ? 'Deduplicate records — retain one copy and log removed rows for audit trail' : null,
        ...stats.missingByColumn.map(m => `Investigate and impute missing values in "${m.column}" — consider median imputation for numeric, mode for categorical`),
        Object.keys(stats.outliers).length > 0 ? `Review outlier values in: ${Object.keys(stats.outliers).join(', ')} — determine if they are data entry errors or valid extremes` : null,
        'Enforce data validation rules at the point of entry to prevent future quality issues',
        'Parse all date columns to a standardized format (ISO 8601) for time-series analysis'
    ].filter(Boolean)
});

const generateWithGroq = async (stats, filename) => {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: process.env.GROQ_MODEL || 'llama3-70b-8192',
        messages: [{ role: 'user', content: buildPrompt(stats, filename) }],
        temperature: 0.2,
        max_tokens: 1024
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 60000
    });

    return extractJSON(response.data.choices[0].message.content);
};

const generateWithOllama = async (stats, filename) => {
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: process.env.OLLAMA_MODEL || 'llama3',
        prompt: buildPrompt(stats, filename),
        stream: false,
        format: 'json',
        options: { temperature: 0.2, num_predict: 1024 }
    }, { timeout: 120000 });

    return extractJSON(response.data.response);
};

const generateAIReport = async (stats, filename) => {
    try {
        let parsed;

        if (process.env.GROQ_API_KEY) {
            parsed = await generateWithGroq(stats, filename);
        } else {
            parsed = await generateWithOllama(stats, filename);
        }

        if (!parsed.summary || !Array.isArray(parsed.anomalies) || !Array.isArray(parsed.recommendations)) {
            throw new Error('AI response missing required fields');
        }

        return parsed;
    } catch (error) {
        console.error('AI report generation failed:', error.message);
        return fallbackReport(stats, filename);
    }
};

module.exports = { generateAIReport };
