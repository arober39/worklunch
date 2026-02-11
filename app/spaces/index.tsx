import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useUserSpaces, UserSpaceMembership } from '@/hooks/useSpaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { Button } from '@/components/Button';
import { Space } from '@/types/database';

export default function SpacesScreen() {
  const { data: memberships, isLoading } = useUserSpaces();
  const { setCurrentSpace } = useSpaceStore();

  const handleSelectSpace = (space: Space) => {
    setCurrentSpace(space);
    router.replace('/');
  };

  const renderSpace = ({ item }: { item: UserSpaceMembership }) => (
    <TouchableOpacity
      style={styles.spaceCard}
      onPress={() => handleSelectSpace(item.space)}
    >
      <Text style={styles.spaceName}>{item.space.name}</Text>
      <Text style={styles.spaceAddress}>
        {item.space.address}, {item.space.city}
      </Text>
      {(item.department || item.floor || item.desk_number) && (
        <Text style={styles.locationInfo}>
          {[item.department, item.floor, item.desk_number].filter(Boolean).join(' • ')}
        </Text>
      )}
      {item.role === 'admin' && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Communities</Text>
        <Text style={styles.subtitle}>
          Select a community or join a new one
        </Text>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : memberships && memberships.length > 0 ? (
        <FlatList
          data={memberships}
          renderItem={renderSpace}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            You haven't joined any communities yet.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Join Community"
          onPress={() => router.push('/spaces/join' as never)}
          style={styles.footerButton}
        />
        <Button
          title="Create Community"
          variant="outline"
          onPress={() => router.push('/spaces/create' as never)}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 64,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  list: {
    paddingHorizontal: 24,
  },
  spaceCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  spaceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  spaceAddress: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  locationInfo: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '500',
  },
  adminBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#581c87',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#e9d5ff',
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  footerButton: {
    marginBottom: 0,
  },
});
