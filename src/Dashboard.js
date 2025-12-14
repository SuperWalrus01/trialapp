import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import { calculatePriority, calculateStatistics } from './prioritisation';
import ClientBookOverview from './ClientBookOverview';
import ClientList from './ClientList';
import './Dashboard.css';

function Dashboard({ user }) {
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [completedClients, setCompletedClients] = useState({});

  const TABLE_NAME = 'client';

  useEffect(() => {
    checkConnection();
    loadCompletedStatusFromStorage();
    fetchAllClientsAndRank();
  }, []);

  const loadCompletedStatusFromStorage = () => {
    try {
      const stored = localStorage.getItem('completedClients');
      if (stored) {
        setCompletedClients(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading completed status:', err);
    }
  };

  const checkConnection = async () => {
    const isConnected = await testConnection();
    setConnectionStatus(isConnected);
  };

  const fetchAllClientsAndRank = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ALL clients from table: ${TABLE_NAME}`);
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} total clients`);
      
      // Get current completed status from storage
      const stored = localStorage.getItem('completedClients');
      const currentCompletedStatus = stored ? JSON.parse(stored) : {};
      
      // Calculate priority for each client
      const dataWithPriority = (data || []).map(client => ({
        ...client,
        priority: calculatePriority(client),
        completed: currentCompletedStatus[client.ClientID] === true
      }));
      
      // Sort: completed clients to bottom, then by priority score
      dataWithPriority.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return b.priority.score - a.priority.score;
      });
      
      setAllClients(dataWithPriority);
    } catch (err) {
      console.error('Error fetching data:', err);
      
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

  const handleToggleComplete = (clientId) => {
    console.log('Toggle complete for client ID:', clientId);
    console.log('Current completed clients:', completedClients);
    
    // Get current status
    const isCurrentlyCompleted = completedClients[clientId] === true;
    
    console.log('Is currently completed:', isCurrentlyCompleted);
    
    // Create updated status object
    const updatedStatus = { ...completedClients };
    
    if (isCurrentlyCompleted) {
      // Remove from completed
      delete updatedStatus[clientId];
    } else {
      // Mark as completed
      updatedStatus[clientId] = true;
    }
    
    console.log('Updated status object:', updatedStatus);
    
    // Save to localStorage
    localStorage.setItem('completedClients', JSON.stringify(updatedStatus));
    setCompletedClients(updatedStatus);
    
    // Update the clients array immediately
    setAllClients(prevClients => {
      console.log('Previous clients:', prevClients.map(c => ({ ClientID: c.ClientID, completed: c.completed })));
      
      const updated = prevClients.map(client => 
        client.ClientID === clientId 
          ? { ...client, completed: !isCurrentlyCompleted }
          : client
      );
      
      console.log('Updated clients:', updated.map(c => ({ ClientID: c.ClientID, completed: c.completed })));
      
      // Re-sort
      updated.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return b.priority.score - a.priority.score;
      });
      
      return updated;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Client Book Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Client List
          </button>
        </div>

        {/* Tab Content */}
        {loading && <p className="loading-message">Loading data...</p>}
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'overview' && (
              <ClientBookOverview allClients={allClients} />
            )}
            
            {activeTab === 'list' && (
              <ClientList 
                allClients={allClients} 
                onToggleComplete={handleToggleComplete}
                onRefresh={fetchAllClientsAndRank}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
