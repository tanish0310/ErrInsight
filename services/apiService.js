// Generate a simple client ID (fingerprint)
function getClientId() {
  if (typeof window === 'undefined') return null;
  
  let clientId = localStorage.getItem('errexplain_client_id');
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('errexplain_client_id', clientId);
  }
  return clientId;
}

// Generate user fingerprint for voting
function getUserFingerprint() {
  if (typeof window === 'undefined') return null;
  
  let fingerprint = localStorage.getItem('errexplain_fingerprint');
  if (!fingerprint) {
    fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('errexplain_fingerprint', fingerprint);
  }
  return fingerprint;
}

// Analyze an error message
export async function analyzeError({
  errorMessage,
  language,
  isPrivate = false,
}) {
  try {
    const clientId = getClientId();
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        errorMessage, 
        language, 
        isPrivate,
        clientId 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to analyze error');
    }

    console.log("API Response:", result); // Debug log

    // Return in the format the component expects
    return {
      success: result.success,
      analysis: result.analysis,
      rateLimit: result.rateLimit
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error(error.message || "Failed to analyze error message");
  }
}

// Check rate limit status
export async function checkRateLimit() {
  try {
    const clientId = getClientId();
    
    const response = await fetch(`/api/rate-limit?clientId=${clientId}`, {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Rate limit check error:", result.error);
      return {
        remaining: 5,
        limit: 5,
        canAnalyze: true,
        loading: false,
      };
    }

    return {
      remaining: result.remaining || 5,
      maxRequests: result.limit || 5,
      limit: result.limit || 5,
      resetTime: result.resetsAt ? new Date(result.resetsAt) : null,
      canAnalyze: result.canAnalyze !== false,
      loading: false,
      clientId: result.clientId || clientId,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return {
      remaining: 5,
      maxRequests: 5,
      limit: 5,
      canAnalyze: true,
      loading: false,
    };
  }
}

// Get client ID
export async function getClientIdFromApi() {
  return getClientId();
}

// Get user history
export async function getUserHistory() {
  try {
    const clientId = getClientId();
    
    const response = await fetch(`/api/history?clientId=${clientId}`, {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch history');
    }

    console.log("📊 History API Response:", result); // Debug log

    return {
      success: result.success,
      history: result.history || [],
      stats: result.stats || {
        total: 0,
        languages: {},
        severity: { low: 0, medium: 0, high: 0 },
        categories: {},
        timeline: []
      }
    };
  } catch (error) {
    console.error("History fetch failed:", error);
    throw new Error(error.message || "Failed to fetch user history");
  }
}

// Share an error
export async function shareError(errorId) {
  try {
    const clientId = getClientId();
    
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        documentId: errorId,
        clientId 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to share error');
    }

    return {
      success: true,
      shareId: result.shareId,
      shareUrl: result.shareUrl
    };
  } catch (error) {
    console.error("Share error failed:", error);
    throw new Error(error.message || "Failed to share error");
  }
}

// Delete a history item
export async function deleteHistoryItem(historyId) {
  try {
    const clientId = getClientId();
    
    const response = await fetch(`/api/delete?documentId=${historyId}&clientId=${clientId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete history item');
    }

    return {
      success: true,
      message: result.message
    };
  } catch (error) {
    console.error("Delete history failed:", error);
    throw new Error(error.message || "Failed to delete history item");
  }
}

// Vote on a solution
export async function voteSolution(shareId, voteType, solutionIndex = 0) {
  try {
    const userFingerprint = getUserFingerprint();
    
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shareId,
        solutionIndex,
        voteType,
        userFingerprint
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to record vote');
    }

    return result.votes;
  } catch (error) {
    console.error("Vote submission failed:", error);
    throw new Error(error.message || "Failed to record vote");
  }
}

// Get solution votes for a shared error
export async function getSolutionVotes(shareId) {
  try {
    // This would need a GET endpoint, but for now we can return from the vote response
    // Or you can add a GET /api/votes?shareId=... endpoint
    const response = await fetch(`/api/vote?shareId=${shareId}`, {
      method: 'GET',
    });

    const result = await response.json();

    if (!response.ok) {
      return { helpful: 0, notHelpful: 0 };
    }

    return result.votes || { helpful: 0, notHelpful: 0 };
  } catch (error) {
    console.error("Get votes failed:", error);
    return { helpful: 0, notHelpful: 0 };
  }
}

export { getClientId };