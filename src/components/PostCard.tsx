import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { PostWithUser } from '@/types/database';
import { CATEGORY_LABELS } from '@/hooks/usePosts';

interface PostCardProps {
  post: PostWithUser;
  onPress?: () => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Image unavailable</Text>
          </View>
        ) : (
          <>
            <Image
              source={{ uri: post.photo_url }}
              style={styles.image}
              resizeMode="cover"
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="small" color="#a855f7" />
              </View>
            )}
          </>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {post.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {post.description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {CATEGORY_LABELS[post.category]}
            </Text>
          </View>
          <Text style={styles.meta}>
            {post.user.name} · {timeAgo}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#374151',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
  },
  imagePlaceholderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: '#581c87',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#e9d5ff',
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    color: '#6b7280',
  },
});
