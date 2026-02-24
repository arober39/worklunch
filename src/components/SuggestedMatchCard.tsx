import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface SuggestedMatchCardProps {
  title: string;
  reason: string;
  onPress?: () => void;
}

export function SuggestedMatchCard({ title, reason, onPress }: SuggestedMatchCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.reason} numberOfLines={2}>
        {reason}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#374151',
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
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 6,
  },
  reason: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
