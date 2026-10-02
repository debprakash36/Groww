"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SessionControls from "@/components/SessionControls";
import styles from "./AppHeader.module.css";

const LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/pilot", label: "Pilot" },
] as const;

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/chat" className={styles.brand}>
        <span className={styles.mark} aria-hidden>
          G
        </span>
        <span className={styles.title}>Groww Assistant</span>
      </Link>
      <nav className={styles.nav} aria-label="Primary">
        {LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));
          const adminExact = link.href === "/admin" && pathname === "/admin";
          const isActive = link.href === "/admin" ? adminExact : active;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={styles.link}
              data-active={isActive ? "true" : "false"}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <SessionControls />
      </nav>
    </header>
  );
}
