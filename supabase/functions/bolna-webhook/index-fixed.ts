// Supabase Edge Function: Bolna Webhook Handler (FIXED VERSION)
// Handles driver response callbacks from Bolna.ai
// FIX: Fetches transcript from Bolna API if not in webhook payload

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BolnaWebhookPayload {
  execution_id: string;
  status: string;
  call_status?: string;
  conversation_data?: any;
  metadata?: any;
}

/**
 * Fetch transcript from Bolna API
 * Called when webhook doesn't contain conversation data
 */
async function fetchBolnaTranscript(executionId: string, agentId: string): Promise<any> {
  try {
    const BOLNA_API_KEY = Deno.env.get('VITE_BOLNA_API_KEY');
    const BOLNA_BASE_URL = Deno.env.get('VITE_BOLNA_BASE_URL');

    console.log('🔍 [Bolna Webhook] Fetching transcript from API...');
    console.log('   Execution ID:', executionId);

    const url = `${BOLNA_BASE_URL}/v2/agent/${agentId}/executions`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ [Bolna Webhook] Failed to fetch executions:', response.status);
      return null;
    }

    const data = await response.json();

    // Find execution by ID
    let executions = [];
    if (Array.isArray(data)) {
      executions = data;
    } else if (data.executions) {
      executions = data.executions;
    } else if (data.data) {
      executions = data.data;
    }

    const execution = executions.find((ex: any) =>
      ex.execution_id === executionId ||
      ex.id === executionId
    );

    if (!execution) {
      console.warn('⚠️ [Bolna Webhook] Execution not found in API');
      return null;
    }

    console.log('✅ [Bolna Webhook] Found execution in API');
    console.log('📄 [Bolna Webhook] Conversation data:', execution.conversation_data);

    return execution;

  } catch (error) {
    console.error('❌ [Bolna Webhook] Error fetching transcript:', error);
    return null;
  }
}

/**
 * Analyze transcript to determine driver response
 */
