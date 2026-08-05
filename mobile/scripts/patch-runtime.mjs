import fs from "node:fs"

const file = new URL("../App.tsx", import.meta.url)
let source = fs.readFileSync(file, "utf8")

source = source.replace(
  'const WEB_URL = "https://nexjud.netlify.app"',
  'const WEB_URL = "https://nexjudsolucoes.com.br"'
)

source = source.replace(
  'import { NavigationContainer } from "@react-navigation/native"',
  'import { DarkTheme, NavigationContainer } from "@react-navigation/native"\nimport { GestureHandlerRootView } from "react-native-gesture-handler"'
)

source = source.replace(
`  const theme = useMemo(() => ({
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  }), [])`,
`  const theme = useMemo(() => ({
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  }), [])`
)

source = source.replace(
`  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />`,
`  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />`
)

source = source.replace(
`      </Stack.Navigator>
    </NavigationContainer>
  )`,
`        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )`
)

fs.writeFileSync(file, source)
console.log("Runtime patch applied to App.tsx")
