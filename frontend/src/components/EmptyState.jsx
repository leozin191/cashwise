export default function EmptyState({ icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {icon && <div className="text-4xl mb-3 opacity-40">{icon}</div>}
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            {description && <p className="text-sm text-muted mt-1 max-w-xs">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
