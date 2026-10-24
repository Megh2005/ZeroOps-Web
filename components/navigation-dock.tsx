"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./auth-provider";
import { logout } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FiHome,
  FiLayers,
  FiCpu,
  FiCode,
  FiTerminal,
  FiCloud,
  FiGitCommit,
  FiUser,
  FiLogOut,
  FiLogIn,
} from "react-icons/fi";
import { FaGithub } from "react-icons/fa6";

interface DockItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// Public navigation items when unauthenticated
const PUBLIC_NAV_ITEMS: DockItem[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    icon: FiHome,
    exact: true,
  },
  {
    id: "auth",
    href: "/auth",
    label: "Sign In with GitHub",
    icon: FaGithub,
  },
];



// Full developer suite navigation items when fully authenticated & onboarded
const AUTHENTICATED_NAV_ITEMS: DockItem[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    icon: FiHome,
    exact: true,
  },
  {
    id: "profile",
    href: "/profile",
    label: "Developer Profile & Repos",
    icon: FiUser,
  },
  {
    id: "builder",
    href: "/builder",
    label: "Visual Cloud Builder",
    icon: FiLayers,
  },
  {
    id: "ai-builder",
    href: "/ai-builder",
    label: "AI Architecture Canvas",
    icon: FiCpu,
  },
  {
    id: "code-to-builder",
    href: "/code-to-builder",
    label: "Code to Architecture",
    icon: FiCode,
  },
  {
    id: "terraform-view",
    href: "/terraform-view",
    label: "Terraform Studio & Sandbox",
    icon: FiTerminal,
  },
  {
    id: "devops",
    href: "/devops",
    label: "Google Cloud Deploy & Migration",
    icon: FiCloud,
  },
  {
    id: "commits",
    href: "/commits",
    label: "Git Commits & Rollback Ledger",
    icon: FiGitCommit,
  },
];

export function NavigationDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isItemActive = (item: DockItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  // Determine current active navigation set based on auth state
  const activeNavItems = !user
    ? PUBLIC_NAV_ITEMS
    : AUTHENTICATED_NAV_ITEMS;

  return (
    <aside
      aria-label="Global Navigation Dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
    >
      <motion.nav
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        aria-label="Quick Navigation"
        className="flex items-center gap-1.5 md:gap-2 rounded-full border border-white/20 bg-zinc-950/90 px-3 py-1.5 md:px-4 md:py-2 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {activeNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
              >
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "group relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                    active
                      ? "bg-white text-zinc-950 shadow-[0_0_18px_rgba(255,255,255,0.35)] scale-105 font-bold"
                      : "text-zinc-300 hover:text-white hover:bg-white/15 hover:scale-105",
                  )}
                >
                  <Icon className="w-4.5 h-4.5 md:w-5 md:h-5 transition-transform duration-200 group-hover:scale-105" />

                  {/* Floating Tooltip */}
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-zinc-900 border border-white/15 text-white text-[11px] font-medium rounded-md shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap scale-95 group-hover:scale-100 z-50">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* User Account Dropdown (only visible when user is logged in) */}
        {user && (
          <>
            {/* Vertical divider */}
            <div className="w-px h-5 bg-white/20 mx-0.5" />

            <DropdownMenu>
              <DropdownMenuTrigger
                title="Account & Profile"
                className="group relative flex items-center justify-center p-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
              >
                <Avatar
                  className={cn(
                    "w-10 h-10 md:w-11 md:h-11 border-2 transition-all duration-200 group-hover:scale-105",
                    pathname.startsWith("/profile")
                      ? "border-white ring-2 ring-white/50"
                      : "border-white/20 hover:border-white/70",
                  )}
                >
                  <AvatarImage
                    src={profile?.photoURL || user.photoURL || ""}
                    alt={profile?.displayName || user.displayName || "User"}
                  />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs md:text-sm">
                    {(profile?.displayName || user.displayName || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Floating Tooltip */}
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-zinc-900 border border-white/15 text-white text-[11px] font-medium rounded-md shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap scale-95 group-hover:scale-100 z-50">
                  {profile?.displayName || user.displayName || "Account"}
                </span>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={14}
                className="w-64 bg-zinc-950/95 border-white/15 text-white shadow-2xl backdrop-blur-xl p-2 rounded-2xl"
              >
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-zinc-100">
                      {profile?.displayName || user.displayName}
                    </p>
                    <p className="text-xs leading-none text-zinc-400 font-mono truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  asChild
                  className="focus:bg-white/10 focus:text-white cursor-pointer px-3 py-2 rounded-lg"
                >
                  <Link href="/profile" className="flex items-center gap-3">
                    <FiUser className="w-4.5 h-4.5 text-zinc-300" />
                    <span className="text-sm">Developer Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                  className="focus:bg-white/10 focus:text-white cursor-pointer px-3 py-2 rounded-lg"
                >
                  <Link href="/ai-builder" className="flex items-center gap-3">
                    <FiCpu className="w-4.5 h-4.5 text-cyan-400" />
                    <span className="text-sm">AI Architecture Canvas</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  asChild
                  className="focus:bg-white/10 focus:text-white cursor-pointer px-3 py-2 rounded-lg"
                >
                  <Link href="/code-to-builder" className="flex items-center gap-3">
                    <FiCode className="w-4.5 h-4.5 text-emerald-400" />
                    <span className="text-sm">Code to Visual Canvas</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="focus:bg-red-500/15 focus:text-red-400 text-red-400 cursor-pointer px-3 py-2 rounded-lg flex items-center gap-3"
                >
                  <FiLogOut className="w-4.5 h-4.5 text-red-400" />
                  <span className="text-sm font-medium">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </motion.nav>
    </aside>
  );
}
