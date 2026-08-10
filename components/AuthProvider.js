'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
const AuthContext = createContext({ openAuth: () => { } });
export const useAuthModal = () => useContext(AuthContext);
export function AuthProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        mode: 'login',
        redirectTo: '/marketplace',
    });
    const [authed, setAuthed] = useState(false);
    const router = useRouter();
    // Check once whether a session already exists (so logged-in users skip the modal).
    useEffect(() => {
        fetch('/api/users/me', { cache: 'no-store' })
            .then((res) => res.ok && setAuthed(true))
            .catch(() => { });
    }, []);
    // Support deep-linking to the auth modal via #auth (used by the middleware redirect).
    useEffect(() => {
        const openFromHash = () => {
            if (window.location.hash === '#auth') {
                openAuth('login');
                window.history.replaceState(null, '', window.location.pathname);
            }
        };
        window.addEventListener('hashchange', openFromHash);
        openFromHash();
        return () => window.removeEventListener('hashchange', openFromHash);
    }, [authed]);
    const openAuth = useCallback((mode = 'login', redirectTo = '/marketplace') => {
        if (authed) {
            router.push(redirectTo);
            return;
        }
        setState({ open: true, mode, redirectTo });
    }, [authed, router]);
    return (_jsxs(AuthContext.Provider, { value: { openAuth }, children: [children, _jsx(AuthModal, { open: state.open, initialMode: state.mode, redirectTo: state.redirectTo, onClose: () => setState((s) => ({ ...s, open: false })) })] }));
}
