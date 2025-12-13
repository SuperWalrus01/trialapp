import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import './Dashboard.css';

function Dashboard({ user }) {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Replace 'your_table_name' with your actual table name
  const TABLE_NAME = 'client';

  useEffect(() => {
    checkConnection();
    fetchTableData();
  }, [limit, currentPage]);

  const checkConnection = async () => {
    const isConnected = await testConnection();
    setConnectionStatus(isConnected);
  };

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to fetch data from table: ${TABLE_NAME} with limit: ${limit}, page: ${currentPage}`);
      
      // Calculate offset for pagination
      const offset = (currentPage - 1) * limit;
      
      // Fetch data with pagination
      const { data, error, count } = await supabase
        .from(TABLE_NAME)
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched data:', data);
      setTableData(data || []);
      setTotalCount(count || 0);
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

  const totalPages = Math.ceil(totalCount / limit);
  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalCount);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
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

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Clients</h3>
            <p>{totalCount.toLocaleString()} records</p>
          </div>
          
          <div className="stat-card">
            <h3>Current Page</h3>
            <p>{currentPage} of {totalPages}</p>
          </div>
          
          <div className="stat-card">
            <h3>Showing</h3>
            <p>{totalCount > 0 ? `${startRecord}-${endRecord}` : '0'} records</p>
          </div>
          
          <div className="stat-card">
            <h3>Per Page</h3>
            <p>{limit} clients</p>
          </div>
        </div>

        {/* Table Data Section */}
        <div className="table-section">
          <div className="table-header">
            <h2>Clients from "{TABLE_NAME}" Table</h2>
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
                </select>
                <span> clients</span>
              </div>
              <button className="refresh-button" onClick={fetchTableData}>
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
                      {Object.keys(tableData[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr key={row.id || index}>
                        {Object.values(row).map((value, idx) => (
                          <td key={idx}>
                            {typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
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
                    Page {currentPage} of {totalPages}
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
    </div>
  );
}

export default Dashboard;
