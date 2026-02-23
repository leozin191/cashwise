import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export default function FadeIn({ children, delay = 0, duration = 500, slideUp = true, initialScale = 0.97 }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(slideUp ? 20 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(initialScale)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration,
                delay: delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: duration,
                delay: delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: duration,
                delay: delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            }}
        >
            {children}
        </Animated.View>
    );
}
