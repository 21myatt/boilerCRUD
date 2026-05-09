import { Text, View } from "react-native";
import { AppProviders } from "./src/app/providers/AppProviders";
import { AuthScreen } from "./src/app/shell/AuthScreen";
import { AppShell } from "./src/app/shell/AppShell";
import { useAuth } from "./src/app/auth/AuthProvider";
import { useMobileUiStore } from "./src/app/store/ui-store";
import { AssetsScreen } from "./src/features/assets";
import { CategoriesScreen } from "./src/features/categories";
import { ItemsScreen } from "./src/features/items/ItemsScreen";

const MobileRoot = () => {
  const { status, session } = useAuth();
  const { route } = useMobileUiStore();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4efe7" }}>
        <Text>Loading workspace...</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      {route === "items" ? <ItemsScreen /> : null}
      {route === "categories" ? <CategoriesScreen /> : null}
      {route === "assets" ? <AssetsScreen /> : null}
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProviders>
      <MobileRoot />
    </AppProviders>
  );
}
