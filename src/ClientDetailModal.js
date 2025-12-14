import React, { useState } from 'react';
import { getPriorityExplanation, calculateMetricRankings } from './prioritisation';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './ClientDetailModal.css';

function ClientDetailModal({ client, priority, allClients, onClose }) {
  const [emailContext, setEmailContext] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Calculate rankings for this client
  const rankings = calculateMetricRankings(client, allClients);
  const explanation = getPriorityExplanation(client, priority, rankings);

  // Prepare pie chart data - showing score contribution breakdown
  const pieData = [
    { name: 'AUA Contribution', value: priority.breakdown.auaScore, color: '#7c3aed' },
    { name: 'Fees Contribution', value: priority.breakdown.feesScore, color: '#a78bfa' },
    { name: 'Engagement Contribution', value: priority.breakdown.engagementScore, color: '#c4b5fd' }
  ];

  const handleGenerateEmail = async () => {
    setGenerating(true);
    setError(null);
    setGeneratedEmail('');

    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: {
            name: client.name || 'Client',
            email: client.email,
            total_aua: client['Total Portfolio AUA'],
            total_fees: client['TotalFees'],
            logins_last_12_months: client['LoginsL12M'],
            meetings_last_12_months: client['MeetingsL12M'],
            number_of_accounts: client.number_of_accounts,
          },
          priority: {
            score: priority.score,
            tier: priority.tier,
          },
          adviserContext: emailContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate email');
      }

      const data = await response.json();
      setGeneratedEmail(data.email);
    } catch (err) {
      console.error('Error generating email:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p><strong>{payload[0].name}</strong></p>
          <p>{payload[0].value.toFixed(1)} points</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Client Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Personal Information */}
          <section className="detail-section">
            <h3>Personal Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{client.name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{client.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{client.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Client ID:</span>
                <span className="detail-value">{client.ClientID || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Portfolio Information */}
          <section className="detail-section">
            <h3>Portfolio Overview</h3>
            <div className="portfolio-layout">
              <div className="portfolio-metrics">
                <div className="detail-item highlight">
                  <span className="detail-label">Total AUA:</span>
                  <span className="detail-value">{formatCurrency(client['Total Portfolio AUA'])}</span>
                </div>
                <div className="detail-item highlight">
                  <span className="detail-label">Total Fees Paid:</span>
                  <span className="detail-value">{formatCurrency(client['TotalFees'])}</span>
                </div>
              </div>
              
              {/* Priority Score Breakdown Pie Chart */}
              <div className="portfolio-chart">
                <h4>Priority Score Breakdown</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      align="left"
                      height={36}
                      formatter={(value, entry) => `${value} (${entry.payload.value.toFixed(1)} pts)`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Engagement Metrics */}
          <section className="detail-section">
            <h3>Engagement (Last 12 Months)</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Logins:</span>
                <span className="detail-value">{client['LoginsL12M'] || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Meetings:</span>
                <span className="detail-value">{client['MeetingsL12M'] || 0}</span>
              </div>
            </div>
          </section>

          {/* Priority Score */}
          <section className="detail-section">
            <h3>Priority Score</h3>
            <div className="priority-summary">
              <div className="priority-badge-large" data-tier={priority.tier.toLowerCase()}>
                {priority.tier}
              </div>
              <div className="priority-score-large">{priority.score}/100</div>
            </div>
            <p className="priority-explanation">{explanation.summary}</p>
            
            <div className="priority-breakdown">
              {explanation.factors.map((factor, idx) => (
                <div key={idx} className="factor-item">
                  <div className="factor-header">
                    <span className="factor-label">{factor.label}</span>
                    <span className="factor-score">
                      {factor.contribution.toFixed(1)}/{factor.maxPoints}
                    </span>
                  </div>
                  <div className="factor-value">{factor.value}</div>
                  <div className="factor-bar">
                    <div 
                      className="factor-bar-fill" 
                      style={{ width: `${(factor.contribution / factor.maxPoints) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Email Generation */}
          <section className="detail-section email-section">
            <h3>Generate Outreach Email</h3>
            <div className="email-generator">
              <label htmlFor="email-context">Adviser Context (optional):</label>
              <textarea
                id="email-context"
                className="email-context-input"
                placeholder="Add any specific context for this outreach (e.g., 'Following up on Q4 portfolio review', 'Introducing new investment opportunity', etc.)"
                value={emailContext}
                onChange={(e) => setEmailContext(e.target.value)}
                rows={3}
              />
              
              <button 
                className="generate-email-button"
                onClick={handleGenerateEmail}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Email'}
              </button>

              {error && (
                <div className="email-error">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {generatedEmail && (
                <div className="generated-email">
                  <h4>Generated Email:</h4>
                  <div className="email-content">
                    {generatedEmail}
                  </div>
                  <button 
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedEmail);
                      alert('Email copied to clipboard!');
                    }}
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ClientDetailModal;
