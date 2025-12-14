/**
 * Rule-based client prioritisation scoring system
 * Returns deterministic score and tier for each client
 */

export function calculatePriority(client) {
  let score = 0;
  
  // Total AUA (Assets Under Advice) - Large weight (0-50 points)
  // Field name: "Total Portfolio AUA"
  // Adjusted for actual range: £30,500 - £800,000
  const aua = parseFloat(client['Total Portfolio AUA']) || 0;
  
  if (aua >= 600000) score += 50;      // Top tier: £600k+
  else if (aua >= 400000) score += 40; // £400k-£599k
  else if (aua >= 250000) score += 30; // £250k-£399k
  else if (aua >= 150000) score += 20; // £150k-£249k
  else if (aua >= 75000) score += 10;  // £75k-£149k
  else score += Math.min(aua / 7500, 5); // Below £75k
  
  // Total fees paid (0-30 points) - Score range £0 to £10,000
  // Field name: "TotalFees"
  const fees = parseFloat(client['TotalFees']) || 0;
  
  if (fees >= 10000) score += 30;
  else if (fees >= 7500) score += 24;
  else if (fees >= 5000) score += 18;
  else if (fees >= 2500) score += 12;
  else if (fees >= 1000) score += 6;
  else score += Math.min(fees / 200, 3);
  
  // Engagement metrics (0-20 points)
  // Field names: "LoginsL12M" (0-180) and "MeetingsL12M" (0-50)
  // Adjusted for actual ranges
  const logins = parseInt(client['LoginsL12M']) || 0;
  const meetings = parseInt(client['MeetingsL12M']) || 0;
  
  // Logins: 0-10 points (scale: 18 logins = max 10 points, so 1.8 logins per point)
  score += Math.min(logins / 18, 10);
  
  // Meetings: 0-10 points (scale: 5 meetings = max 10 points, so 0.5 meetings per point)
  score += Math.min(meetings / 5, 10);
  
  // Round to 2 decimal places
  score = Math.round(score * 100) / 100;
  
  // Determine tier with score-based thresholds
  let tier;
  if (score >= 75) tier = "High";        // 75+ = High Priority
  else if (score >= 60) tier = "Medium";  // 60-74 = Medium Priority
  else tier = "Low";                      // Below 60 = Low Priority
  
  return {
    score,
    tier,
    breakdown: {
      auaScore: Math.min(50, score >= 50 ? 50 : Math.round((aua / 12000) * 10) / 10),
      feesScore: Math.min(30, Math.round((fees / 500) * 10) / 10),
      engagementScore: Math.min(20, (logins / 18) + (meetings / 5))
    }
  };
}

/**
 * Calculate metric rankings for a specific client against all clients
 */
export function calculateMetricRankings(client, allClients) {
  const clientAUA = parseFloat(client['Total Portfolio AUA']) || 0;
  const clientFees = parseFloat(client['TotalFees']) || 0;
  const clientLogins = parseInt(client['LoginsL12M']) || 0;
  const clientMeetings = parseInt(client['MeetingsL12M']) || 0;
  const clientEngagement = clientLogins + clientMeetings;

  // Sort all clients by each metric (descending)
  const sortedByAUA = [...allClients].sort((a, b) => 
    (parseFloat(b['Total Portfolio AUA']) || 0) - (parseFloat(a['Total Portfolio AUA']) || 0)
  );
  
  const sortedByFees = [...allClients].sort((a, b) => 
    (parseFloat(b['TotalFees']) || 0) - (parseFloat(a['TotalFees']) || 0)
  );
  
  const sortedByEngagement = [...allClients].sort((a, b) => {
    const aEngagement = (parseInt(a['LoginsL12M']) || 0) + (parseInt(a['MeetingsL12M']) || 0);
    const bEngagement = (parseInt(b['LoginsL12M']) || 0) + (parseInt(b['MeetingsL12M']) || 0);
    return bEngagement - aEngagement;
  });

  // Find rankings (1-based index)
  const auaRank = sortedByAUA.findIndex(c => c.id === client.id) + 1;
  const feesRank = sortedByFees.findIndex(c => c.id === client.id) + 1;
  const engagementRank = sortedByEngagement.findIndex(c => c.id === client.id) + 1;

  return {
    auaRank,
    feesRank,
    engagementRank,
    totalClients: allClients.length
  };
}

/**
 * Get priority explanation for display in client detail view
 */
export function getPriorityExplanation(client, priority, rankings = null) {
  const aua = parseFloat(client['Total Portfolio AUA']) || 0;
  const fees = parseFloat(client['TotalFees']) || 0;
  const logins = parseInt(client['LoginsL12M']) || 0;
  const meetings = parseInt(client['MeetingsL12M']) || 0;
  
  return {
    summary: `This client has a ${priority.tier.toLowerCase()} priority score of ${priority.score}/100`,
    factors: [
      {
        label: "Assets Under Advice",
        value: `£${aua.toLocaleString()}`,
        contribution: priority.breakdown.auaScore,
        maxPoints: 50,
        rank: rankings?.auaRank
      },
      {
        label: "Total Fees Paid",
        value: `£${fees.toLocaleString()}`,
        contribution: priority.breakdown.feesScore,
        maxPoints: 30,
        rank: rankings?.feesRank
      },
      {
        label: "Engagement (12 months)",
        value: `${logins} logins, ${meetings} meetings`,
        contribution: priority.breakdown.engagementScore,
        maxPoints: 20,
        rank: rankings?.engagementRank
      }
    ]
  };
}

/**
 * Calculate statistics for all clients
 */
export function calculateStatistics(allClients) {
  const tierCounts = {
    High: 0,
    Medium: 0,
    Low: 0
  };

  allClients.forEach(client => {
    tierCounts[client.priority.tier]++;
  });

  return {
    tierDistribution: [
      { tier: 'High', count: tierCounts.High, color: '#10b981' },
      { tier: 'Medium', count: tierCounts.Medium, color: '#f97316' },
      { tier: 'Low', count: tierCounts.Low, color: '#ef4444' }
    ],
    totalClients: allClients.length,
    averageScore: allClients.length > 0 
      ? (allClients.reduce((sum, c) => sum + c.priority.score, 0) / allClients.length).toFixed(2)
      : 0
  };
}
