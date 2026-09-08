import type { ReactNode } from "react";
import { View } from "reshaped";

type AuthLayoutProps = {
    children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <main className="auth-layout">
            <div className="auth-layout__glow" />

            <View
                width="440px"
                maxWidth="calc(100vw - 32px)"
            >
                {children}
            </View>
        </main>
    );
}