import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../../lib/supabase";

export const AuthScreen = () => {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setBusy(true);
    setError(null);
    const nextError = await signIn(email, password);
    setError(nextError);
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{t("workspace")}</Text>
        <Text style={styles.title}>{t("signIn")}</Text>
        <Text style={styles.subtitle}>{t("authSubtitle")}</Text>

        {!isSupabaseConfigured ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>Set the mobile Supabase config values in `.env` first.</Text>
          </View>
        ) : null}

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t("email")}
          placeholderTextColor="#8c7f74"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          secureTextEntry
          placeholder={t("password")}
          placeholderTextColor="#8c7f74"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={busy || !isSupabaseConfigured}
          onPress={() => void handleSignIn()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, (busy || !isSupabaseConfigured) && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{busy ? `${t("signIn")}...` : t("signIn")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4efe7",
    padding: 20,
    justifyContent: "center"
  },
  card: {
    gap: 14,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255, 252, 247, 0.94)"
  },
  eyebrow: {
    color: "#8d6743",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#171412"
  },
  subtitle: {
    color: "#6f6458",
    lineHeight: 22
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(42, 29, 20, 0.12)",
    borderRadius: 16,
    backgroundColor: "#fffdf9",
    color: "#171412",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  alert: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#f8ddd5"
  },
  alertText: {
    color: "#7b2317"
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: "#171412"
  },
  primaryButtonText: {
    color: "#fffdf9",
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    opacity: 0.45
  }
});
