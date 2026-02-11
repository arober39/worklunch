import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useConversations } from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/authStore';

export default function ConversationsScreen() {
  const { data: conversations, isLoading } = useConversations();
  const { user } = useAuthStore();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Messages</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => router.push(`/messages/${item.id}` as never)}
            >
              <Image
                source={{ uri: item.post.photo_url }}
                style={styles.postImage}
              />
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.otherUser.username || item.otherUser.name}
                  </Text>
                  {item.lastMessage && (
                    <Text style={styles.timeText}>
                      {formatTime(item.lastMessage.created_at)}
                    </Text>
                  )}
                </View>
                <Text style={styles.postTitle} numberOfLines={1}>
                  Re: {item.post.title}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                    {item.lastMessage.content}
                  </Text>
                )}
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            When you accept a proposal or have one accepted, you can chat here to
            arrange the trade.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 60,
  },
  backButton: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
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
  postImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  postTitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  unreadBadge: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
