import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/auth/AuthProvider";
import { categoriesResource, useCategoriesResource } from ".";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date(value));

export const CategoriesScreen = () => {
  const { t } = useTranslation();
  const { session, permissionMap } = useAuth();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  const { categoriesQuery, createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoriesResource(session);

  if (!session) {
    return null;
  }

  const categories = categoriesQuery.data ?? [];
  const sortedCategories = useMemo(
    () => [...categories]
      .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
      .filter((category) => category.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const busy = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  const canCreate = canAccess(permissionMap, "categories", "create");
  const canUpdate = canAccess(permissionMap, "categories", "update");
  const canDelete = canAccess(permissionMap, "categories", "delete");

  return (
    <FlatList
      data={sortedCategories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.headerStack}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{t(categoriesResource.labelKey)}</Text>
            <Text style={styles.title}>{t(categoriesResource.pageTitleKey)}</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>{t("createCategory")}</Text>
            <View style={styles.formRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t("categoryPlaceholder")}
                placeholderTextColor="#8c7f74"
                style={styles.input}
              />
              <Pressable
                disabled={!canCreate || !draft.trim() || busy}
                onPress={() => {
                  void createCategoryMutation.mutateAsync(draft.trim())
                    .then(() => {
                      setDraft("");
                      setRequestError(null);
                    })
                    .catch((error) => {
                      setRequestError(error instanceof Error ? error.message : "Failed to create category");
                    });
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  (!canCreate || !draft.trim() || busy) && styles.buttonDisabled
                ]}
              >
                <Text style={styles.primaryButtonText}>{t("create")}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>{t("searchCategories")}</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchCategories")}
              placeholderTextColor="#8c7f74"
              style={styles.input}
            />

            {categoriesQuery.error ? <Text style={styles.errorText}>{categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Failed to load categories"}</Text> : null}
            {requestError ? <Text style={styles.errorText}>{requestError}</Text> : null}
            {!categoriesQuery.isLoading && sortedCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("noCategories")}</Text>
                <Text style={styles.emptyCopy}>{t("noCategoriesDescription")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const isEditing = editingId === item.id;

        return (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>Created {formatDate(item.createdAt)}</Text>
                <Text style={styles.itemMeta}>Updated {item.updatedAt ? formatDate(item.updatedAt) : "-"}</Text>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.editor}>
                <TextInput
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder={t("categoryPlaceholder")}
                  placeholderTextColor="#8c7f74"
                  style={styles.input}
                />
                <View style={styles.actionRow}>
                  <Pressable onPress={() => setEditingId(null)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{t("cancel")}</Text>
                  </Pressable>
                  <Pressable
                    disabled={!editingName.trim() || busy}
                    onPress={() => {
                      void updateCategoryMutation.mutateAsync({ id: item.id, name: editingName.trim() })
                        .then(() => {
                          setEditingId(null);
                          setEditingName("");
                          setRequestError(null);
                        })
                        .catch((error) => {
                          setRequestError(error instanceof Error ? error.message : "Failed to update category");
                        });
                    }}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, (!editingName.trim() || busy) && styles.buttonDisabled]}
                  >
                    <Text style={styles.primaryButtonText}>{t("save")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                disabled={!canUpdate}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingName(item.name);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>{t("update")}</Text>
              </Pressable>
              <Pressable
                disabled={!canDelete || busy}
                onPress={() => {
                  void deleteCategoryMutation.mutateAsync(item.id)
                    .then(() => {
                      setRequestError(null);
                    })
                    .catch((error) => {
                      setRequestError(error instanceof Error ? error.message : "Failed to delete category");
                    });
                }}
                style={({ pressed }) => [styles.dangerButton, pressed && styles.buttonPressed, (!canDelete || busy) && styles.buttonDisabled]}
              >
                <Text style={styles.dangerButtonText}>{t("delete")}</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
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
  formRow: { gap: 10 },
  input: { borderWidth: 1, borderColor: "rgba(42, 29, 20, 0.12)", borderRadius: 16, backgroundColor: "#fffdf9", color: "#171412", paddingHorizontal: 16, paddingVertical: 14 },
  primaryButton: { alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 14, backgroundColor: "#171412" },
  primaryButtonText: { color: "#fffdf9", fontWeight: "700" },
  secondaryButton: { alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#ecdcc9" },
  secondaryButtonText: { color: "#171412", fontWeight: "700" },
  dangerButton: { alignItems: "center", justifyContent: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#7b2317" },
  dangerButtonText: { color: "#fffdf9", fontWeight: "700" },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.45 },
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
  editor: { gap: 10 },
  actionRow: { flexDirection: "row", gap: 10 }
});
