import { Ionicons } from '@expo/vector-icons';
import { getCategoryIcon } from '../constants/categories';

export default function CategoryIcon({ category, size = 24, color = '#6366F1' }) {
    const iconName = getCategoryIcon(category);

    return <Ionicons name={iconName} size={size} color={color} />;
}
