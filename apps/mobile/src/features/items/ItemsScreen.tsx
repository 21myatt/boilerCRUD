import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/auth/AuthProvider";
import { useCategoriesResource } from "../categories/hooks";
import { itemsResource, useItemsResource } from ".";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date(value));

export const ItemsScreen = () => {
  const { t } = useTranslation();
  const { session, permissionMap } = useAuth();
  const [draft, setDraft] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { itemsQuery, createItemMutation, updateItemMutation, deleteItemMutation } = useItemsResource(session);
  const { categoriesQuery } = useCategoriesResource(session);

  if (!session) {
    return null;
  }

  const items = itemsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const sortedItems = useMemo(
    () => [...items]
      .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
      .filter((item) => {
        const query = search.toLowerCase();
        const categoryName = item.categoryId ? categoryNameById.get(item.categoryId)?.toLowerCase() ?? "" : "";
        return item.name.toLowerCase().includes(query) || categoryName.includes(query);
      }),
    [categoryNameById, items, search]
  );

  const busy = createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending;
  const canCreate = canAccess(permissionMap, "items", "create");
  const canUpdate = canAccess(permissionMap, "items", "update");
  const canDelete = canAccess(permissionMap, "items", "delete");

  return (
    <FlatList
      data={sortedItems}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.headerStack}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{t(itemsResource.labelKey)}</Text>
            <Text style={styles.title}>{t(itemsResource.pageTitleKey)}</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>{t("createItem")}</Text>
            <View style={styles.formRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t("itemPlaceholder")}
                placeholderTextColor="#8c7f74"
                style={styles.input}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                <Pressable
                  onPress={() => setDraftCategoryId(null)}
                  style={[styles.categoryChip, !draftCategoryId && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, !draftCategoryId && styles.categoryChipTextActive]}>No category</Text>
                </Pressable>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setDraftCategoryId(category.id)}
                    style={[styles.categoryChip, draftCategoryId === category.id && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, draftCategoryId === category.id && styles.categoryChipTextActive]}>{category.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                disabled={!canCreate || !draft.trim() || busy}
                onPress={() => {
                  void createItemMutation.mutateAsync({
                    name: draft.trim(),
                    categoryId: draftCategoryId
                  })
                    .then(() => {
                      setDraft("");
                      setDraftCategoryId(null);
                      setRequestError(null);
                    })
                    .catch((error) => {
                      setRequestError(error instanceof Error ? error.message : "Failed to create item");
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
            <Text style={styles.sectionLabel}>{t("searchItems")}</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchItems")}
              placeholderTextColor="#8c7f74"
              style={styles.input}
            />

            {itemsQuery.error ? <Text style={styles.errorText}>{itemsQuery.error instanceof Error ? itemsQuery.error.message : "Failed to load items"}</Text> : null}
            {requestError ? <Text style={styles.errorText}>{requestError}</Text> : null}
            {!itemsQuery.isLoading && sortedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("noItems")}</Text>
                <Text style={styles.emptyCopy}>{t("noItemsDescription")}</Text>
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
                <Text style={styles.itemCategory}>{item.categoryId ? categoryNameById.get(item.categoryId) ?? "Unassigned" : "Unassigned"}</Text>
                <Text style={styles.itemMeta}>Created {formatDate(item.createdAt)}</Text>
                <Text style={styles.itemMeta}>Updated {item.updatedAt ? formatDate(item.updatedAt) : "-"}</Text>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.editor}>
                <TextInput
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder={t("itemPlaceholder")}
                  placeholderTextColor="#8c7f74"
                  style={styles.input}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  <Pressable
                    onPress={() => setEditingCategoryId(null)}
                    style={[styles.categoryChip, !editingCategoryId && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, !editingCategoryId && styles.categoryChipTextActive]}>No category</Text>
                  </Pressable>
                  {categories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => setEditingCategoryId(category.id)}
                      style={[styles.categoryChip, editingCategoryId === category.id && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, editingCategoryId === category.id && styles.categoryChipTextActive]}>{category.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      setEditingId(null);
                      setEditingName("");
                      setEditingCategoryId(null);
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>{t("cancel")}</Text>
                  </Pressable>
                  <Pressable
                    disabled={!editingName.trim() || busy}
                    onPress={() => {
                      void updateItemMutation.mutateAsync({
                        id: item.id,
                        name: editingName.trim(),
                        categoryId: editingCategoryId
                      })
                        .then(() => {
                          setEditingId(null);
                          setEditingName("");
                          setEditingCategoryId(null);
                          setRequestError(null);
                        })
                        .catch((error) => {
                          setRequestError(error instanceof Error ? error.message : "Failed to update item");
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
                  setEditingCategoryId(item.categoryId);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>{t("update")}</Text>
              </Pressable>
              <Pressable
                disabled={!canDelete || busy}
                onPress={() => {
                  void deleteItemMutation.mutateAsync(item.id)
                    .then(() => {
                      setRequestError(null);
                    })
                    .catch((error) => {
                      setRequestError(error instanceof Error ? error.message : "Failed to delete item");
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
  content: {
    gap: 14,
    paddingBottom: 24
  },
  headerStack: {
    gap: 14
  },
  heroCard: {
    gap: 4,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(255, 252, 247, 0.92)"
  },
  eyebrow: {
    color: "#8d6743",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#171412"
  },
  panel: {
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255, 252, 247, 0.92)"
  },
  sectionLabel: {
    color: "#171412",
    fontWeight: "700"
  },
  formRow: {
    gap: 10
  },
  categoryRow: {
    gap: 8
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: "rgba(42, 29, 20, 0.12)",
    borderRadius: 999,
    backgroundColor: "#fffdf9",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  categoryChipActive: {
    borderColor: "#171412",
    backgroundColor: "#171412"
  },
  categoryChipText: {
    color: "#6f6458",
    fontSize: 13,
    fontWeight: "700"
  },
  categoryChipTextActive: {
    color: "#fffdf9"
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
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255, 252, 247, 0.94)"
  },
  cardRow: {
    flexDirection: "row",
    gap: 12
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#171412"
  },
  avatarText: {
    color: "#fffdf9",
    fontWeight: "800"
  },
  cardCopy: {
    flex: 1,
    gap: 4
  },
  itemName: {
    color: "#171412",
    fontSize: 18,
    fontWeight: "700"
  },
  itemCategory: {
    color: "#8d6743",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  itemMeta: {
    color: "#6f6458"
  },
  editor: {
    gap: 10
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#171412"
  },
  primaryButtonText: {
    color: "#fffdf9",
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ecdcc9"
  },
  secondaryButtonText: {
    color: "#171412",
    fontWeight: "700"
  },
  dangerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#a63a2a"
  },
  dangerButtonText: {
    color: "#fffdf9",
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    opacity: 0.45
  },
  emptyState: {
    gap: 8,
    paddingTop: 8
  },
  emptyTitle: {
    color: "#171412",
    fontWeight: "700"
  },
  emptyCopy: {
    color: "#6f6458",
    lineHeight: 20
  },
  errorText: {
    color: "#7b2317"
  }
});
