import { useRef, useState } from 'react';
import { Animated, PanResponder, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const DELETE_WIDTH = 72;
const TRIGGER_THRESHOLD = DELETE_WIDTH * 0.5;

export default function SwipeableRow({ children, onDelete, colors }) {
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const close = () => {
        isOpen.current = false;
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 24,
        }).start();
    };

    const open = () => {
        isOpen.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
        }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            // Claim the gesture as soon as movement is clearly horizontal
            onMoveShouldSetPanResponder: (_, { dx, dy }) =>
                Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy),
            // Don't let the parent ScrollView steal the responder once we have it
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_, { dx }) => {
                const base = isOpen.current ? -DELETE_WIDTH : 0;
                const next = Math.max(Math.min(base + dx, 0), -DELETE_WIDTH);
                translateX.setValue(next);
            },
            onPanResponderRelease: (_, { dx, vx }) => {
                const base = isOpen.current ? -DELETE_WIDTH : 0;
                const total = base + dx;
                if (total < -TRIGGER_THRESHOLD || vx < -0.4) {
                    open();
                } else {
                    close();
                }
            },
            // If responder is taken away anyway, snap back to closed
            onPanResponderTerminate: () => {
                close();
            },
        })
    ).current;

    const handleDelete = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Animated.spring(translateX, {
            toValue: -DELETE_WIDTH * 5,
            useNativeDriver: true,
            bounciness: 0,
            speed: 24,
        }).start(() => onDelete());
    };

    return (
        <View
            style={styles.container}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <Animated.View
                style={[styles.row, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                {/* Card — exactly as wide as the container */}
                <View style={{ width: containerWidth || '100%' }}>
                    {children}
                </View>

                {/* Delete button — hidden to the right, revealed on swipe */}
                <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error }]}
                    onPress={handleDelete}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
    },
    deleteButton: {
        width: DELETE_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
