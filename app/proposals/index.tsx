import { useState } from 'react';
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
import { useIncomingProposals, useMyProposals } from '@/hooks/useProposals';

type Tab = 'incoming' | 'outgoing';

export default function ProposalsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('incoming');
  const { data: incomingProposals, isLoading: incomingLoading } = useIncomingProposals();
  const { data: outgoingProposals, isLoading: outgoingLoading } = useMyProposals();

  const isLoading = activeTab === 'incoming' ? incomingLoading : outgoingLoading;
  const proposals = activeTab === 'incoming' ? incomingProposals : outgoingProposals;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#a855f7';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Proposals</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
          {incomingProposals && incomingProposals.filter(p => p.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {incomingProposals.filter(p => p.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
            Outgoing
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : proposals && proposals.length > 0 ? (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.proposalCard}
              onPress={() => router.push(`/posts/${item.post_id}` as never)}
            >
              <Image
                source={{ uri: activeTab === 'incoming' ? item.post.photo_url : item.post.photo_url }}
                style={styles.postImage}
              />
              <View style={styles.proposalContent}>
                <Text style={styles.postTitle} numberOfLines={1}>
                  {activeTab === 'incoming' ? item.post.title : item.post.title}
                </Text>
                <Text style={styles.proposalMessage} numberOfLines={2}>
                  {item.message}
                </Text>
                <View style={styles.proposalMeta}>
                  <Text style={styles.proposalFrom}>
                    {activeTab === 'incoming'
                      ? `From: ${item.proposer.username || item.proposer.name}`
                      : `To: ${item.post_owner.username || item.post_owner.name}`}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {activeTab === 'incoming' ? 'No incoming proposals' : 'No outgoing proposals'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'incoming'
              ? "When someone makes an offer on your lunch, it will appear here."
              : "When you make an offer on a lunch, it will appear here."}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#9333ea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  proposalCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
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
    width: 80,
    height: 80,
    backgroundColor: '#374151',
  },
  proposalContent: {
    flex: 1,
    padding: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  proposalMessage: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    lineHeight: 18,
  },
  proposalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposalFrom: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
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
