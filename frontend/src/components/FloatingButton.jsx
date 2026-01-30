export default function FloatingButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-20 h-20 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-5xl font-light z-50 animate-pulse-scale"
            style={{
                boxShadow: '0 10px 40px rgba(79, 70, 229, 0.4)'
            }}
        >
            <span className="mb-1">+</span>
        </button>
    );
}