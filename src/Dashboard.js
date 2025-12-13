import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import { calculatePriority, calculateStatistics } from './prioritisation';
import ClientDetailModal from './ClientDetailModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './Dashboard.css';

function Dashboard({ user }) {
  const [tableData, setTableData] = useState([]);
  const [allClients, setAllClients] = useState([]); // Store all clients globally ranked
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);

  // Replace 'your_table_name' with your actual table name
  const TABLE_NAME = 'client';

  useEffect(() => {
    checkConnection();
    fetchAllClientsAndRank();
  }, []); // Only fetch once on mount

  useEffect(() => {
    // Update displayed data when page or limit changes
    updateDisplayedData();
  }, [limit, currentPage, allClients]);

  const checkConnection = async () => {
    const isConnected = await testConnection();
    setConnectionStatus(isConnected);
  };

  const fetchAllClientsAndRank = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ALL clients from table: ${TABLE_NAME}`);
      
      // Fetch ALL clients from the database (no pagination)
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} total clients`);
      
      // Calculate priority for each client and sort by score descending (global ranking)
      const dataWithPriority = (data || []).map(client => ({
        ...client,
        priority: calculatePriority(client)
      })).sort((a, b) => b.priority.score - a.priority.score);
      
      setAllClients(dataWithPriority);
    } catch (err) {
      console.error('Error fetching data:', err);
      
      // Provide more specific error messages
      if (err.code === 'PGRST116') {
        setError(`Table "${TABLE_NAME}" not found. Please check if the table exists in your Supabase database.`);
      } else if (err.code === '42501') {
        setError(`Permission denied. Please check your Row Level Security (RLS) policies for the "${TABLE_NAME}" table.`);
      } else if (err.message.includes('relation') && err.message.includes('does not exist')) {
        setError(`Table "${TABLE_NAME}" does not exist. Please create the table in your Supabase database first.`);
      } else {
        setError(`${err.message} (Error code: ${err.code || 'Unknown'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayedData = () => {
    // Calculate offset for pagination on the globally ranked clients
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    
    // Slice the globally ranked array to show only the current page
    const pageData = allClients.slice(startIndex, endIndex);
    setTableData(pageData);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const totalCount = allClients.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalCount);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <div className="logo-placeholder">LOGO</div>
          <h1>Dashboard</h1>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome!</h2>
          <p>Email: {user?.email}</p>
          <p>User ID: {user?.id}</p>
          <p>Connection Status: {connectionStatus === null ? 'Testing...' : connectionStatus ? '✅ Connected' : '❌ Failed'}</p>
        </div>

        {/* Statistics Section */}
        {!loading && !error && allClients.length > 0 && (
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

        {/* Table Data Section */}
        <div className="table-section">
          <div className="table-header">
            <h2>Top Clients (Ranked Globally by Priority)</h2>
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
              <button className="refresh-button" onClick={fetchAllClientsAndRank}>
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="loading-message">Loading data...</p>}
          
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
              <div className="error-hints">
                <p><strong>Common solutions:</strong></p>
                <ul>
                  <li>Make sure the table "{TABLE_NAME}" exists in your Supabase database</li>
                  <li>Check that Row Level Security (RLS) policies allow your user to read from this table</li>
                  <li>Verify your Supabase URL and API key are correct</li>
                  <li>Ensure you're using the correct table name (case-sensitive)</li>
                </ul>
              </div>
            </div>
          )}

          {!loading && !error && tableData.length === 0 && (
            <div className="empty-message">
              <p>No data found in the "{TABLE_NAME}" table.</p>
              <p>This could mean:</p>
              <ul>
                <li>The table exists but is empty</li>
                <li>You don't have permission to view the data</li>
                <li>Row Level Security policies are blocking access</li>
              </ul>
            </div>
          )}

          {!loading && !error && tableData.length > 0 && (
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => {
                      const formatCurrency = (value) => {
                        const num = parseFloat(value) || 0;
                        return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      };
                      
                      const globalRank = (currentPage - 1) * limit + index + 1;
                      
                      return (
                        <tr key={row.id || index}>
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
                            <button 
                              className="view-details-button"
                              onClick={() => handleClientClick(row)}
                            >
                              View Details
                            </button>
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
    </div>
  );
}

export default Dashboard;
