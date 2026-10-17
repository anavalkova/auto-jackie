import type { ReactNode } from "react";
import { Check, Globe2, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGS, setLang, useT } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export function MobileHeaderMenu({ children, email, onSignIn, onSignOut }: { children: ReactNode; email: string | undefined; onSignIn: () => void; onSignOut: () => void }) {
  const { lang } = useT();
  const label = { en: "Menu", sv: "Meny", de: "Menü" }[lang];
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="mobile-header-trigger" aria-label={label} title={label}><Menu/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="mobile-header-menu">
      {children}
      <DropdownMenuSeparator/>
      {email ? <><DropdownMenuLabel className="account-email">{email}</DropdownMenuLabel><DropdownMenuItem onSelect={onSignOut}><LogOut/>{tr("Sign out")}</DropdownMenuItem></> : <DropdownMenuItem onSelect={onSignIn}><UserRound/>{tr("Sign in")}</DropdownMenuItem>}
      <DropdownMenuSeparator/>
      <DropdownMenuLabel className="flex items-center gap-2"><Globe2 className="size-4"/>{tr("Language")}</DropdownMenuLabel>
      {LANGS.map(l => <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} aria-current={l.code === lang ? "true" : undefined}><span className="min-w-0 flex-1">{l.label}</span>{l.code === lang && <Check/>}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}