import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import './Auth.css';

// Google G logo SVG
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
);

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // Redirect if already logged in
    if (!loading && user) {
        return <Navigate to="/chat" replace />;
    }

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setIsLoading(false);
            return;
        }

        try {
            // 1. Sign up the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                if (authError.message.toLowerCase().includes("fetch")) {
                    throw new Error("Cannot connect to server. Did you add the Supabase URL/Key to Vercel?");
                }
                throw authError;
            }

            if (authData.user) {
                // If there's no session, it means email confirmation is enabled
                if (!authData.session) {
                    setSuccess('Registration successful! Please check your email to confirm your account before logging in.');
                    setIsLoading(false);
                    return;
                }

                // 2. Create the user profile in the public user_profiles table
                // We wrap this in a timeout to ensure the UI never hangs
                const profilePromise = supabase
                    .from('user_profiles')
                    .upsert([
                        {
                            id: authData.user.id,
                            email: email,
                            full_name: name,
                            subscription_status: 'Active',
                            subscription_tier: 'Free',
                        }
                    ]);

                const profileTimeout = new Promise((resolve) => setTimeout(() => resolve({ error: { timeout: true } }), 4000));
                const { error: profileError } = await Promise.race([profilePromise, profileTimeout]);

                if (profileError) {
                    console.error("Profile creation error:", profileError);
                    // We don't throw here because the user IS created in Auth.
                    // They might just need to log in again or it's a transient RLS issue.
                }

                setSuccess('Account created successfully! Redirecting...');
                setTimeout(() => {
                    navigate('/chat');
                }, 1500);
            }
        } catch (error) {
            console.error("Registration error:", error);
            setError(error.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/chat`,
                },
            });
            if (oauthError) throw oauthError;
        } catch (error) {
            console.error("Google OAuth error:", error);
            setError(error.message || 'Google sign-in failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <Link to="/" className="auth-brand">
                <Sparkles className="brand-icon" size={24} />
                <span>Mind Ease</span>
            </Link>

            <div className="auth-card glass-panel animate-fade-in">
                <div className="auth-header">
                    <h2>Create an account</h2>
                    <p>Begin your journey to better mental well-being.</p>
                </div>

                {error && (
                    <div className="auth-error animate-fade-in">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="auth-success animate-fade-in" style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        padding: '12px 16px', borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981', marginBottom: '16px',
                        fontSize: '0.875rem', lineHeight: '1.5'
                    }}>
                        <CheckCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{success}</span>
                    </div>
                )}

                {!success && (
                    <form className="auth-form" onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="auth-input"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email Address</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="auth-input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="auth-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <span className="input-hint">Must be at least 6 characters</span>
                        </div>

                        <button type="submit" className="btn btn-primary full-width" disabled={isLoading}>
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}

                <div className="auth-divider">or continue with</div>

                <button
                    type="button"
                    className="btn-google"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                </button>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Register;
