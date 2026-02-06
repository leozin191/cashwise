import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const dotsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Logo aparece com fade + scale
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

        // 2. Dots pulsando
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotsAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(dotsAnim, {
                    toValue: 0.3,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 3. Depois de 2 segundos, fade out e abre o app
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                onFinish();
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Text style={styles.emoji}>💰</Text>
                <Text style={styles.title}>CashWise</Text>
                <Text style={styles.subtitle}>Controle Inteligente</Text>
            </Animated.View>

            <Animated.View style={[styles.dots, { opacity: dotsAnim }]}>
                <Text style={styles.dotsText}>● ● ●</Text>
            </Animated.View>

            <Text style={styles.version}>v1.0.0</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
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
    },
    dots: {
        marginTop: 48,
    },
    dotsText: {
        fontSize: 16,
        color: '#E0E7FF',
        letterSpacing: 8,
    },
    version: {
        position: 'absolute',
        bottom: 50,
        color: '#C7D2FE',
        fontSize: 12,
    },
});