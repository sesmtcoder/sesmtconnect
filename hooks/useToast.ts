'use client';

import { useState, useCallback } from 'react';
import type { ToastMessage, ToastType } from '@/components/Toast';

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}