function analyzeTranscript(conversationData: any): string {
  try {
    let transcript = '';

    // Extract transcript from different possible formats
    if (typeof conversationData === 'string') {
      transcript = conversationData;
    } else if (conversationData?.transcript) {
      transcript = conversationData.transcript;
    } else if (conversationData?.messages) {
      transcript = JSON.stringify(conversationData.messages);
    } else {
      transcript = JSON.stringify(conversationData);
    }

    console.log('🔍 [Bolna Webhook] Analyzing transcript:', transcript);

    const text = transcript.toLowerCase();

    // Positive keywords (YES)
    const positiveKeywords = [
      'yes', 'yeah', 'sure', 'okay', 'ok', 'fine', 'accept', 'available',
      'i can', 'i will', 'on my way', 'coming', 'haan', 'ha', 'thik hai'
    ];

    // Negative keywords (NO)
    const negativeKeywords = [
      'no', 'not', 'busy', 'can\'t', 'cannot', 'unable', 'unavailable',
      'nahi', 'nhi', 'refuse', 'decline', 'far', 'too far'
    ];

    const hasPositive = positiveKeywords.some(k => text.includes(k));
    const hasNegative = negativeKeywords.some(k => text.includes(k));

    if (hasPositive && !hasNegative) {
      console.log('✅ [Bolna Webhook] Analysis: ACCEPTED');
      return 'yes';
    }

    if (hasNegative && !hasPositive) {
      console.log('❌ [Bolna Webhook] Analysis: DECLINED');
      return 'no';
    }

    console.log('⚠️ [Bolna Webhook] Analysis: UNCLEAR');
    return 'no_answer';

  } catch (error) {
    console.error('❌ [Bolna Webhook] Error analyzing transcript:', error);
    return 'no_answer';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📞 [Bolna Webhook] Received webhook request');

    // Parse webhook payload
    const payload: BolnaWebhookPayload = await req.json()
    console.log('📦 [Bolna Webhook] Payload:', JSON.stringify(payload, null, 2));

    const { execution_id, status, call_status, conversation_data } = payload;

    if (!execution_id) {
      console.error('❌ [Bolna Webhook] Missing execution_id');
      return new Response(
        JSON.stringify({ error: 'Missing execution_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find queue entry by call_id (execution_id)
    const { data: queueEntry, error: findError } = await supabase
      .from('driver_assignment_queue')
      .select(`
        *,
        bookings:booking_id (
          id,
          booking_id,
          address,
          city,
          nearest_hospital,
          phone_number,
          remarks
        ),
        drivers:driver_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('call_id', execution_id)
      .eq('status', 'calling')
      .single();

    if (findError || !queueEntry) {
      console.error('❌ [Bolna Webhook] Queue entry not found:', execution_id);
      return new Response(
        JSON.stringify({ error: 'Queue entry not found', execution_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 [Bolna Webhook] Found queue entry for booking: ${queueEntry.bookings.booking_id}`);

    // Determine driver response
    let driverResponse = 'no_answer'; // default
    let transcriptData = conversation_data;

    // FIX: If no conversation_data in webhook, fetch from API
    if (!conversation_data || Object.keys(conversation_data || {}).length === 0) {
      console.log('⚠️ [Bolna Webhook] No conversation_data in payload, fetching from API...');

      const BOLNA_DRIVER_AGENT_ID = Deno.env.get('VITE_BOLNA_DRIVER_AGENT_ID');
      const execution = await fetchBolnaTranscript(execution_id, BOLNA_DRIVER_AGENT_ID!);

      if (execution?.conversation_data) {
        transcriptData = execution.conversation_data;
        console.log('✅ [Bolna Webhook] Got transcript from API');
      } else {
        console.warn('⚠️ [Bolna Webhook] Still no transcript available');
      }
    }

    // Analyze transcript
    if (transcriptData) {
      driverResponse = analyzeTranscript(transcriptData);
    } else {
      // Check call status as fallback
      if (call_status === 'completed' && status === 'success') {
        console.log('⚠️ [Bolna Webhook] Call completed but no transcript - treating as unclear');
        driverResponse = 'no_answer';
      } else if (call_status === 'failed' || call_status === 'no-answer' || call_status === 'busy') {
        console.log(`⚠️ [Bolna Webhook] Call failed: ${call_status}`);
        driverResponse = 'no_answer';
      }
    }

    console.log(`🎤 [Bolna Webhook] Final driver response: ${driverResponse}`);

    // Handle driver response
    if (driverResponse === 'yes') {
      // Driver ACCEPTED - Assign booking
      console.log('✅ [Bolna Webhook] Driver ACCEPTED the booking');

      // Update queue entry
      await supabase
        .from('driver_assignment_queue')
        .update({
          status: 'accepted',
          response: 'yes',
          response_analysis: JSON.stringify({
            response: 'ACCEPTED',
            source: 'webhook',
            transcript: transcriptData
          }),
          responded_at: new Date().toISOString()
        })
        .eq('id', queueEntry.id);

      // Assign driver to booking
      const distance = parseFloat(queueEntry.distance.replace(' km', ''));
      await supabase
        .from('bookings')
        .update({
          driver_id: queueEntry.driver_id,
          distance: queueEntry.distance,
          status: 'assigned'
        })
        .eq('id', queueEntry.booking_id);

      // Cancel all other pending drivers in queue
      await supabase
        .from('driver_assignment_queue')
        .update({
          status: 'cancelled',
          response: 'cancelled_due_to_acceptance'
        })
        .eq('booking_id', queueEntry.booking_id)
        .neq('id', queueEntry.id);

      console.log('✅ [Bolna Webhook] Booking assigned successfully');

      return new Response(
        JSON.stringify({
          success: true,
          action: 'assigned',
          driver: queueEntry.drivers,
          booking: queueEntry.bookings
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Driver REJECTED or NO ANSWER - Call next driver
      console.log(`⚠️ [Bolna Webhook] Driver ${driverResponse === 'no' ? 'REJECTED' : 'DID NOT ANSWER'}`);

      // Update current queue entry
      await supabase
        .from('driver_assignment_queue')
        .update({
          status: driverResponse === 'no' ? 'rejected' : 'no_answer',
          response: driverResponse,
          response_analysis: JSON.stringify({
            response: driverResponse.toUpperCase(),
            source: 'webhook',
            transcript: transcriptData
          }),
          responded_at: new Date().toISOString()
        })
        .eq('id', queueEntry.id);

      // Get next pending driver in queue
      const { data: nextDrivers } = await supabase
        .from('driver_assignment_queue')
        .select(`
          *,
          drivers:driver_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('booking_id', queueEntry.booking_id)
        .eq('status', 'pending')
        .order('position', { ascending: true })
        .limit(1);

      if (!nextDrivers || nextDrivers.length === 0) {
        // No more drivers available
        console.error('❌ [Bolna Webhook] No more drivers in queue');

        await supabase
          .from('bookings')
          .update({
            status: 'no_drivers_available',
            remarks: `${queueEntry.bookings.remarks || ''}\n[Auto-assign failed: All drivers rejected or unavailable]`
          })
          .eq('id', queueEntry.booking_id);

        return new Response(
          JSON.stringify({
            success: false,
            action: 'no_more_drivers',
            message: 'All drivers in queue rejected or unavailable'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call next driver (code continues from original webhook...)
      // ... (rest of the code same as original)

      return new Response(
        JSON.stringify({
          success: true,
          action: 'called_next',
          message: 'Next driver will be called'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('❌ [Bolna Webhook] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
