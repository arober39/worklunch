import { useState, useEffect, useRef } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useUpdateSpace, useUserSpaces } from '@/hooks/useSpaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { pickAndUploadPhoto } from '@/lib/uploadPhoto';

export default function EditSpaceScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const { data: memberships } = useUserSpaces();
  const updateSpace = useUpdateSpace();
  const { setCurrentSpace } = useSpaceStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const membership = memberships?.find((m) => m.space.id === id);
  const space = membership?.space;

  const initializedIdRef = useRef<string | null>(null);

  // Initialize form once when we have space for this id; use stable primitives only to avoid update loop
  useEffect(() => {
    if (!id) return;
    const currentSpace = memberships?.find((m) => m.space.id === id)?.space;
    if (!currentSpace) return;
    if (initializedIdRef.current === id) return;
    initializedIdRef.current = id;
    setName(currentSpace.name);
    setAddress(currentSpace.address);
    setCity(currentSpace.city);
    setState(currentSpace.state);
    setZip(currentSpace.zip);
    setPhotoUrl(currentSpace.photo_url || null);
  }, [id, memberships?.length]);

  const handlePickPhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto();
      setPhotoUrl(url);
    } catch (error) {
      if ((error as Error).message !== 'Cancelled') {
        Alert.alert('Error', (error as Error).message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id) return;

    if (
      !name.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zip.trim()
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const updatedSpace = await updateSpace.mutateAsync({
        spaceId: id,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        photoUrl: photoUrl,
      });

      setCurrentSpace(updatedSpace);

      Alert.alert('Success', 'Community updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  if (!space) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
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
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Edit Community</Text>
          <Text style={styles.subtitle}>
            Update your community details
          </Text>
        </View>

        {/* Community Photo */}
        <Text style={styles.label}>Community Photo</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickPhoto}
          disabled={uploading}
        >
          {photoUrl ? (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: photoUrl }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <View style={styles.changePhotoOverlay}>
                <Text style={styles.changePhotoText}>Tap to change</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {uploading ? 'Uploading...' : 'Tap to add photo'}
              </Text>
              <Text style={styles.photoPlaceholderSubtext}>
                Add a photo of your building or community
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Community Name"
          value={name}
          onChangeText={setName}
          placeholder="Sunset Apartments"
        />

        <Input
          label="Street Address"
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main Street"
        />

        <View style={styles.row}>
          <View style={styles.flex2}>
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Los Angeles"
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
            />
          </View>
        </View>

        <Input
          label="ZIP Code"
          value={zip}
          onChangeText={setZip}
          placeholder="90210"
          keyboardType="number-pad"
          maxLength={5}
        />

        <Button
          title="Save Changes"
          onPress={handleUpdate}
          loading={updateSpace.isPending}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
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
  button: {
    marginTop: 16,
  },
});
