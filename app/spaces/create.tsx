import { useState, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateSpace, type UserSpaceMembership } from '@/hooks/useSpaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { useAuthStore } from '@/stores/authStore';
import { pickAndUploadPhoto } from '@/lib/uploadPhoto';
import { useFeatureFlag, FLAGS } from '@/hooks/useFeatureFlags';

export default function CreateSpaceScreen() {
  const useInlineValidation = useFeatureFlag(FLAGS.INLINE_FORM_VALIDATION, false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [department, setDepartment] = useState('');
  const [floor, setFloor] = useState('');
  const [deskNumber, setDeskNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false); // for inline validation: show field errors after first submit attempt
  const [createdSpace, setCreatedSpace] = useState<{ name: string; join_code: string } | null>(null);
  const loadedPhotoUrlRef = useRef<string | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const createSpace = useCreateSpace();
  const { setCurrentSpace } = useSpaceStore();

  const requiredValid =
    name.trim() !== '' &&
    address.trim() !== '' &&
    city.trim() !== '' &&
    state.trim() !== '' &&
    zip.trim() !== '';
  const inlineValidationBlockSubmit = useInlineValidation && !requiredValid;

  const handlePickPhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto();
      loadedPhotoUrlRef.current = null;
      setPhotoUrl(url);
      setImageLoading(true);
    } catch (error) {
      if ((error as Error).message !== 'Cancelled') {
        Alert.alert('Error', (error as Error).message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    setSubmitted(true);

    // When inline validation is ON: block submit and show inline errors until required fields are valid.
    // When inline validation is OFF: always submit; let the API validate (no client-side block).
    if (useInlineValidation) {
      if (
        !name.trim() ||
        !address.trim() ||
        !city.trim() ||
        !state.trim() ||
        !zip.trim()
      ) {
        return;
      }
    }

    try {
      const { space, membership } = await createSpace.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        department: department.trim() || null,
        floor: floor.trim() || null,
        deskNumber: deskNumber.trim() || null,
        photoUrl: photoUrl || undefined,
      });

      const newMembership: UserSpaceMembership = {
        id: membership.id,
        department: membership.department,
        floor: membership.floor,
        desk_number: membership.desk_number,
        role: membership.role as 'employee' | 'admin',
        space,
      };
      queryClient.setQueryData<UserSpaceMembership[]>(
        ['spaces', user?.id],
        (prev) => (prev ? [...prev, newMembership] : [newMembership])
      );
      await queryClient.refetchQueries({ queryKey: ['spaces'] });
      // Always show verification card on success so users get confirmation and "Back to community list" (fixes Scenario 3 bug when flag is on).
      setCreatedSpace({ name: space.name, join_code: space.join_code });
    } catch (error) {
      const message = (error as Error).message;
      setCreateError(message);
      console.error('Create community error:', error);
      Alert.alert('Error', message);
    }
  };

  // After successful create: show verification card, then Back goes to community list
  if (createdSpace) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.successScroll]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Community created</Text>
            <Text style={styles.successMessage}>
              <Text style={styles.successName}>{createdSpace.name}</Text>
              {' '}is set up. Share this code with your coworkers so they can join:
            </Text>
            <View style={styles.joinCodeBox}>
              <Text style={styles.joinCodeText}>{createdSpace.join_code}</Text>
            </View>
            <Button
              title="Back to community list"
              onPress={() => router.replace('/')}
              style={styles.successBackButton}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

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
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Company/Office</Text>
          <Text style={styles.subtitle}>
            Set up a lunch swap community for your workplace
          </Text>
        </View>

        {/* Company Photo */}
        <Text style={styles.label}>Company/Office Photo (Optional)</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickPhoto}
          disabled={uploading}
        >
          {photoUrl ? (
            <View style={styles.photoPreviewContainer}>
              {imageLoading && (
                <View style={styles.photoLoadingOverlay}>
                  <ActivityIndicator size="small" color="#a855f7" />
                </View>
              )}
              <Image
                source={{ uri: photoUrl }}
                style={styles.photoPreview}
                resizeMode="cover"
                onLoadStart={() => {
                  if (loadedPhotoUrlRef.current !== photoUrl) {
                    setImageLoading(true);
                  }
                }}
                onLoadEnd={() => {
                  loadedPhotoUrlRef.current = photoUrl;
                  setImageLoading(false);
                }}
              />
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {uploading ? 'Uploading...' : 'Tap to add photo'}
              </Text>
              <Text style={styles.photoPlaceholderSubtext}>
                Add a photo of your office or company
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Company/Office Name"
          value={name}
          onChangeText={setName}
          placeholder="Acme Corporation"
          error={useInlineValidation && submitted && !name.trim() ? 'Required' : undefined}
        />

        <Input
          label="Street Address"
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main Street"
          error={useInlineValidation && submitted && !address.trim() ? 'Required' : undefined}
        />

        <View style={styles.row}>
          <View style={styles.flex2}>
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Los Angeles"
              error={useInlineValidation && submitted && !city.trim() ? 'Required' : undefined}
            />
          </View>
          <View style={styles.flex1}>
            <Input
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="CA"
              maxLength={2}
              autoCapitalize="characters"
              error={useInlineValidation && submitted && !state.trim() ? 'Required' : undefined}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="ZIP Code"
              value={zip}
              onChangeText={setZip}
              placeholder="90210"
              keyboardType="number-pad"
              maxLength={5}
              error={useInlineValidation && submitted && !zip.trim() ? 'Required' : undefined}
            />
          </View>
          <View style={styles.flex1}>
            <Input
              label="Department (Optional)"
              value={department}
              onChangeText={setDepartment}
              placeholder="Engineering"
            />
          </View>
        </View>

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

        {!useInlineValidation && createError ? (
          <Text style={styles.errorText}>{createError}</Text>
        ) : null}
        <Button
          title="Create Company/Office"
          onPress={handleCreate}
          loading={createSpace.isPending}
          disabled={createSpace.isPending || inlineValidationBlockSubmit}
          style={[
            styles.button,
            useInlineValidation ? styles.buttonNewDesign : styles.buttonOriginal,
          ]}
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
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
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
  label: {
    color: '#e5e7eb',
    fontWeight: '500',
    marginBottom: 8,
  },
  photoButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreviewContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  photoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  photoPlaceholderSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
  },
  // Original design (flag off): baby blue (darker shade so white text is readable)
  buttonOriginal: {
    backgroundColor: '#6BB5E8',
  },
  // New design (flag on): purple — intended to only change color, but the new path broke the success card logic
  buttonNewDesign: {
    backgroundColor: '#a855f7',
  },
  successScroll: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  successCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#e5e7eb',
    lineHeight: 24,
    marginBottom: 16,
  },
  successName: {
    fontWeight: '600',
    color: '#f9fafb',
  },
  joinCodeBox: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  joinCodeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#a855f7',
    letterSpacing: 2,
  },
  successBackButton: {
    marginTop: 0,
  },
});
