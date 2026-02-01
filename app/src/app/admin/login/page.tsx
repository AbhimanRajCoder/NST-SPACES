'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const router = useRouter();
    const searchParams = useSearchParams();

    const unauthorizedError = searchParams.get('error') === 'unauthorized';
    const notConfigured = searchParams.get('error') === 'not_configured';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate email domain
        if (!email.endsWith('@adypu.edu.in')) {
            setError('Only @adypu.edu.in email addresses are allowed');
            setLoading(false);
            return;
        }

        try {
            const supabase = createClient();

            if (mode === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/admin`,
                    },
                });

                if (signUpError) throw signUpError;
                setError('Check your email for the confirmation link!');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
                router.push('/admin');
                router.refresh();
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Admin Panel</CardTitle>
                    <CardDescription className="text-slate-300">
                        Sign in with your @adypu.edu.in email
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {notConfigured && (
                        <div className="p-4 rounded-lg mb-4 bg-amber-500/20 text-amber-200 border border-amber-500/30">
                            <h3 className="font-semibold mb-2">⚠️ Supabase Not Configured</h3>
                            <p className="text-sm mb-3">To enable the admin panel, you need to:</p>
                            <ol className="text-sm list-decimal list-inside space-y-1">
                                <li>Create a Supabase project at supabase.com</li>
                                <li>Run the SQL schema from <code className="bg-black/20 px-1 rounded">sql/schema.sql</code></li>
                                <li>Create a storage bucket named &quot;timetables&quot;</li>
                                <li>Copy your credentials to <code className="bg-black/20 px-1 rounded">.env.local</code></li>
                            </ol>
                        </div>
                    )}

                    {(unauthorizedError || (error && !error.includes('Check your email'))) && (
                        <div className="p-3 rounded-lg mb-4 text-sm bg-red-500/20 text-red-200 border border-red-500/30">
                            {unauthorizedError ? 'Unauthorized email domain' : error}
                        </div>
                    )}

                    {error && error.includes('Check your email') && (
                        <div className="p-3 rounded-lg mb-4 text-sm bg-green-500/20 text-green-200 border border-green-500/30">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@adypu.edu.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-200">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            disabled={loading || notConfigured}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            className="text-sm text-slate-300 hover:text-white transition-colors"
                        >
                            {mode === 'login'
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Sign in'}
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 text-center">
                        <a
                            href="/"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            ← Back to RoomFinder
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
