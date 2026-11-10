import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { strings } from '@/i18n';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError(strings.errors.required);
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // Si va bien, el guard del layout raíz cambia a la zona privada.
    if (signInError) {
      setError(authErrorMessage(signInError));
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <ThemedText type="subtitle">{strings.app.name}</ThemedText>
        <ThemedText themeColor="textSecondary">{strings.app.tagline}</ThemedText>
      </View>

      <FormField
        label={strings.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormField
        label={strings.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSignIn}
      />

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      <PrimaryButton title={strings.auth.signIn} loading={submitting} onPress={handleSignIn} />

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.auth.noAccount}
        </ThemedText>
        <Link href="/sign-up">
          <ThemedText type="smallBold" themeColor="tint">
            {strings.auth.signUp}
          </ThemedText>
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
