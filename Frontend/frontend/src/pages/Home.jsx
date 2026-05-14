import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { Upload, FileText, BarChart3, ShieldCheck } from 'lucide-react';

const Home = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('File analyzed successfully!');
      navigate(`/report/${res.data.reportId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '3.5rem', fontWeight: 'bold' }}>
          AI Data Reporter
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '1rem' }}>
          Turn your raw spreadsheets into professional AI-powered reports in seconds.
        </p>
      </header>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div 
          {...getRootProps()} 
          style={{
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '1rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            transition: 'all 0.3s ease'
          }}
        >
          <input {...getInputProps()} />
          <div style={{ marginBottom: '1.5rem' }}>
            <Upload size={48} color={isDragActive ? 'var(--primary)' : 'var(--text-muted)'} />
          </div>
          {loading ? (
            <div>
              <h3>Analyzing Data with AI...</h3>
              <p>This may take a few seconds</p>
            </div>
          ) : (
            <div>
              <h3>{isDragActive ? 'Drop it here!' : 'Drag & drop your file here'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>or click to browse (CSV, XLSX, XLS)</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
        <FeatureCard 
          icon={<FileText size={32} />} 
          title="Smart Parsing" 
          desc="Automatic column profiling and statistics for your data."
        />
        <FeatureCard 
          icon={<BarChart3 size={32} />} 
          title="AI Insights" 
          desc="LLaMA 3 writes human-readable summaries and recommendations."
        />
        <FeatureCard 
          icon={<ShieldCheck size={32} />} 
          title="Private & Local" 
          desc="Data is processed locally using self-hosted AI models."
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
    <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <h4 style={{ marginBottom: '0.5rem' }}>{title}</h4>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{desc}</p>
  </div>
);

export default Home;
