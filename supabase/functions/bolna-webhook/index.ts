// Supabase Edge Function: Bolna Webhook Handler
// Handles driver response callbacks from Bolna.ai
// When driver says "yes" -> assign booking
// When driver says "no" or doesn't answer -> call next driver in queue

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
  conversation_data?: {
    driver_response?: string; // "yes" or "no"
  };
  extracted_data?: {
    transcript?: Array<{
      message: string;
      speaker: string;
    }>;
    execution_id?: string;
  };
  summary?: string;
  metadata?: any;
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
    let transcriptText = '';

    // ENHANCED: Check multiple possible transcript locations
    console.log('🔍 [Bolna Webhook] Analyzing payload for transcript...');

    // Method 1: Check conversation_data.driver_response
    if (conversation_data?.driver_response) {
      const response = conversation_data.driver_response.toLowerCase();
      transcriptText = response;
      console.log('📝 [Bolna Webhook] Found in conversation_data.driver_response:', response);
    }

    // Method 2: Check payload.extracted_data.transcript (BOLNA FORMAT)
    else if (payload.extracted_data?.transcript && Array.isArray(payload.extracted_data.transcript)) {
      console.log('📝 [Bolna Webhook] Found transcript array in extracted_data');

      // Extract all user messages
      const userMessages = payload.extracted_data.transcript
        .filter((msg: any) => msg.speaker === 'user')
        .map((msg: any) => msg.message)
        .join(' ');

      transcriptText = userMessages.toLowerCase();
      console.log('📝 [Bolna Webhook] User messages:', transcriptText);
    }

    // Method 3: Check payload.summary
    else if (payload.summary) {
      transcriptText = payload.summary.toLowerCase();
      console.log('📝 [Bolna Webhook] Using summary:', transcriptText);
    }

    // Analyze transcript for YES/NO
    if (transcriptText) {
      // Positive keywords
      const positiveKeywords = [
        'yes', 'yeah', 'sure', 'okay', 'ok', 'fine', 'accept', 'available',
        'i can', 'i will', 'i am available', 'i\'m available', 'on my way',
        'coming', 'going to take', 'haan', 'ha', 'thik hai'
      ];

      // Negative keywords
      const negativeKeywords = [
        'no', 'not', 'busy', 'can\'t', 'cannot', 'unable', 'unavailable',
        'nahi', 'nhi', 'refuse', 'decline', 'far', 'too far'
      ];

      const hasPositive = positiveKeywords.some(k => transcriptText.includes(k));
      const hasNegative = negativeKeywords.some(k => transcriptText.includes(k));

      if (hasPositive && !hasNegative) {
        driverResponse = 'yes';
        console.log('✅ [Bolna Webhook] Analysis: ACCEPTED (found positive keywords)');
      } else if (hasNegative && !hasPositive) {
        driverResponse = 'no';
        console.log('❌ [Bolna Webhook] Analysis: DECLINED (found negative keywords)');
      } else {
        console.log('⚠️ [Bolna Webhook] Analysis: UNCLEAR (mixed or no keywords)');
      }
    }

    // Check call status
    if (call_status === 'completed' && status === 'success') {
      // Call completed successfully - check if we got a response
      if (driverResponse === 'no_answer' && !transcriptText) {
        // If no explicit response captured, treat as no answer
        console.log('⚠️ [Bolna Webhook] Call completed but no clear response');
        driverResponse = 'no_answer';
      }
    } else if (call_status === 'failed' || call_status === 'no-answer' || call_status === 'busy') {
      // Call failed or not answered
      console.log(`⚠️ [Bolna Webhook] Call failed: ${call_status}`);
      driverResponse = 'no_answer';
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
        .update({ status: 'cancelled' })
        .eq('booking_id', queueEntry.booking_id)
        .eq('status', 'pending');

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

        // Update booking status
        await supabase
          .from('bookings')
          .update({
            status: 'no_drivers_available',
            remarks: `${queueEntry.bookings.remarks || ''}\n[Auto-assign failed: All drivers rejected or unavailable at ${new Date().toISOString()}]`
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

      // Call next driver
      const nextDriver = nextDrivers[0];
      console.log(`📞 [Bolna Webhook] Calling next driver: ${nextDriver.drivers.first_name} ${nextDriver.drivers.last_name}`);

      // Update next driver status to calling
      await supabase
        .from('driver_assignment_queue')
        .update({
          status: 'calling',
          called_at: new Date().toISOString()
        })
        .eq('id', nextDriver.id);

      // Make Bolna API call to next driver
      const BOLNA_API_URL = `${Deno.env.get('VITE_BOLNA_BASE_URL')}${Deno.env.get('VITE_BOLNA_CALLS_PATH')}`;
      const BOLNA_API_KEY = Deno.env.get('VITE_BOLNA_API_KEY');
      const BOLNA_DRIVER_AGENT_ID = Deno.env.get('VITE_BOLNA_DRIVER_AGENT_ID');
      const BOLNA_FROM_NUMBER = Deno.env.get('VITE_BOLNA_FROM_NUMBER');

      const callPayload = {
        agent_id: BOLNA_DRIVER_AGENT_ID,
        recipient_phone_number: nextDriver.drivers.phone,
        from_phone_number: BOLNA_FROM_NUMBER,
        user_data: {
          alert_type: 'Raftaar Ambulance Alert',
          driver_name: `${nextDriver.drivers.first_name} ${nextDriver.drivers.last_name}`,
          booking_id: queueEntry.bookings.booking_id,
          victim_location: queueEntry.bookings.address,
          nearby_hospital: queueEntry.bookings.nearest_hospital,
          Phone_umber: queueEntry.bookings.phone_number,
          distance: nextDriver.distance,
          timestamp: new Date().toISOString()
        }
      };

      const callResponse = await fetch(BOLNA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BOLNA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callPayload)
      });

      const callData = await callResponse.json();

      if (callResponse.ok) {
        // Update queue with new call ID
        await supabase
          .from('driver_assignment_queue')
          .update({
            call_id: callData.execution_id
          })
          .eq('id', nextDriver.id);

        console.log('✅ [Bolna Webhook] Next driver call initiated successfully');

        return new Response(
          JSON.stringify({
            success: true,
            action: 'called_next',
            nextDriver: nextDriver.drivers,
            previousDriver: queueEntry.drivers,
            callExecutionId: callData.execution_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Call failed
        console.error('❌ [Bolna Webhook] Failed to call next driver:', callData);

        await supabase
          .from('driver_assignment_queue')
          .update({ status: 'failed' })
          .eq('id', nextDriver.id);

        return new Response(
          JSON.stringify({
            success: false,
            action: 'call_failed',
            error: callData.message || 'Failed to call next driver'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
