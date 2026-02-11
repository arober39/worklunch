import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMessages, useSendMessage, useConversations } from '@/hooks/useMessages';
import { useMeetup, useCreateMeetup, useConfirmMeetup, useCompleteTrade } from '@/hooks/useMeetups';
import { useAuthStore } from '@/stores/authStore';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { data: messages, isLoading } = useMessages(id);
  const { data: conversations } = useConversations();
  const { data: meetup } = useMeetup(id);
  const sendMessage = useSendMessage();
  const createMeetup = useCreateMeetup();
  const confirmMeetup = useConfirmMeetup();
  const completeTrade = useCompleteTrade();

  const [messageText, setMessageText] = useState('');
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupDate, setMeetupDate] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [meetupNotes, setMeetupNotes] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations?.find((c) => c.id === id);
  const isParticipant1 = conversation?.participant1_id === user?.id;

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !id) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      await sendMessage.mutateAsync({
        conversationId: id,
        content: text,
      });
    } catch (error) {
      setMessageText(text); // Restore message if send failed
    }
  };

  const handleCreateMeetup = async () => {
    if (!meetupLocation.trim() || !meetupDate || !meetupTime || !id) {
      Alert.alert('Error', 'Please fill in location, date, and time');
      return;
    }

    try {
      const scheduledAt = new Date(`${meetupDate}T${meetupTime}`);
      if (isNaN(scheduledAt.getTime())) {
        Alert.alert('Error', 'Invalid date or time format');
        return;
      }

      await createMeetup.mutateAsync({
        conversationId: id,
        location: meetupLocation.trim(),
        scheduledAt,
        notes: meetupNotes.trim() || undefined,
      });

      setShowMeetupModal(false);
      setMeetupLocation('');
      setMeetupDate('');
      setMeetupTime('');
      setMeetupNotes('');
      Alert.alert('Success', 'Meetup scheduled! Waiting for confirmation.');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleConfirmMeetup = async () => {
    if (!meetup || !id) return;

    try {
      await confirmMeetup.mutateAsync({
        meetupId: meetup.id,
        conversationId: id,
        isParticipant1: isParticipant1,
      });
      Alert.alert('Confirmed', 'You have confirmed the meetup!');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleCompleteTrade = async () => {
    if (!meetup || !id || !conversation) return;

    Alert.alert(
      'Complete Trade',
      'Mark this trade as completed? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeTrade.mutateAsync({
                meetupId: meetup.id,
                conversationId: id,
                postId: conversation.post.id,
                sellerId: conversation.participant1_id,
                buyerId: conversation.participant2_id,
              });
              Alert.alert('Success', 'Trade completed! Check your trade history.');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const hasUserConfirmed = meetup
    ? isParticipant1
      ? meetup.confirmed_by_participant1
      : meetup.confirmed_by_participant2
    : false;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  const flatMessages = Object.entries(groupedMessages || {}).flatMap(([date, msgs]) => [
    { type: 'date', date, id: `date-${date}` },
    ...(msgs?.map((m) => ({ type: 'message', ...m })) || []),
  ]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {conversation?.otherUser.username || conversation?.otherUser.name || 'Chat'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {conversation?.post.title}
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* Meetup Card */}
      {meetup ? (
        <View style={styles.meetupCard}>
          <View style={styles.meetupHeader}>
            <Text style={styles.meetupTitle}>Meetup Scheduled</Text>
            <View style={[styles.meetupStatus, meetup.status === 'confirmed' && styles.meetupStatusConfirmed, meetup.status === 'completed' && styles.meetupStatusCompleted]}>
              <Text style={[styles.meetupStatusText, (meetup.status === 'confirmed' || meetup.status === 'completed') && styles.meetupStatusTextLight]}>
                {meetup.status === 'pending' ? 'Awaiting Confirmation' : meetup.status === 'confirmed' ? 'Confirmed' : 'Completed'}
              </Text>
            </View>
          </View>
          <Text style={styles.meetupLocation}>{meetup.location}</Text>
          <Text style={styles.meetupTime}>
            {new Date(meetup.scheduled_at).toLocaleDateString()} at {new Date(meetup.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {meetup.notes && <Text style={styles.meetupNotes}>{meetup.notes}</Text>}

          {meetup.status === 'pending' && !hasUserConfirmed && (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmMeetup}>
              <Text style={styles.confirmButtonText}>Confirm Meetup</Text>
            </TouchableOpacity>
          )}
          {meetup.status === 'pending' && hasUserConfirmed && (
            <Text style={styles.waitingText}>Waiting for other party to confirm...</Text>
          )}
          {meetup.status === 'confirmed' && (
            <TouchableOpacity style={styles.completeButton} onPress={handleCompleteTrade}>
              <Text style={styles.completeButtonText}>Mark Trade Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.scheduleMeetupButton} onPress={() => setShowMeetupModal(true)}>
          <Text style={styles.scheduleMeetupText}>Schedule Meetup</Text>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={flatMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            );
          }

          const isMe = item.sender_id === user?.id;
          return (
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          );
        }}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#6b7280"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sendMessage.isPending}
        >
          <Text style={styles.sendButtonText}>
            {sendMessage.isPending ? '...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Meetup Modal */}
      <Modal
        visible={showMeetupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMeetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Meetup</Text>
            <Text style={styles.modalSubtitle}>Set a time and place to exchange items</Text>

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Lobby, Building entrance"
              placeholderTextColor="#6b7280"
              value={meetupLocation}
              onChangeText={setMeetupLocation}
            />

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2024-12-25"
              placeholderTextColor="#6b7280"
              value={meetupDate}
              onChangeText={setMeetupDate}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.inputLabel}>Time (HH:MM)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="14:00"
              placeholderTextColor="#6b7280"
              value={meetupTime}
              onChangeText={setMeetupTime}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.notesInput]}
              placeholder="Any additional details..."
              placeholderTextColor="#6b7280"
              value={meetupNotes}
              onChangeText={setMeetupNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMeetupModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createMeetupButton}
                onPress={handleCreateMeetup}
                disabled={createMeetup.isPending}
              >
                <Text style={styles.createMeetupButtonText}>
                  {createMeetup.isPending ? 'Creating...' : 'Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButtonText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '500',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#9333ea',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  messageText: {
    fontSize: 16,
    color: '#f9fafb',
    lineHeight: 22,
  },
  myMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#f9fafb',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#9333ea',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  meetupCard: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  meetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  meetupStatus: {
    backgroundColor: '#78350f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  meetupStatusConfirmed: {
    backgroundColor: '#9333ea',
  },
  meetupStatusCompleted: {
    backgroundColor: '#4b5563',
  },
  meetupStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fcd34d',
  },
  meetupStatusTextLight: {
    color: '#ffffff',
  },
  meetupLocation: {
    fontSize: 15,
    color: '#e5e7eb',
    marginBottom: 4,
  },
  meetupTime: {
    fontSize: 14,
    color: '#9ca3af',
  },
  meetupNotes: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: '#9333ea',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  waitingText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  completeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  completeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scheduleMeetupButton: {
    backgroundColor: '#581c87',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9333ea',
    borderStyle: 'dashed',
  },
  scheduleMeetupText: {
    color: '#e9d5ff',
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#f9fafb',
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 16,
  },
  createMeetupButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#9333ea',
  },
  createMeetupButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
