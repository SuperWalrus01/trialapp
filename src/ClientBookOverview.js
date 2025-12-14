import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './ClientBookOverview.css';

function ClientBookOverview({ allClients }) {
  // Filter out completed clients for metrics
  const activeClients = allClients.filter(c => !c.completed);

  // Calculate aggregated metrics
  const totalAUM = activeClients.reduce((sum, client) => {
    return sum + (parseFloat(client['Total Portfolio AUA']) || 0);
  }, 0);

  const highPriorityCount = activeClients.filter(c => c.priority.tier === 'High').length;
  const mediumPriorityCount = activeClients.filter(c => c.priority.tier === 'Medium').length;
  const lowPriorityCount = activeClients.filter(c => c.priority.tier === 'Low').length;

  // Prepare scatter plot data
  const scatterData = activeClients.map(client => ({
    name: client.name || client.ClientID,
    aua: parseFloat(client['Total Portfolio AUA']) || 0,
    logins: parseInt(client['LoginsL12M']) || 0,
    tier: client.priority.tier,
    client: client
  }));

  // Color mapping for priority tiers
  const getColor = (tier) => {
    switch (tier) {
      case 'High': return '#10b981'; // Bright green
      case 'Medium': return '#f97316'; // Bright orange
      case 'Low': return '#ef4444'; // Bright red
      default: return '#6b7280';
    }
  };

  const formatCurrency = (value) => {
    return `£${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-name"><strong>{data.name}</strong></p>
          <p>AUA: {formatCurrency(data.aua)}</p>
          <p>Logins (12M): {data.logins}</p>
          <p>Priority: <span style={{ color: getColor(data.tier) }}>{data.tier}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="overview-container">
      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card total-aum">
          <div className="metric-content">
            <h3>Total AUM</h3>
            <p className="metric-value">{formatCurrency(totalAUM)}</p>
            <span className="metric-subtitle">{activeClients.length} active clients</span>
          </div>
        </div>

        <div className="metric-card high-priority">
          <div className="metric-content">
            <h3>High Priority Clients</h3>
            <p className="metric-value">{highPriorityCount}</p>
            <span className="metric-subtitle">Score 75+</span>
          </div>
        </div>

        <div className="metric-card medium-priority">
          <div className="metric-content">
            <h3>Medium Priority Clients</h3>
            <p className="metric-value">{mediumPriorityCount}</p>
            <span className="metric-subtitle">Score 60-74</span>
          </div>
        </div>

        <div className="metric-card low-priority">
          <div className="metric-content">
            <h3>Low Priority Clients</h3>
            <p className="metric-value">{lowPriorityCount}</p>
            <span className="metric-subtitle">Score below 60</span>
          </div>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="chart-section">
        <h2>Client Engagement vs AUA</h2>
        <p className="chart-description">
          Visualizing client portfolio size against their engagement level over the last 12 months
        </p>
        
        <div className="scatter-chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="aua" 
                name="Total AUA"
                label={{ value: 'Total AUA (£)', position: 'bottom', offset: 40 }}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="number" 
                dataKey="logins" 
                name="Logins"
                label={{ value: 'Logins (Last 12 Months)', angle: -90, position: 'insideLeft', offset: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => `${value} Priority`}
              />
              
              {/* Scatter by priority tier */}
              <Scatter 
                name="High" 
                data={scatterData.filter(d => d.tier === 'High')} 
                fill="#10b981"
                shape="circle"
              />
              <Scatter 
                name="Medium" 
                data={scatterData.filter(d => d.tier === 'Medium')} 
                fill="#f97316"
                shape="circle"
              />
              <Scatter 
                name="Low" 
                data={scatterData.filter(d => d.tier === 'Low')} 
                fill="#ef4444"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ClientBookOverview;
