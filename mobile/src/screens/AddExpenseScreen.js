import { View, Text, StyleSheet } from 'react-native';

export default function AddExpenseScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🚀 Tela de Adicionar</Text>
            <Text style={styles.subtext}>Vamos fazer isso no próximo passo!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtext: {
        fontSize: 14,
        color: '#6B7280',
    },
});