import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  Platform,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useUserSpaces, useDeleteSpace } from '@/hooks/useSpaces';
import { usePosts, CATEGORIES, CATEGORY_LABELS } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useFeatureFlag, FLAGS } from '@/hooks/useFeatureFlags';
import { Button } from '@/components/Button';
import { PostCard } from '@/components/PostCard';
import { PostCategory } from '@/types/database';

export default function Index() {
  const { isLoading: authLoading, user } = useAuthStore();
  const { currentSpace, setCurrentSpace } = useSpaceStore();
  const { signOut } = useAuth();
  const { data: memberships, isLoading: spacesLoading } = useUserSpaces();
  const { data: posts, isLoading: postsLoading } = usePosts(currentSpace?.id);
  const { data: profile } = useProfile();
  const deleteSpace = useDeleteSpace();
  const [copied, setCopied] = useState(false);
  const useFiltersAtBottom = useFeatureFlag(FLAGS.NEW_FILTER_LOCATION, false);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    let result = [...posts];
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (sortOrder === 'oldest') {
      result.reverse();
    }
    return result;
  }, [posts, selectedCategory, sortOrder]);

  const categoryLabel = selectedCategory === 'all' ? 'All' : CATEGORY_LABELS[selectedCategory];

  const openCategoryFilter = () => {
    setShowSortDropdown(false);
    setShowCategoryDropdown((prev) => !prev);
  };

  const selectCategory = (cat: PostCategory | 'all') => {
    setSelectedCategory(cat);
    setShowCategoryDropdown(false);
  };

  const openSortMenu = () => {
    setShowCategoryDropdown(false);
    setShowSortDropdown((prev) => !prev);
  };

  const selectSort = (order: 'newest' | 'oldest') => {
    setSortOrder(order);
    setShowSortDropdown(false);
  };

  const handleDeleteCommunity = (spaceId: string) => {
    (async () => {
      try {
        await deleteSpace.mutateAsync(spaceId);
        if (currentSpace?.id === spaceId) {
          setCurrentSpace(null);
        }
      } catch (error) {
        Alert.alert('Error', (error as Error).message);
      }
    })();
  };

  const handleCopyCode = async () => {
    if (currentSpace?.join_code) {
      await Clipboard.setStringAsync(currentSpace.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    setCurrentSpace(null);
    await signOut();
    // Navigation is handled by the useEffect that watches auth state
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, user]);


  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  // No space selected - show community selection (and loading state while spaces load)
  if (!currentSpace) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.communityScrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.username}>{profile?.username || profile?.name || 'Luncher'}</Text>
            </View>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>WL</Text>
            </View>
          </View>

          {spacesLoading ? (
            <View style={styles.communitiesSection}>
              <Text style={styles.sectionTitle}>Your Communities</Text>
              <View style={styles.communityListLoading}>
                <ActivityIndicator size="small" color="#a855f7" />
                <Text style={styles.communityListLoadingText}>Loading communities…</Text>
              </View>
            </View>
          ) : memberships && memberships.length > 0 ? (
            <View style={styles.communitiesSection}>
              <Text style={styles.sectionTitle}>Your Communities</Text>
              {memberships.map((membership) => (
                <View key={membership.id} style={styles.communityCard}>
                  <TouchableOpacity
                    style={styles.communityMain}
                    onPress={() => setCurrentSpace(membership.space)}
                  >
                    {membership.space.photo_url ? (
                      <Image
                        source={{ uri: membership.space.photo_url }}
                        style={styles.communityPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.communityPhotoPlaceholder}>
                        <Text style={styles.communityPhotoPlaceholderText}>
                          {membership.space.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.communityInfo}>
                      <Text style={styles.communityName}>{membership.space.name}</Text>
                      <Text style={styles.communityAddress}>
                        {membership.space.address}, {membership.space.city}
                      </Text>
                      {membership.role === 'admin' && (
                        <Text style={styles.adminLabel}>Admin</Text>
                      )}
                    </View>
                    <Text style={styles.communityArrow}>→</Text>
                  </TouchableOpacity>
                  {membership.role === 'admin' && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push(`/spaces/edit?id=${membership.space.id}` as never)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <Pressable
                        style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                        onPress={() => handleDeleteCommunity(membership.space.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Join a Community</Text>
              <Text style={styles.emptyText}>
                You need to join or create a community to start swapping lunches
                with your coworkers.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              title="Join Community"
              onPress={() => router.push('/spaces/join' as never)}
              style={styles.button}
            />
            <Button
              title="Create Community"
              variant="outline"
              onPress={() => router.push('/spaces/create' as never)}
              style={styles.button}
            />
            <Button
              title="Sign Out"
              variant="secondary"
              onPress={handleSignOut}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => setCurrentSpace(null)}>
            <Text style={styles.backLink}>← Communities</Text>
          </TouchableOpacity>
          <Text style={styles.communityTitle}>{currentSpace?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSignOut}
        >
          <Text style={styles.settingsButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Join Code */}
      <TouchableOpacity onPress={handleCopyCode} style={styles.joinCodeButton}>
        <Text style={styles.joinCodeLabel}>Share Code:</Text>
        <Text style={styles.joinCode}>{currentSpace?.join_code}</Text>
        <Text style={styles.copyHint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/proposals' as never)}
        >
          <Text style={styles.quickActionText}>Proposals</Text>
          <Text style={styles.quickActionArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/messages' as never)}
        >
          <Text style={styles.quickActionText}>Messages</Text>
          <Text style={styles.quickActionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Trade History Link */}
      <TouchableOpacity
        style={styles.tradeHistoryButton}
        onPress={() => router.push('/trades' as never)}
      >
        <Text style={styles.tradeHistoryText}>View Trade History</Text>
        <Text style={styles.quickActionArrow}>→</Text>
      </TouchableOpacity>

      {/* Posts Feed */}
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Lunches for Swap</Text>
        <TouchableOpacity
          onPress={() => router.push('/posts/create' as never)}
        >
          <Text style={styles.addButton}>+ Add Lunch</Text>
        </TouchableOpacity>
      </View>

      {postsLoading ? (
        <View style={styles.feedLoading}>
          <ActivityIndicator size="small" color="#a855f7" />
        </View>
      ) : posts && posts.length > 0 ? (
        <>
          {/* Flag OFF: filters at top (original position) */}
          {!useFiltersAtBottom && (
            <View>
              <View style={styles.filterBar}>
                <TouchableOpacity style={[styles.filterButton, showCategoryDropdown && styles.filterButtonActive]} onPress={openCategoryFilter}>
                  <Text style={styles.filterButtonText}>Category: {categoryLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterButton, showSortDropdown && styles.filterButtonActive]} onPress={openSortMenu}>
                  <Text style={styles.filterButtonText}>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
                </TouchableOpacity>
              </View>
              {showCategoryDropdown && (
                <View style={styles.dropdown}>
                  <TouchableOpacity style={[styles.dropdownItem, selectedCategory === 'all' && styles.dropdownItemActive]} onPress={() => selectCategory('all')}>
                    <Text style={[styles.dropdownItemText, selectedCategory === 'all' && styles.dropdownItemTextActive]}>All</Text>
                  </TouchableOpacity>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat} style={[styles.dropdownItem, selectedCategory === cat && styles.dropdownItemActive]} onPress={() => selectCategory(cat)}>
                      <Text style={[styles.dropdownItemText, selectedCategory === cat && styles.dropdownItemTextActive]}>{CATEGORY_LABELS[cat]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showSortDropdown && (
                <View style={styles.dropdown}>
                  <TouchableOpacity style={[styles.dropdownItem, sortOrder === 'newest' && styles.dropdownItemActive]} onPress={() => selectSort('newest')}>
                    <Text style={[styles.dropdownItemText, sortOrder === 'newest' && styles.dropdownItemTextActive]}>Newest First</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dropdownItem, sortOrder === 'oldest' && styles.dropdownItemActive]} onPress={() => selectSort('oldest')}>
                    <Text style={[styles.dropdownItemText, sortOrder === 'oldest' && styles.dropdownItemTextActive]}>Oldest First</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          <FlatList
            data={filteredPosts}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onPress={() => router.push(`/posts/${item.id}` as never)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              useFiltersAtBottom ? (
                /* Flag ON: same filter bar, moved to bottom — users expect it at top */
                <View>
                  <View style={styles.filterBar}>
                    <TouchableOpacity style={[styles.filterButton, showCategoryDropdown && styles.filterButtonActive]} onPress={openCategoryFilter}>
                      <Text style={styles.filterButtonText}>Category: {categoryLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterButton, showSortDropdown && styles.filterButtonActive]} onPress={openSortMenu}>
                      <Text style={styles.filterButtonText}>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
                    </TouchableOpacity>
                  </View>
                  {showCategoryDropdown && (
                    <View style={styles.dropdown}>
                      <TouchableOpacity style={[styles.dropdownItem, selectedCategory === 'all' && styles.dropdownItemActive]} onPress={() => selectCategory('all')}>
                        <Text style={[styles.dropdownItemText, selectedCategory === 'all' && styles.dropdownItemTextActive]}>All</Text>
                      </TouchableOpacity>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity key={cat} style={[styles.dropdownItem, selectedCategory === cat && styles.dropdownItemActive]} onPress={() => selectCategory(cat)}>
                          <Text style={[styles.dropdownItemText, selectedCategory === cat && styles.dropdownItemTextActive]}>{CATEGORY_LABELS[cat]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {showSortDropdown && (
                    <View style={styles.dropdown}>
                      <TouchableOpacity style={[styles.dropdownItem, sortOrder === 'newest' && styles.dropdownItemActive]} onPress={() => selectSort('newest')}>
                        <Text style={[styles.dropdownItemText, sortOrder === 'newest' && styles.dropdownItemTextActive]}>Newest First</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dropdownItem, sortOrder === 'oldest' && styles.dropdownItemActive]} onPress={() => selectSort('oldest')}>
                        <Text style={[styles.dropdownItemText, sortOrder === 'oldest' && styles.dropdownItemTextActive]}>Oldest First</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null
            }
          />
        </>
      ) : (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedTitle}>No lunches yet</Text>
          <Text style={styles.emptyFeedText}>
            Be the first to post a lunch for swapping!
          </Text>
          <Button
            title="Post a Lunch"
            onPress={() => router.push('/posts/create' as never)}
            style={styles.emptyFeedButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  communityScrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#9333ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backLink: {
    fontSize: 14,
    color: '#a855f7',
    marginBottom: 4,
  },
  communityTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  settingsButton: {
    paddingVertical: 8,
  },
  settingsButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  joinCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#581c87',
    marginHorizontal: 24,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  joinCodeLabel: {
    fontSize: 14,
    color: '#e9d5ff',
  },
  joinCode: {
    fontSize: 16,
    color: '#a855f7',
    fontWeight: '700',
    flex: 1,
  },
  copyHint: {
    fontSize: 12,
    color: '#c4b5fd',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    padding: 14,
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
  quickActionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f9fafb',
  },
  quickActionArrow: {
    fontSize: 16,
    color: '#a855f7',
    fontWeight: '600',
  },
  tradeHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#581c87',
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  tradeHistoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e9d5ff',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  addButton: {
    fontSize: 16,
    color: '#a855f7',
    fontWeight: '600',
  },
  feedLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyFeed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyFeedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  emptyFeedText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyFeedButton: {
    minWidth: 200,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  communitiesSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 16,
  },
  communityListLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  communityListLoadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  communityCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 12,
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
    overflow: 'hidden',
  },
  communityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  communityPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  communityPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#581c87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityPhotoPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#e9d5ff',
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  communityAddress: {
    fontSize: 14,
    color: '#9ca3af',
  },
  adminLabel: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '500',
    marginTop: 4,
  },
  communityArrow: {
    fontSize: 20,
    color: '#a855f7',
    fontWeight: '600',
  },
  adminActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  editButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  editButtonText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: '#a855f7',
    backgroundColor: '#2d1b4e',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  dropdown: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dropdownItemActive: {
    backgroundColor: '#581c87',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  dropdownItemTextActive: {
    color: '#e9d5ff',
    fontWeight: '600',
  },
});
