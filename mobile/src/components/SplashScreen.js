import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen({ onFinish, fontsReady }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            if (fontsReady) {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => {
                    onFinish();
                });
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [fontsReady]);

    return (
        <LinearGradient
            colors={['#6366F1', '#4F46E5', '#3730A3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="wallet" size={56} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>CashWise</Text>
                <Text style={styles.subtitle}>Controle Inteligente</Text>
            </Animated.View>

            <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#E0E7FF" />
            </View>

            <Text style={styles.version}>v1.0.0</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 42,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 16,
        color: '#E0E7FF',
        marginTop: 8,
        letterSpacing: 1,
        fontWeight: '400',
    },
    loaderContainer: {
        marginTop: 48,
    },
    version: {
        position: 'absolute',
        bottom: 50,
        color: '#C7D2FE',
        fontSize: 12,
    },
});
