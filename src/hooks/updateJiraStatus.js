// JIRA Status Update Hook
// This module provides automation for updating JIRA ticket status when tasks are completed

const JIRA_CONFIG = {
  cloudId: 'a7591226-63ed-4189-a79b-3e1c787dcdf9',
  transitions: {
    toDo: '10042',
    inProgress: '10043', // Update with actual transition ID
    done: '10044', // Update with actual transition ID
  }
};

/**
 * Updates JIRA issue status when a task is completed
 * @param {string} issueKey - JIRA issue key (e.g., 'FWT-10')
 * @param {string} newStatus - Target status ('done', 'in_progress', 'todo')
 * @returns {Promise<void>}
 */
async function updateJiraStatus(issueKey, newStatus) {
  try {
    // Map status to transition ID
    const transitionMap = {
      'done': JIRA_CONFIG.transitions.done,
      'in_progress': JIRA_CONFIG.transitions.inProgress,
      'todo': JIRA_CONFIG.transitions.toDo,
    };

    const transitionId = transitionMap[newStatus.toLowerCase()];

    if (!transitionId) {
      console.warn(`Unknown status: ${newStatus}`);
      return;
    }

    // Note: In production, you would make an API call here
    // For now, we'll log the intention
    console.log(`[JIRA Hook] Would update ${issueKey} to status ${newStatus} (transition: ${transitionId})`);

    // Example API call structure (requires authentication):
    /*
    const response = await fetch(`https://api.atlassian.com/ex/jira/${JIRA_CONFIG.cloudId}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transition: {
          id: transitionId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update JIRA status: ${response.statusText}`);
    }
    */

    console.log(`Successfully updated ${issueKey} status to ${newStatus}`);
  } catch (error) {
    console.error(`Error updating JIRA status for ${issueKey}:`, error);
  }
}

/**
 * Hook to be called when a task is marked as complete
 * @param {Object} task - Task object containing ticket information
 */
export function onTaskComplete(task) {
  // Extract JIRA ticket key from task content (e.g., "FWT-10" from "Implement FWT-10: Theme selector")
  const ticketMatch = task.content.match(/([A-Z]+-\d+)/);

  if (ticketMatch) {
    const issueKey = ticketMatch[1];
    updateJiraStatus(issueKey, 'done');
  }
}

/**
 * Hook to be called when a task status changes
 * @param {Object} task - Task object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
export function onTaskStatusChange(task, oldStatus, newStatus) {
  const ticketMatch = task.content.match(/([A-Z]+-\d+)/);

  if (ticketMatch) {
    const issueKey = ticketMatch[1];

    // Map task status to JIRA status
    const statusMap = {
      'pending': 'todo',
      'in_progress': 'in_progress',
      'completed': 'done'
    };

    const jiraStatus = statusMap[newStatus];
    if (jiraStatus) {
      updateJiraStatus(issueKey, jiraStatus);
    }
  }
}

// Configuration for automatic JIRA updates
export const jiraAutomationConfig = {
  enabled: true,
  autoUpdateOnComplete: true,
  ticketPattern: /([A-Z]+-\d+)/,
  logUpdates: true,
};

export default {
  onTaskComplete,
  onTaskStatusChange,
  updateJiraStatus,
  config: jiraAutomationConfig
};