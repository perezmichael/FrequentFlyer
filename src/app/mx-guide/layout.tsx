export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen w-full bg-neutral-900 text-white overflow-hidden">
            {children}
        </div>
    );
}
