import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Login | RoomFinder',
    description: 'Admin login for RoomFinder',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
