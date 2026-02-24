import { useState, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActionSheetIOS,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SuggestedMatchCard } from '@/components/SuggestedMatchCard';
import { useCreatePost, usePosts, CATEGORIES, CATEGORY_LABELS } from '@/hooks/usePosts';
import { useSpaceStore } from '@/stores/spaceStore';
import { useFeatureFlag, FLAGS } from '@/hooks/useFeatureFlags';
import { useProfile } from '@/hooks/useProfile';
import { useAISuggest, MatchedPost } from '@/hooks/useAISuggest';
import { pickAndUploadPhoto, takeAndUploadPhoto } from '@/lib/uploadPhoto';
import { PostCategory } from '@/types/database';

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [suggestedMatches, setSuggestedMatches] = useState<MatchedPost[]>([]);
  const loadedPhotoUrlRef = useRef<string | null>(null);

  const { currentSpace } = useSpaceStore();
  const createPost = useCreatePost();
  const aiSuggestEnabled = useFeatureFlag(FLAGS.AI_SUGGEST_ENABLED);
  const { data: profile } = useProfile();
  const { data: activePosts } = usePosts(currentSpace?.id);
  const aiSuggest = useAISuggest();

  const handleAISuggest = () => {
    if (!title.trim()) return;

    aiSuggest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        dietary_preferences: profile?.dietary_preferences || undefined,
        allergies: profile?.allergies || undefined,
        active_posts: (activePosts || []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          user_name: p.user.name,
        })),
        ai_suggest_flag_value: aiSuggestEnabled,
      },
      {
        onSuccess: (data) => {
          setDescription(data.suggested_description);
          setSuggestedMatches(data.matched_posts);
        },
        onError: (error) => {
          Alert.alert('AI Suggest Error', (error as Error).message);
        },
      }
    );
  };

  const handleSelectPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handleTakePhoto();
          } else if (buttonIndex === 2) {
            await handlePickPhoto();
          }
        }
      );
    } else {
      // For Android, default to library
      handlePickPhoto();
    }
  };

  const handlePickPhoto = async () => {
    setUploading(true);
    setImageError(false);
    try {
      const url = await pickAndUploadPhoto();
      console.log('Photo uploaded, URL:', url);
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

  const handleTakePhoto = async () => {
    setUploading(true);
    setImageError(false);
    try {
      const url = await takeAndUploadPhoto();
      console.log('Photo uploaded, URL:', url);
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
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!photoUrl) {
      Alert.alert('Error', 'Please add a photo');
      return;
    }
    if (!currentSpace) {
      Alert.alert('Error', 'No community selected');
      return;
    }

    try {
      await createPost.mutateAsync({
        spaceId: currentSpace.id,
        title: title.trim(),
        description: description.trim(),
        category,
        photoUrl,
      });

      router.back();
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Post</Text>
          <Text style={styles.subtitle}>Share your lunch for swapping</Text>
        </View>

        {/* Photo */}
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handleSelectPhoto}
          disabled={uploading}
        >
          {photoUrl && !imageError ? (
            <View style={styles.photoPreviewContainer}>
              {imageLoading && (
                <View style={styles.photoLoadingOverlay}>
                  <ActivityIndicator size="small" color="#a855f7" />
                  <Text style={[styles.photoPlaceholderText, { marginTop: 8 }]}>Loading preview...</Text>
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
                onError={(e) => {
                  console.log('Image load error:', e.nativeEvent.error);
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </View>
          ) : imageError ? (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                Failed to load preview
              </Text>
              <Text style={styles.photoPlaceholderSubtext}>
                Tap to try again
              </Text>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {uploading ? 'Uploading...' : 'Tap to add photo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="What's for lunch?"
        />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your lunch, any dietary info, what you'd like to swap for..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        {/* AI Suggest Button */}
        {aiSuggestEnabled && (
          <Button
            title="AI Suggest"
            variant="outline"
            onPress={handleAISuggest}
            loading={aiSuggest.isPending}
            disabled={!title.trim()}
            style={styles.aiSuggestButton}
          />
        )}

        {/* Category Selection */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonSelected,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat && styles.categoryButtonTextSelected,
                ]}
              >
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Suggested Matches */}
        {suggestedMatches.length > 0 && (
          <View style={styles.matchesSection}>
            <Text style={styles.matchesLabel}>Suggested Swaps</Text>
            <FlatList
              data={suggestedMatches}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.post_id}
              renderItem={({ item }) => (
                <SuggestedMatchCard
                  title={item.title}
                  reason={item.reason}
                  onPress={() => router.push(`/posts/${item.post_id}`)}
                />
              )}
            />
          </View>
        )}

        <Button
          title="Post Lunch"
          onPress={handleCreate}
          loading={createPost.isPending}
          style={styles.submitButton}
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
  photoButton: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreviewContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#374151',
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
    height: 200,
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
  label: {
    color: '#e5e7eb',
    fontWeight: '500',
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  aiSuggestButton: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#374151',
  },
  categoryButtonSelected: {
    backgroundColor: '#9333ea',
  },
  categoryButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#ffffff',
  },
  matchesSection: {
    marginBottom: 24,
  },
  matchesLabel: {
    color: '#e5e7eb',
    fontWeight: '500',
    marginBottom: 12,
    fontSize: 15,
  },
  submitButton: {
    marginTop: 8,
  },
});
