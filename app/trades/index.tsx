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
import { useTradeHistory } from '@/hooks/useMeetups';
import { useAuthStore } from '@/stores/authStore';

export default function TradeHistoryScreen() {
  const { data: trades, isLoading } = useTradeHistory();
  const { user } = useAuthStore();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Swap History</Text>
      <Text style={styles.subtitle}>Your completed lunch swaps</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : trades && trades.length > 0 ? (
        <FlatList
          data={trades}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isLunchOwner = item.lunch_owner_id === user?.id;
            const otherParty = isLunchOwner ? item.lunch_swapper : item.lunch_owner;

            return (
              <View style={styles.tradeCard}>
                <Image
                  source={{ uri: item.post.photo_url }}
                  style={styles.postImage}
                />
                <View style={styles.tradeContent}>
                  <Text style={styles.postTitle} numberOfLines={1}>
                    {item.post.title}
                  </Text>
                  <Text style={styles.tradeType}>
                    {isLunchOwner ? 'Swapped with' : 'Received from'}{' '}
                    <Text style={styles.userName}>
                      {otherParty.username || otherParty.name}
                    </Text>
                  </Text>
                  <Text style={styles.tradeDate}>
                    {formatDate(item.completed_at)}
                  </Text>
                </View>
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✓</Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No swaps yet</Text>
          <Text style={styles.emptyText}>
            When you complete a lunch swap with a coworker, it will appear here.
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
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
  tradeCard: {
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
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  tradeContent: {
    flex: 1,
    marginLeft: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  tradeType: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  userName: {
    fontWeight: '500',
    color: '#e5e7eb',
  },
  tradeDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#581c87',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  completedText: {
    color: '#e9d5ff',
    fontWeight: 'bold',
    fontSize: 14,
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
