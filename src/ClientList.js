import React, { useState } from 'react';
import { calculateStatistics } from './prioritisation';
import ClientDetailModal from './ClientDetailModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './ClientList.css';

function ClientList({ allClients, onToggleComplete, onRefresh }) {
  const [tableData, setTableData] = useState([]);
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);

  // Update displayed data when page or limit changes
  React.useEffect(() => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const pageData = allClients.slice(startIndex, endIndex);
    setTableData(pageData);
  }, [limit, currentPage, allClients]);

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalCount = allClients.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalCount);

  return (
    <>
      {/* Statistics Section */}
      {allClients.length > 0 && (
        <div className="statistics-section">
          <h2>Client Priority Distribution</h2>
          <div className="stats-content">
            <div className="stats-summary">
              <div className="stat-box">
                <span className="stat-label">Total Clients</span>
                <span className="stat-value">{calculateStatistics(allClients).totalClients}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Average Score</span>
                <span className="stat-value">{calculateStatistics(allClients).averageScore}</span>
              </div>
              <div className="stat-box high-tier">
                <span className="stat-label">High Priority</span>
                <span className="stat-value">{calculateStatistics(allClients).tierDistribution[0].count}</span>
              </div>
              <div className="stat-box medium-tier">
                <span className="stat-label">Medium Priority</span>
                <span className="stat-value">{calculateStatistics(allClients).tierDistribution[1].count}</span>
              </div>
              <div className="stat-box low-tier">
                <span className="stat-label">Low Priority</span>
                <span className="stat-value">{calculateStatistics(allClients).tierDistribution[2].count}</span>
              </div>
            </div>
            
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={calculateStatistics(allClients).tierDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Clients">
                    {calculateStatistics(allClients).tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="table-section">
        <div className="table-header">
          <h2>Top Clients</h2>
          <div className="table-controls">
            <div className="limit-selector">
              <label htmlFor="limit">Show: </label>
              <select 
                id="limit" 
                value={limit} 
                onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                className="limit-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={999999}>All</option>
              </select>
              <span> clients</span>
            </div>
            <button className="refresh-button" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </div>

        {tableData.length === 0 && (
          <div className="empty-message">
            <p>No clients found.</p>
          </div>
        )}

        {tableData.length > 0 && (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Priority</th>
                    <th>Score</th>
                    <th>ClientID</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Total Portfolio AUA</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => {
                    const globalRank = (currentPage - 1) * limit + index + 1;
                    
                    return (
                      <tr key={row.ClientID || index} className={row.completed ? 'completed-row' : ''}>
                        <td>
                          <span className="rank-badge">#{globalRank}</span>
                        </td>
                        <td>
                          <span className={`priority-badge priority-${row.priority.tier.toLowerCase()}`}>
                            {row.priority.tier}
                          </span>
                        </td>
                        <td>
                          <span className="priority-score-cell">{row.priority.score}</span>
                        </td>
                        <td>{row.ClientID || 'N/A'}</td>
                        <td>{row.Age || 'N/A'}</td>
                        <td>{row.Gender || 'N/A'}</td>
                        <td>{formatCurrency(row['Total Portfolio AUA'])}</td>
                        <td>{row.Category || 'N/A'}</td>
                        <td>
                          {row.completed ? (
                            <span className="status-badge completed">Completed</span>
                          ) : (
                            <span className="status-badge active">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="view-details-button"
                              onClick={() => handleClientClick(row)}
                            >
                              View Details
                            </button>
                            <button 
                              className={`complete-button ${row.completed ? 'undo' : ''}`}
                              onClick={() => onToggleComplete(row.ClientID)}
                              title={row.completed ? 'Mark as Active' : 'Mark as Completed'}
                            >
                              {row.completed ? 'Undo' : 'Complete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                
                <div className="pagination-info">
                  Page {currentPage} of {totalPages} (Showing ranks {startRecord}-{endRecord})
                </div>
                
                <button 
                  className="pagination-btn" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient}
          priority={selectedClient.priority}
          allClients={allClients}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </>
  );
}

export default ClientList;
