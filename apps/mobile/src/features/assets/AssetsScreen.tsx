import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { canAccess } from "@imsys/auth";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/auth/AuthProvider";
import { assetsResource } from "./definition";
import { useAssetsResource } from "./hooks";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date(value));

const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const AssetsScreen = () => {
  const { t } = useTranslation();
  const { session, permissionMap } = useAuth();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const { assetsQuery, uploadAssetMutation, deleteAssetMutation } = useAssetsResource(session);

  if (!session) {
    return null;
  }

  const assets = assetsQuery.data ?? [];
  const filteredAssets = useMemo(
    () => assets.filter((asset) => {
      const query = search.toLowerCase();
      return (
        asset.fileName.toLowerCase().includes(query)
        || (asset.title ?? "").toLowerCase().includes(query)
        || asset.mimeType.toLowerCase().includes(query)
      );
    }),
    [assets, search]
  );
  const canCreate = canAccess(permissionMap, "assets", "create");
  const canDelete = canAccess(permissionMap, "assets", "delete");
  const busy = uploadAssetMutation.isPending || deleteAssetMutation.isPending;

  const handlePickAndUpload = async () => {
    if (!canCreate || busy || !session) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const file = result.assets[0];
    setSelectedFileName(file.name);

    try {
      await uploadAssetMutation.mutateAsync({
        uri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.size,
        title,
        altText
      });
      setTitle("");
      setAltText("");
      setSelectedFileName(null);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to upload asset");
    }
  };

  return (
    <FlatList
      data={filteredAssets}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={(
        <View style={styles.headerStack}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{t(assetsResource.labelKey)}</Text>
            <Text style={styles.title}>{t(assetsResource.pageTitleKey)}</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>{t("uploadAsset")}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("assetTitlePlaceholder")}
              placeholderTextColor="#8c7f74"
              style={styles.input}
            />
            <TextInput
              value={altText}
              onChangeText={setAltText}
              placeholder={t("assetAltTextPlaceholder")}
              placeholderTextColor="#8c7f74"
              style={styles.input}
            />
            <Pressable
              disabled={!canCreate || busy}
              onPress={() => {
                void handlePickAndUpload();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                (!canCreate || busy) && styles.buttonDisabled
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {busy ? t("uploadingAsset") : t("pickAsset")}
              </Text>
            </Pressable>
            {selectedFileName ? <Text style={styles.helperText}>{selectedFileName}</Text> : null}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>{t("searchAssets")}</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchAssets")}
              placeholderTextColor="#8c7f74"
              style={styles.input}
            />
            {assetsQuery.error ? <Text style={styles.errorText}>{assetsQuery.error instanceof Error ? assetsQuery.error.message : "Failed to load assets"}</Text> : null}
            {requestError ? <Text style={styles.errorText}>{requestError}</Text> : null}
            {!assetsQuery.isLoading && filteredAssets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("noAssets")}</Text>
                <Text style={styles.emptyCopy}>{t("noAssetsDescription")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.fileName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.itemName}>{item.title || item.fileName}</Text>
              <Text style={styles.itemMeta}>{item.fileName}</Text>
              <Text style={styles.itemMeta}>{item.mimeType} · {formatBytes(item.sizeBytes)}</Text>
              <Text style={styles.itemMeta}>Updated {formatDate(item.updatedAt ?? item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              disabled={!canDelete || deleteAssetMutation.isPending}
              onPress={() => {
                void deleteAssetMutation.mutateAsync(item.id)
                  .then(() => {
                    setRequestError(null);
                  })
                  .catch((error) => {
                    setRequestError(error instanceof Error ? error.message : "Failed to delete asset");
                  });
              }}
              style={({ pressed }) => [styles.dangerButton, pressed && styles.buttonPressed, (!canDelete || deleteAssetMutation.isPending) && styles.buttonDisabled]}
            >
              <Text style={styles.dangerButtonText}>{t("delete")}</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 24 },
  headerStack: { gap: 14 },
  heroCard: { gap: 4, padding: 20, borderRadius: 24, backgroundColor: "rgba(255, 252, 247, 0.92)" },
  eyebrow: { color: "#8d6743", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: "800", color: "#171412" },
  panel: { gap: 12, padding: 18, borderRadius: 22, backgroundColor: "rgba(255, 252, 247, 0.94)" },
  sectionLabel: { color: "#171412", fontWeight: "800", fontSize: 16 },
  input: { borderWidth: 1, borderColor: "rgba(42, 29, 20, 0.12)", borderRadius: 16, backgroundColor: "#fffdf9", color: "#171412", paddingHorizontal: 16, paddingVertical: 14 },
  primaryButton: { alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 14, backgroundColor: "#171412" },
  primaryButtonText: { color: "#fffdf9", fontWeight: "700" },
  helperText: { color: "#6f6458", lineHeight: 20 },
  errorText: { color: "#7b2317" },
  emptyState: { gap: 6, borderRadius: 18, backgroundColor: "#fffdf9", padding: 18 },
  emptyTitle: { color: "#171412", fontWeight: "800" },
  emptyCopy: { color: "#6f6458", lineHeight: 20 },
  card: { gap: 14, padding: 18, borderRadius: 22, backgroundColor: "rgba(255, 252, 247, 0.94)" },
  cardRow: { flexDirection: "row", gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#171412" },
  avatarText: { color: "#fffdf9", fontWeight: "800" },
  cardCopy: { flex: 1, gap: 4 },
  itemName: { color: "#171412", fontWeight: "800", fontSize: 17 },
  itemMeta: { color: "#6f6458" },
  actionRow: { flexDirection: "row", gap: 10 },
  dangerButton: { alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#7b2317" },
  dangerButtonText: { color: "#fffdf9", fontWeight: "700" },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.45 }
});
