import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePost, useUpdatePostStatus, CATEGORY_LABELS } from '@/hooks/usePosts';
import { useAuthStore } from '@/stores/authStore';
import { usePostProposals, useCreateProposal, useUpdateProposalStatus } from '@/hooks/useProposals';
import { useCreateConversation } from '@/hooks/useMessages';
import { Button } from '@/components/Button';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading } = usePost(id);
  const { user } = useAuthStore();
  const updateStatus = useUpdatePostStatus();
  const { data: proposals } = usePostProposals(id);
  const createProposal = useCreateProposal();
  const updateProposalStatus = useUpdateProposalStatus();
  const createConversation = useCreateConversation();

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalMessage, setProposalMessage] = useState('');

  const isOwner = post?.user_id === user?.id;
  const pendingProposals = proposals?.filter((p) => p.status === 'pending') || [];

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Post',
      'Are you sure you want to remove this lunch from swapping?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                postId: id!,
                status: 'withdrawn',
              });
              router.back();
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleSendProposal = async () => {
    if (!proposalMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      await createProposal.mutateAsync({
        postId: id!,
        message: proposalMessage.trim(),
      });
      setShowProposalModal(false);
      setProposalMessage('');
      Alert.alert('Success', 'Your proposal has been sent!');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleProposalAction = (proposalId: string, proposerId: string, action: 'accepted' | 'rejected') => {
    const actionText = action === 'accepted' ? 'accept' : 'reject';
    Alert.alert(
      `${action === 'accepted' ? 'Accept' : 'Reject'} Proposal`,
      `Are you sure you want to ${actionText} this proposal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accepted' ? 'Accept' : 'Reject',
          style: action === 'accepted' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateProposalStatus.mutateAsync({
                proposalId,
                status: action,
              });
              if (action === 'accepted') {
                // Mark post as traded when a proposal is accepted
                await updateStatus.mutateAsync({
                  postId: id!,
                  status: 'traded',
                });
                // Create a conversation for the trade
                await createConversation.mutateAsync({
                  proposalId,
                  postId: id!,
                  postOwnerId: user!.id,
                  proposerId,
                });
                Alert.alert(
                  'Proposal Accepted!',
                  'A conversation has been started. Go to Messages to chat about the swap.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Image source={{ uri: post.photo_url }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {CATEGORY_LABELS[post.category]}
          </Text>
        </View>

        <Text style={styles.title}>{post.title}</Text>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>Posted by {post.user.name}</Text>
          <Text style={styles.date}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.descriptionLabel}>Description</Text>
        <Text style={styles.description}>{post.description}</Text>

        {post.status !== 'active' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {post.status === 'traded' ? 'Already Swapped' : 'Withdrawn'}
            </Text>
          </View>
        )}

        {isOwner ? (
          <View style={styles.ownerActions}>
            <Text style={styles.ownerLabel}>This is your post</Text>
            {post.status === 'active' && (
              <Button
                title="Withdraw Post"
                variant="outline"
                onPress={handleWithdraw}
                loading={updateStatus.isPending}
              />
            )}

            {/* Proposals Section */}
            {pendingProposals.length > 0 && (
              <View style={styles.proposalsSection}>
                <Text style={styles.proposalsTitle}>
                  Proposals ({pendingProposals.length})
                </Text>
                {pendingProposals.map((proposal) => (
                  <View key={proposal.id} style={styles.proposalCard}>
                    <Text style={styles.proposerName}>
                      {proposal.proposer.username || proposal.proposer.name}
                    </Text>
                    <Text style={styles.proposalMessage}>{proposal.message}</Text>
                    <Text style={styles.proposalDate}>
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </Text>
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleProposalAction(proposal.id, proposal.proposer_id, 'accepted')}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleProposalAction(proposal.id, proposal.proposer_id, 'rejected')}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          post.status === 'active' && (
            <Button
              title="Make an Offer"
              onPress={() => setShowProposalModal(true)}
            />
          )
        )}
      </View>

      {/* Proposal Modal */}
      <Modal
        visible={showProposalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProposalModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make an Offer</Text>
            <Text style={styles.modalSubtitle}>
              Tell {post.user.name} what you'd like to swap for this lunch
            </Text>

            <TextInput
              style={styles.proposalInput}
              placeholder="I'd like to swap my..."
              placeholderTextColor="#6b7280"
              value={proposalMessage}
              onChangeText={setProposalMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowProposalModal(false);
                  setProposalMessage('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendProposal}
                disabled={createProposal.isPending}
              >
                <Text style={styles.sendButtonText}>
                  {createProposal.isPending ? 'Sending...' : 'Send Offer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
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
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '500',
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#374151',
  },
  content: {
    padding: 24,
  },
  categoryBadge: {
    backgroundColor: '#581c87',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#e9d5ff',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  userName: {
    fontSize: 14,
    color: '#9ca3af',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#e5e7eb',
    lineHeight: 24,
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: '#78350f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    color: '#fcd34d',
    textAlign: 'center',
    fontWeight: '500',
  },
  ownerActions: {
    marginTop: 8,
  },
  ownerLabel: {
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
  proposalsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  proposalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 16,
  },
  proposalCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  proposerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  proposalMessage: {
    fontSize: 14,
    color: '#e5e7eb',
    lineHeight: 20,
    marginBottom: 8,
  },
  proposalDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#9333ea',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  proposalInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f9fafb',
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#9333ea',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
