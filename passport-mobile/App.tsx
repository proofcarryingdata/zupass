import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';

export default function App() {
  return (
    <WebView source={{ uri: 'https://google.com' }} style={{ flex: 1 }} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
