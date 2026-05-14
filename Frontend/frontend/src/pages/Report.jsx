import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Download, ArrowLeft, AlertCircle, Lightbulb, FileText, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Report = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/report/${id}`);
        setReport(res.data);
      } catch (error) {
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handleDownloadPDF = () => {
    window.open(`http://localhost:5000/api/report/${id}/download`, '_blank');
  };

  const handleDownloadOriginal = () => {
    window.open(`http://localhost:5000/api/report/${id}/download-original`, '_blank');
  };

  if (loading) return <div className="container"><h2>Loading report...</h2></div>;
  if (!report) return <div className="container"><h2>Report not found</h2></div>;

  const chartData = Object.entries(report.analysisStats.columnStats).map(([name, stats]) => ({
    name,
    nulls: stats.nullCount
  }));

  const hasNulls = chartData.some(d => d.nulls > 0);

  return (
    <div className="container">
      <Link to="/" className="btn" style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={20} /> Back to Upload
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2.5rem' }}>Analysis Report</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={handleDownloadOriginal} style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <FileDown size={20} /> Download {report.filename.split('.').pop().toUpperCase()}
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={20} /> Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={24} /> Executive Summary</h3>
          <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{report.reportData.summary}</p>
        </div>

        <div className="glass-card">
          <h3>Data Overview</h3>
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <StatItem label="Total Rows" value={report.analysisStats.totalRows} />
            <StatItem label="Total Columns" value={report.analysisStats.totalColumns} />
            <StatItem label="Duplicates" value={report.analysisStats.duplicates} />
            <StatItem label="File Name" value={report.filename} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={24} /> Anomalies Found</h3>
          <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
            {report.reportData.anomalies.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="glass-card">
          <h3 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={24} /> Recommendations</h3>
          <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
            {report.reportData.recommendations.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-card" style={{ height: '420px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Missing Values by Column</h3>
        {!hasNulls ? (
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No missing values found in any column.</p>
        ) : (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                angle={-40}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: 'var(--primary)' }}
                formatter={(value) => [value, 'Missing values']}
              />
              <Bar dataKey="nulls" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.nulls > 0 ? '#ef4444' : 'rgba(99,102,241,0.3)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const StatItem = ({ label, value }) => (
  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{value}</p>
  </div>
);

export default Report;
