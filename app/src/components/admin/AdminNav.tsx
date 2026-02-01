'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AdminNavProps {
    user: User;
}

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/pdf-management', label: 'PDF Management', icon: FileText },
];

export default function AdminNav({ user }: AdminNavProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/admin/login');
        router.refresh();
    };

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    return (
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-white">RoomFinder</h1>
                                <p className="text-xs text-slate-400">Admin Panel</p>
                            </div>
                        </Link>

                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                                ? 'bg-indigo-600/20 text-indigo-300'
                                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 hidden sm:block">
                            {user.email}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSignOut}
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex md:hidden items-center gap-1 mt-3 pt-3 border-t border-white/10">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${active
                                        ? 'bg-indigo-600/20 text-indigo-300'
                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden xs:inline">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}

