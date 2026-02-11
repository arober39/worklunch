import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useJoinSpace } from '@/hooks/useSpaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { useFeatureFlag, FLAGS } from '@/hooks/useFeatureFlags';

export default function JoinSpaceScreen() {
  const [joinCode, setJoinCode] = useState('');
  const [department, setDepartment] = useState('');
  const [floor, setFloor] = useState('');
  const [deskNumber, setDeskNumber] = useState('');

  const joinSpace = useJoinSpace();
  const { setCurrentSpace } = useSpaceStore();

  // Feature flag: controls which join flow to use
  const useNewJoinFlow = useFeatureFlag(FLAGS.JOIN_COMMUNITY_REDESIGN, false);
  console.log('[join-community-redesign] flag value:', useNewJoinFlow);
  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      const result = await joinSpace.mutateAsync({
        joinCode: joinCode.trim(),
        department: department.trim() || null,
        floor: floor.trim() || null,
        deskNumber: deskNumber.trim() || null,
      });

      if (useNewJoinFlow) {
        // NEW CODE PATH (has a bug - doesn't handle pending_approval!)
        // This is the "streamlined" flow that assumes success = joined
        // BUG: When status is 'pending_approval', nothing happens - no feedback to user
        // This causes rage clicks as users keep tapping the button
        if (result.status === 'joined') {
          setCurrentSpace(result.space);
          Alert.alert('Welcome!', `You've joined ${result.space.name}`, [
            { text: 'OK', onPress: () => router.replace('/') },
          ]);
        }
        // BUG: Missing else clause for 'pending_approval' status!
        // The button finishes loading but user sees nothing
      } else {
        // OLD CODE PATH (handles all states correctly)
        if (result.status === 'pending_approval') {
          Alert.alert(
            'Request Submitted',
            `Your request to join ${result.space.name} has been sent to the community admin for approval.`,
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
        } else {
          setCurrentSpace(result.space);
          Alert.alert('Welcome!', `You've joined ${result.space.name}`, [
            { text: 'OK', onPress: () => router.replace('/') },
          ]);
        }
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Join Company/Office</Text>
          <Text style={styles.subtitle}>
            Enter the code shared by your coworker
          </Text>
        </View>

        <Input
          label="Join Code"
          value={joinCode}
          onChangeText={(text) => setJoinCode(text.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          maxLength={6}
        />

        <Input
          label="Department (Optional)"
          value={department}
          onChangeText={setDepartment}
          placeholder="Engineering"
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="Floor (Optional)"
              value={floor}
              onChangeText={setFloor}
              placeholder="3"
            />
          </View>
          <View style={styles.flex1}>
            <Input
              label="Desk # (Optional)"
              value={deskNumber}
              onChangeText={setDeskNumber}
              placeholder="A-12"
            />
          </View>
        </View>

        <Button
          title="Join Company/Office"
          onPress={handleJoin}
          loading={joinSpace.isPending}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 32,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  button: {
    marginTop: 16,
  },
});
