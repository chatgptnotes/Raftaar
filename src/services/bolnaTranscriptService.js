/**
 * Bolna.ai Transcript Service
 * Handles fetching and analyzing call transcripts from Bolna.ai
 */

const BOLNA_API_BASE_URL = import.meta.env.VITE_BOLNA_BASE_URL;
const BOLNA_API_KEY = import.meta.env.VITE_BOLNA_API_KEY;
const BOLNA_DRIVER_AGENT_ID = import.meta.env.VITE_BOLNA_DRIVER_AGENT_ID;

/**
 * Fetch all executions for the driver agent
 * @returns {Promise<Array>} Array of execution objects
 */
export const fetchAgentExecutions = async () => {
  try {
    const url = `${BOLNA_API_BASE_URL}/v2/agent/${BOLNA_DRIVER_AGENT_ID}/executions`;

    console.log('📞 [Bolna Transcript] Fetching executions from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Log the actual response structure for debugging
    console.log('📦 [Bolna Transcript] Raw API response type:', typeof data);
    console.log('📦 [Bolna Transcript] Raw API response keys:', Object.keys(data || {}));

    // Handle different response formats
    let executions = [];

    if (Array.isArray(data)) {
      // Response is directly an array
      executions = data;
      console.log('✅ [Bolna Transcript] Response is direct array');
    } else if (data && Array.isArray(data.executions)) {
      // Response is an object with executions array
      executions = data.executions;
      console.log('✅ [Bolna Transcript] Response has executions field');
    } else if (data && Array.isArray(data.data)) {
      // Response might have data field containing array
      executions = data.data;
      console.log('✅ [Bolna Transcript] Response has data field');
    } else {
      console.warn('⚠️ [Bolna Transcript] Unexpected response format:', data);
      executions = [];
    }

    console.log('✅ [Bolna Transcript] Fetched executions count:', executions.length);

    // Log first execution object to see its structure
    if (executions.length > 0) {
      console.log('🔍 [Bolna Transcript] First execution object keys:', Object.keys(executions[0]));
      console.log('🔍 [Bolna Transcript] First execution sample:', JSON.stringify(executions[0], null, 2));
    }

    return executions;
  } catch (error) {
    console.error('❌ [Bolna Transcript] Failed to fetch executions:', error);
    return [];
  }
};

/**
 * Fetch specific execution details by execution ID
 * @param {string} executionId - Bolna execution ID
 * @returns {Promise<object|null>} Execution details with transcript
 */
export const fetchExecutionById = async (executionId) => {
  try {
    const executions = await fetchAgentExecutions();

    console.log('🔍 [Bolna Transcript] Searching for execution:', executionId);

    // Validate that executions is an array
    if (!Array.isArray(executions)) {
      console.error('❌ [Bolna Transcript] executions is not an array:', typeof executions);
      console.error('📦 [Bolna Transcript] executions value:', executions);
      return null;
    }

    console.log('📊 [Bolna Transcript] Total executions available:', executions.length);

    // Try different possible field names for execution ID
    // Different APIs might use: execution_id, id, executionId, uuid, etc.
    const execution = executions.find(ex =>
      ex.execution_id === executionId ||
      ex.id === executionId ||
      ex.executionId === executionId ||
      ex.uuid === executionId
    );

    if (!execution) {
      console.warn('⚠️ [Bolna Transcript] Execution not found:', executionId);
      if (executions.length > 0) {
        // Try to show IDs using all possible field names
        console.log('📋 [Bolna Transcript] Available execution IDs (execution_id):', executions.map(ex => ex.execution_id));
        console.log('📋 [Bolna Transcript] Available IDs (id):', executions.map(ex => ex.id));
        console.log('📋 [Bolna Transcript] Available IDs (executionId):', executions.map(ex => ex.executionId));
        console.log('📋 [Bolna Transcript] Sample execution object:', JSON.stringify(executions[0], null, 2));
      } else {
        console.log('📋 [Bolna Transcript] No executions available yet');
      }
      return null;
    }

    console.log('✅ [Bolna Transcript] Found execution:', executionId);
    console.log('📄 [Bolna Transcript] Execution data:', JSON.stringify(execution, null, 2));
    return execution;
  } catch (error) {
    console.error('❌ [Bolna Transcript] Failed to fetch execution:', error);
    console.error('🔍 [Bolna Transcript] Error details:', error.message, error.stack);
    return null;
  }
};

/**
 * Get transcript from execution data
 * @param {object} execution - Execution object from Bolna
 * @returns {string} Transcript text
 */
export const getTranscriptFromExecution = (execution) => {
  try {
    console.log('📝 [Bolna Transcript] Extracting transcript from execution...');
    console.log('🔍 [Bolna Transcript] Available fields:', Object.keys(execution));

    // Check if conversation_data exists
    if (execution.conversation_data) {
      console.log('✅ [Bolna Transcript] Found conversation_data field');
      console.log('📄 [Bolna Transcript] conversation_data type:', typeof execution.conversation_data);
      console.log('📄 [Bolna Transcript] conversation_data:', execution.conversation_data);

      // If it's a string, try to parse it
      if (typeof execution.conversation_data === 'string') {
        try {
          const parsed = JSON.parse(execution.conversation_data);
          const transcript = parsed.transcript || execution.conversation_data;
          console.log('✅ [Bolna Transcript] Extracted transcript (parsed):', transcript);
          return transcript;
        } catch {
          console.log('✅ [Bolna Transcript] Using raw conversation_data as transcript');
          return execution.conversation_data;
        }
      }

      // If it's an object, look for transcript field
      if (typeof execution.conversation_data === 'object') {
        const transcript = execution.conversation_data.transcript || JSON.stringify(execution.conversation_data);
        console.log('✅ [Bolna Transcript] Extracted transcript (object):', transcript);
        return transcript;
      }
    }

    // Fallback: check other possible fields
    if (execution.transcript) {
      console.log('✅ [Bolna Transcript] Found transcript field directly');
      console.log('📄 [Bolna Transcript] transcript:', execution.transcript);
      return execution.transcript;
    }

    if (execution.messages) {
      console.log('✅ [Bolna Transcript] Found messages field, converting to string');
      const transcript = JSON.stringify(execution.messages);
      console.log('📄 [Bolna Transcript] messages:', transcript);
      return transcript;
    }

    console.warn('⚠️ [Bolna Transcript] No transcript found in execution');
    console.log('📋 [Bolna Transcript] Full execution object:', JSON.stringify(execution, null, 2));
    return '';
  } catch (error) {
    console.error('❌ [Bolna Transcript] Error extracting transcript:', error);
    return '';
  }
};

/**
 * Analyze transcript to determine driver's response
 * @param {string} transcript - Call transcript text
 * @returns {object} Analysis result with response type and confidence
 */
export const analyzeDriverResponse = (transcript) => {
  try {
    if (!transcript || transcript.trim() === '') {
      return {
        response: 'NO_RESPONSE',
        confidence: 'low',
        reason: 'Empty transcript'
      };
    }

    const text = transcript.toLowerCase();

    console.log('🔍 [Bolna Transcript] Analyzing transcript:', transcript);

    // POSITIVE indicators (driver accepts)
    const positiveKeywords = [
      'yes', 'yeah', 'sure', 'okay', 'ok', 'fine', 'accept', 'available',
      'i can', 'i will', 'i am available', 'i\'m available', 'on my way',
      'coming', 'reach', 'confirm', 'haan', 'ha', 'thik hai', 'theek hai'
    ];

    // NEGATIVE indicators (driver declines)
    const negativeKeywords = [
      'no', 'not', 'busy', 'can\'t', 'cannot', 'unable', 'unavailable',
      'not available', 'occupied', 'engaged', 'sorry', 'nahi', 'nhi',
      'not possible', 'won\'t', 'will not', 'refuse', 'decline', 'far',
      'too far', 'another case', 'other work'
    ];

    // Check for positive response
    const hasPositive = positiveKeywords.some(keyword => text.includes(keyword));
    const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;

    // Check for negative response
    const hasNegative = negativeKeywords.some(keyword => text.includes(keyword));
    const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length;

    // Decision logic
    if (hasPositive && !hasNegative) {
      return {
        response: 'ACCEPTED',
        confidence: positiveCount >= 2 ? 'high' : 'medium',
        reason: `Found ${positiveCount} positive indicators`,
        keywords: positiveKeywords.filter(k => text.includes(k))
      };
    }

    if (hasNegative && !hasPositive) {
      return {
        response: 'DECLINED',
        confidence: negativeCount >= 2 ? 'high' : 'medium',
        reason: `Found ${negativeCount} negative indicators`,
        keywords: negativeKeywords.filter(k => text.includes(k))
      };
    }

    if (hasPositive && hasNegative) {
      // Mixed response - use count to decide
      if (negativeCount > positiveCount) {
        return {
          response: 'DECLINED',
          confidence: 'medium',
          reason: 'More negative indicators than positive',
          keywords: negativeKeywords.filter(k => text.includes(k))
        };
      } else {
        return {
          response: 'ACCEPTED',
          confidence: 'medium',
          reason: 'More positive indicators than negative',
          keywords: positiveKeywords.filter(k => text.includes(k))
        };
      }
    }

    // No clear indicators - check if call was actually answered
    if (text.includes('user') || text.includes('assistant')) {
      return {
        response: 'UNCLEAR',
        confidence: 'low',
        reason: 'Conversation detected but no clear response'
      };
    }

    return {
      response: 'NO_RESPONSE',
      confidence: 'low',
      reason: 'No clear indicators found'
    };

  } catch (error) {
    console.error('❌ [Bolna Transcript] Error analyzing transcript:', error);
    return {
      response: 'ERROR',
      confidence: 'low',
      reason: error.message
    };
  }
};

/**
 * Wait for call to complete and fetch transcript
 * @param {string} executionId - Bolna execution ID
 * @param {number} maxWaitTime - Maximum wait time in seconds (default: 120)
 * @param {number} pollInterval - Poll interval in seconds (default: 5)
 * @returns {Promise<object>} Execution with transcript and analysis
 */
export const waitForCallCompletion = async (executionId, maxWaitTime = 60, pollInterval = 2) => {
  const startTime = Date.now();
  const maxWaitMs = maxWaitTime * 1000;
  const pollIntervalMs = pollInterval * 1000;

  console.log(`⏳ [Bolna Transcript] Waiting for call completion: ${executionId}`);
  console.log(`   Max wait: ${maxWaitTime}s, Poll interval: ${pollInterval}s (FAST MODE)`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const execution = await fetchExecutionById(executionId);

      if (!execution) {
        console.log('⚠️ [Bolna Transcript] Execution not found yet, retrying...');
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      // Check if call is completed
      console.log('🔍 [Bolna Transcript] Checking completion status...');
      console.log('   Execution status:', execution.status);
      console.log('   Hangup by:', execution.hangup_by);
      console.log('   Has transcript:', !!execution.conversation_data);
      console.log('   Call duration:', execution.duration_in_seconds || 'N/A');

      // Call is completed only when status is completed AND hangup_by has a value
      const isCompleted = (execution.status === 'completed' || execution.status === 'Completed') &&
                         (execution.hangup_by != null);  // Checks both null and undefined

      if (isCompleted) {
        console.log('✅ [Bolna Transcript] Call completed!');
        console.log('📊 [Bolna Transcript] Status:', execution.status);
        console.log('📊 [Bolna Transcript] Hangup by:', execution.hangup_by);

        // Extract transcript
        console.log('📝 [Bolna Transcript] Extracting transcript...');
        const transcript = getTranscriptFromExecution(execution);
        console.log('📄 [Bolna Transcript] FULL TRANSCRIPT:', transcript);
        console.log('📏 [Bolna Transcript] Transcript length:', transcript.length, 'characters');

        // Analyze response
        console.log('🔍 [Bolna Transcript] Analyzing driver response...');
        const analysis = analyzeDriverResponse(transcript);

        console.log('📊 [Bolna Transcript] ===== ANALYSIS RESULT =====');
        console.log('   Response:', analysis.response);
        console.log('   Confidence:', analysis.confidence);
        console.log('   Reason:', analysis.reason);
        console.log('   Keywords:', analysis.keywords);
        console.log('==========================================');

        return {
          success: true,
          execution,
          transcript,
          analysis,
          duration: execution.duration_in_seconds || 0
        };
      }

      console.log(`⏳ [Bolna Transcript] Call still in progress... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    } catch (error) {
      console.error('❌ [Bolna Transcript] Error while waiting:', error);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  console.warn('⏱️ [Bolna Transcript] Timeout waiting for call completion');
  console.warn('💡 [Bolna Transcript] This usually means:');
  console.warn('   1. Call was not answered by driver');
  console.warn('   2. Execution ID not found in Bolna API');
  console.warn('   3. Call is taking longer than expected');

  // Return timeout with analysis suggesting no answer
  return {
    success: false,
    error: 'Timeout waiting for call completion',
    executionId,
    analysis: {
      response: 'NO_RESPONSE',
      confidence: 'high',
      reason: 'Call timeout - likely not answered or execution not found'
    }
  };
};

export default {
  fetchAgentExecutions,
  fetchExecutionById,
  getTranscriptFromExecution,
  analyzeDriverResponse,
  waitForCallCompletion
};
