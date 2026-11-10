import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen } from '@/components/auth-screen';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { strings } from '@/i18n';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) {
      setError(strings.errors.required);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(strings.errors.weakPassword);
      return;
    }
    setError(null);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // El trigger de la base de datos crea el perfil con este nombre.
      options: { data: { display_name: displayName.trim() } },
    });
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setSubmitting(false);
      return;
    }
    // Con confirmación de correo activada no hay sesión hasta confirmar.
    // Si la hay, el guard del layout raíz cambia solo a la zona privada.
    if (!data.session) {
      setNeedsConfirmation(true);
      setSubmitting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <AuthScreen>
        <ThemedText type="subtitle">{strings.auth.confirmEmailTitle}</ThemedText>
        <ThemedText themeColor="textSecondary">{strings.auth.confirmEmailBody}</ThemedText>
        <PrimaryButton title={strings.auth.backToSignIn} onPress={() => router.back()} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <FormField
        label={strings.auth.displayName}
        placeholder={strings.auth.displayNamePlaceholder}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={40}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
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
        hint={strings.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignUp}
      />

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      <PrimaryButton title={strings.auth.signUp} loading={submitting} onPress={handleSignUp} />
    </AuthScreen>
  );
}
