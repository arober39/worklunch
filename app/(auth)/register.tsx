import { useState, useEffect } from 'react';
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
import { Link, router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { user, isLoading: authLoading } = useAuthStore();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [authLoading, user]);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        username.trim(),
        phone.trim()
      );

      // Email confirmation is disabled - user is automatically logged in
      // Navigation handled by useEffect when user state changes

      // COMMENTED OUT: Email confirmation code (disabled)
      // If user is logged in (email confirmation disabled), useEffect will redirect
      // If email confirmation is required, show message
      // if (!result.session) {
      //   Alert.alert(
      //     'Check your email',
      //     'We sent you a confirmation link. Please verify your email before signing in.',
      //     [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      //   );
      // }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
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
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Join your workplace lunch swap community
          </Text>
        </View>

        <Input
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="John Smith"
          autoCapitalize="words"
        />

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="johnsmith123"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 123-4567"
          keyboardType="phone-pad"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          textContentType="oneTimeCode"
          autoComplete="off"
        />

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry
          textContentType="oneTimeCode"
          autoComplete="off"
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#9ca3af',
  },
  link: {
    color: '#a855f7',
    fontWeight: '600',
  },
});
