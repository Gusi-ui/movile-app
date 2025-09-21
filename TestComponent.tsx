import { View, Text, StyleSheet } from 'react-native';

export default function TestComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Component</Text>
      <Text>Testing for text node error</Text>
      <Text>No special characters or emojis here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
