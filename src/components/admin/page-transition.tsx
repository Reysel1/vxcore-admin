"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";

/**
 * Configuración global de motion para el panel.
 *
 * `reducedMotion="user"` deja que motion respete la preferencia del sistema,
 * igual que ya hace el CSS de globals.css con las animaciones. Envuelve todo
 * el panel (sidebar incluido), no solo el contenido de la página.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Transición entre rutas del panel.
 *
 * `mode="popLayout"` saca la página saliente del flujo mientras se desvanece,
 * así la entrante no espera a que termine la salida y la navegación se siente
 * inmediata.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
