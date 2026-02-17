export default function StatCard({ label, value, subtitle, icon, color = 'text-primary' }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted font-medium">{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
                </div>
                {icon && (
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-lg flex-shrink-0">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
