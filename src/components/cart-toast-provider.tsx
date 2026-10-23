"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

type CartNotice = { id: number; name: string; quantity: number; leaving: boolean };
type CartToastContextValue = { announceAdded: (name: string, quantity?: number) => void };

const CartToastContext = createContext<CartToastContextValue | null>(null);

export function CartToastProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<CartNotice[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const noticesRef = useRef<CartNotice[]>([]);
  const noticeId = useRef(0);
  const noticeTimers = useRef(new Map<number, { hide?: ReturnType<typeof setTimeout>; remove?: ReturnType<typeof setTimeout> }>());

  function updateNotices(next: CartNotice[]) {
    noticesRef.current = next;
    setNotices(next);
  }

  function dismissNotice(id: number) {
    const notice = noticesRef.current.find((item) => item.id === id);
    if (!notice || notice.leaving) return;
    const timers = noticeTimers.current.get(id);
    if (timers?.hide) clearTimeout(timers.hide);
    updateNotices(noticesRef.current.map((item) => item.id === id ? { ...item, leaving: true } : item));
    if (timers?.remove) clearTimeout(timers.remove);
    const remove = setTimeout(() => {
      updateNotices(noticesRef.current.filter((item) => item.id !== id));
      noticeTimers.current.delete(id);
    }, 260);
    noticeTimers.current.set(id, { ...timers, remove });
  }

  function announceAdded(name: string, quantity = 1) {
    const id = ++noticeId.current;
    const nextNotice = { id, name, quantity, leaving: false };
    const alreadyLeaving = noticesRef.current.find((notice) => notice.leaving);
    if (alreadyLeaving) {
      const timers = noticeTimers.current.get(alreadyLeaving.id);
      if (timers?.hide) clearTimeout(timers.hide);
      if (timers?.remove) clearTimeout(timers.remove);
      noticeTimers.current.delete(alreadyLeaving.id);
      updateNotices(noticesRef.current.filter((notice) => notice.id !== alreadyLeaving.id));
    }
    const activeNotices = noticesRef.current.filter((notice) => !notice.leaving);
    if (activeNotices.length >= 3) dismissNotice(activeNotices[0].id);
    updateNotices([...noticesRef.current, nextNotice]);
    const hide = setTimeout(() => dismissNotice(id), 2800);
    noticeTimers.current.set(id, { hide });
  }

  useEffect(() => {
    const timers = noticeTimers.current;
    queueMicrotask(() => setHydrated(true));
    return () => {
      timers.forEach((noticeTimer) => {
        if (noticeTimer.hide) clearTimeout(noticeTimer.hide);
        if (noticeTimer.remove) clearTimeout(noticeTimer.remove);
      });
      timers.clear();
    };
  }, []);

  return <CartToastContext.Provider value={{ announceAdded }}>
    {children}
    {hydrated && notices.length > 0 && createPortal(<div className="cart-toast-stack" aria-label="Notificaciones del carrito">
      {notices.map((notice, index) => <div key={notice.id} className={`cart-toast${notice.leaving ? " is-leaving" : ""}${index < notices.length - 1 ? " is-behind" : ""}${index < notices.length - 2 ? " is-farthest" : ""}`} style={{ zIndex: index + 1, bottom: `${(notices.length - 1 - index) * 16}px` }} role="status" aria-live="polite">
        <span className="cart-toast-check"><CartCheckIcon /></span>
        <span className="cart-toast-copy"><strong>{notice.quantity > 1 ? `${notice.quantity} agregados al carrito` : "Agregado al carrito"}</strong><span>{notice.name}</span></span>
        <button className="cart-toast-close" type="button" aria-label="Cerrar notificación" onClick={() => dismissNotice(notice.id)}><ToastCloseIcon /></button>
      </div>)}
    </div>, document.body)}
  </CartToastContext.Provider>;
}

export function useCartToast() {
  const context = useContext(CartToastContext);
  if (!context) throw new Error("useCartToast debe usarse dentro de CartToastProvider.");
  return context;
}

function CartCheckIcon() {
  return <svg className="cart-added-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5.5 12.2 4.1 4.1 9-9" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ToastCloseIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
