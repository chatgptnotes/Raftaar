import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Driver Queue Status Component
 * Shows real-time status of driver assignment queue and intelligent reassignment
 */
const DriverQueueStatus = ({ bookingId, onStatusChange }) => {
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState(null);

  useEffect(() => {
    fetchQueueStatus();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`queue-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignment_queue',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('🔄 [Queue Status] Real-time update:', payload);
          fetchQueueStatus();
          if (onStatusChange) onStatusChange();
        }
      )
      .subscribe();

    // Also subscribe to booking updates for WhatsApp status
    const bookingChannel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          console.log('🔄 [Booking] Real-time update:', payload);
          if (payload.new.whatsapp_sent) {
            setWhatsappStatus({
              sent: payload.new.whatsapp_sent,
              sentAt: payload.new.whatsapp_sent_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      bookingChannel.unsubscribe();
    };
  }, [bookingId]);

  const fetchQueueStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_assignment_queue')
        .select(`
          *,
          drivers:driver_id (
            first_name,
            last_name,
            phone,
            vehicle_model,
            vehicle_number
          )
        `)
        .eq('booking_id', bookingId)
        .order('position', { ascending: true });

      if (error) throw error;

      setQueueEntries(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching queue status:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'calling':
        return 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse';
      case 'rejected':
      case 'no_answer':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'unclear':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return '✅';
      case 'calling':
        return '📞';
      case 'rejected':
        return '❌';
      case 'no_answer':
        return '📵';
      case 'unclear':
        return '❓';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '🚫';
      default:
        return '•';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'calling':
        return 'Calling...';
      case 'rejected':
        return 'Declined';
      case 'no_answer':
        return 'No Answer';
      case 'unclear':
        return 'Unclear Response';
      case 'pending':
        return 'In Queue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span>Loading queue status...</span>
      </div>
    );
  }

  if (queueEntries.length === 0) {
    return null;
  }

  const acceptedEntry = queueEntries.find(e => e.status === 'accepted');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>🚗</span>
          <span>Driver Assignment Queue</span>
        </h4>
        {acceptedEntry && whatsappStatus?.sent && (
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
            <span className="text-green-600 font-semibold">📱 WhatsApp Sent</span>
          </div>
        )}
      </div>

      {/* Queue Entries */}
      <div className="space-y-2">
        {queueEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`border-2 rounded-lg p-3 transition ${getStatusColor(entry.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getStatusIcon(entry.status)}</span>
                  <span className="font-bold text-gray-800">
                    #{entry.position} - {entry.drivers?.first_name} {entry.drivers?.last_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(entry.status)}`}>
                    {getStatusLabel(entry.status)}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1 ml-7">
                  <div className="flex items-center gap-4">
                    <span>📱 {entry.drivers?.phone}</span>
                    <span>🚗 {entry.drivers?.vehicle_model}</span>
                    <span>📏 {entry.distance}</span>
                  </div>

                  {entry.called_at && (
                    <div className="text-xs text-gray-500">
                      Called: {new Date(entry.called_at).toLocaleTimeString()}
                    </div>
                  )}

                  {entry.responded_at && (
                    <div className="text-xs text-gray-500">
                      Responded: {new Date(entry.responded_at).toLocaleTimeString()}
                    </div>
                  )}

                  {entry.response_analysis && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Analysis
                      </summary>
                      <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-auto">
                        {JSON.stringify(JSON.parse(entry.response_analysis), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {entry.status === 'calling' && (
                <div className="ml-2">
                  <div className="animate-pulse text-blue-600 text-xs font-semibold">
                    Analyzing...
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
        <strong>Status:</strong> {acceptedEntry ? (
          <span className="text-green-600 font-semibold">
            ✅ Driver assigned and WhatsApp location {whatsappStatus?.sent ? 'sent' : 'pending'}
          </span>
        ) : queueEntries.some(e => e.status === 'calling') ? (
          <span className="text-blue-600 font-semibold">
            📞 Calling driver... Waiting for response
          </span>
        ) : (
          <span className="text-gray-600">
            ⏳ Processing queue...
          </span>
        )}
      </div>
    </div>
  );
};

export default DriverQueueStatus;
